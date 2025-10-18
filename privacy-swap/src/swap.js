import { ethers } from "ethers";
import { Redis } from "@upstash/redis";
import "dotenv/config";
import { verifyCommitments } from "./verifyCommitments.js";
import { getVault } from "./utils/getVault.js";
import { bigIntToString } from "./utils/bigIntToString.js";

/**
 * Batch swap multiple commitments.
 *
 * Each entry should be:
 * {
 *   amount: BigNumberish,
 *   token: string,
 *   ownerhash: string,
 * }
 *
 * @param redis         Upstash Redis instance
 * @param vault        ExecSwap contract instance
 * @param commitments   Array of commitment objects as described above
 * @param tokenIn       Address of input token
 * @param tokenOut      Address of output token
 * @param tokenAmountIn Total amount of input tokens
 * @param minimumTokenOut Minimum acceptable amount of output tokens
 * @returns {Promise<Array>} Array of objects { commitment, tokenOutAmount }
 */
export async function swap(
  redis,
  vault,
  commitments,
  tokenIn,
  tokenOut,
  tokenAmountIn,
  minimumTokenOut,
  ownerhash
) {
  console.log("💱 Starting swap for commitments:", commitments);

  // --- 1. Verify commitments ---
  const { tokenAmountInActual, hashedCommitments } = await verifyCommitments(
    vault,
    commitments,
    tokenIn
  );
  console.log(
    `🔍 Total input token amount verified: ${bigIntToString(
      tokenAmountInActual
    )}`
  );

  if (tokenAmountInActual < tokenAmountIn)
    throw new Error("Insufficient total commitment amount for swap");

  // --- 2. Fetch latest ETH price (example via Chainlink feed) ---
  const PRICE_FEED_ADDRESS = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
  const feedAbi = [
    {
      inputs: [],
      name: "latestAnswer",
      outputs: [{ internalType: "int256", name: "", type: "int256" }],
      stateMutability: "view",
      type: "function",
    },
  ];
  const feed = new ethers.Contract(
    PRICE_FEED_ADDRESS,
    feedAbi,
    new ethers.JsonRpcProvider("https://eth.llamarpc.com")
  );
  const ethPriceRaw = await feed.latestAnswer();
  const ethPrice = Number(ethPriceRaw) / 1e8; // Chainlink price usually 8 decimals
  console.log(`💲 Latest ETH price: $${ethPrice}`);

  // --- 3. calculate total expected token out and change ---
  // TODO: determine direction, only single direction for now
  const totalTokenOut = tokenAmountIn * ethPrice;

  console.log(`💰 Total expected token out: ${bigIntToString(totalTokenOut)}`);

  console.log(totalTokenOut, minimumTokenOut);
  if (totalTokenOut < minimumTokenOut)
    throw new Error("Swap would yield less than minimumTokenOut");

  const change = tokenAmountInActual - tokenAmountIn;
  console.log(
    `💵 User will receive approx: ${bigIntToString(change)} tokens in change.`
  );

  // --- 4. Create new commitments ---
  const tokenOutCommitment = ethers.keccak256(
    ethers.solidityPacked(
      ["uint256", "address", "bytes32"],
      [ethers.toBigInt(totalTokenOut.toString()), tokenOut, ownerhash]
    )
  );

  const changeCommitment = ethers.keccak256(
    ethers.solidityPacked(
      ["uint256", "address", "bytes32"],
      [ethers.toBigInt(change.toString()), tokenIn, ownerhash]
    )
  );

  // --- 5. Submit the commitments on-chain ---
  const tx = await vault.updateCommitment(
    [tokenOutCommitment, changeCommitment],
    hashedCommitments
  );
  console.log("⏳ Submitting commitments on-chain, tx hash:", tx.hash);
  await tx.wait();
  console.log(`✅ New commitments submitted on-chain.`);

  // --- 6. Store swap info in Redis ---

  try {
    const tokenInValue = await redis.get(tokenIn);
    const tokenOutValue = await redis.get(tokenOut);
    if (tokenIn === null || tokenOut === null) {
      throw new Error("Token balances not found in Redis");
    }

    await redis.set(
      tokenIn,
      (BigInt(tokenInValue) - BigInt(tokenAmountIn)).toString()
    );
    await redis.set(
      tokenOut,
      (BigInt(tokenOutValue) + BigInt(totalTokenOut)).toString()
    );
    console.log("✅ Swap info stored in Redis.");
  } catch (err) {
    console.error("❌ Failed to store swap info in Redis:", err);
  }

  return [
    {
      commitment: tokenOutCommitment,
      tokenOutAmount: totalTokenOut,
      token: tokenOut,
    },
    { commitment: changeCommitment, tokenOutAmount: change, token: tokenIn },
  ];
}

// Example usage (uncomment to run):
// const redis = new Redis({
//   url: process.env.REDIS_URL,
//   token: process.env.REDIS_TOKEN,
// });
// const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
// const signer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
// const vaultAddress = process.env.VAULT_ADDRESS;
// const vault = getVault(vaultAddress, signer).connect(signer);
// const tokenIn = process.env.TOKEN_IN_ADDRESS;
// const tokenOut = process.env.TOKEN_OUT_ADDRESS;
// const tokenAmountIn = 100000000000000000;
// const minimumTokenOut = 300000000000000000000;
// const ownerHash = ethers.keccak256(ethers.toUtf8Bytes("userPublicKey"));
// swap(
//   redis,
//   vault,
//   [
//     {
//       amount: 100000000000000000000,
//       token: tokenIn,
//       ownerHash,
//     },
//   ],
//   tokenIn,
//   tokenOut,
//   tokenAmountIn,
//   minimumTokenOut,
//   ownerHash
// );
