import { ethers } from "ethers";
import { Redis } from "@upstash/redis";
import "dotenv/config";
import { getVault } from "./utils/getVault.js";

/**

* Verify a withdraw transaction on-chain via logs
* @param redis - Upstash Redis instance
* @param provider - ethers provider (e.g., JsonRpcProvider)
* @param vault - deployed ExecSwap contract instance
* @param txHash - transaction hash of the withdrawal
  */
export async function withdraw(redis, provider, vault, txHash) {
  console.log("🔍 Verifying withdraw transaction:", txHash);

  // --- 1. Fetch transaction receipt ---
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt)
    throw new Error("Transaction not found. Check the hash or network.");

  // --- 2. Parse logs to find the Withdraw event ---
  let withdrawEvent = null;
  for (const log of receipt.logs) {
    try {
      const parsed = vault.interface.parseLog(log);
      if (parsed && parsed.name === "Withdraw") {
        withdrawEvent = parsed;
        break; // assume one Withdraw event per tx
      }
    } catch {
      // ignore unrelated logs
    }
  }

  if (!withdrawEvent) {
    throw new Error("No Withdraw event found in the transaction logs.");
  }

  const { to, token, amount } = withdrawEvent.args;
  const processedKey = `processed:${txHash}`;

  // ensure each tx is processed only once
  try {
    const already = await redis.get(processedKey);
    if (already) {
      console.log(`⏭️ Transaction ${txHash} already processed — skipping.`);
      return;
    }
  } catch (err) {
    throw new Error("Redis dedupe check failed, continuing:", err);
  }

  console.log("✅ Withdraw verified:");
  console.log("   • To:              ", to);
  console.log("   • Token:           ", token);

  // --- 3. Decode amount for readability ---
  let formattedAmount = amount.toString();
  try {
    const erc20 = [
      "function decimals() view returns (uint8)",
      "function symbol() view returns (string)",
    ];
    const tokenC = new ethers.Contract(token, erc20, provider);
    const decimals = await tokenC.decimals();
    const symbol = await tokenC.symbol().catch(() => null);
    formattedAmount = ethers.formatUnits(amount, decimals);
    if (symbol) formattedAmount = `${formattedAmount} ${symbol}`;
  } catch {
    // leave as raw value
  }

  console.log("   • Formatted Amount:", formattedAmount);

  // --- 4. Update Redis balances (subtract withdrawn amount) ---
  const existing = await redis.get(token);
  if (existing === null) {
    console.warn("⚠️ No existing token balance in Redis; initializing to 0.");
    throw new Error("Cannot withdraw from zero balance");
  }

  if (BigInt(existing) < amount)
    throw new Error(
      `Redis balance underflow: trying to withdraw ${amount}, but only ${existing} available`
    );

  // optionally store a record of commitments used
  await redis.set(processedKey, "1");

  const newBalance = BigInt(existing) - amount;
  await redis.set(token, newBalance.toString());

  console.log(
    `✅ Updated Redis balance: ${newBalance.toString()} remaining for ${token}.`
  );

  return true;
}

// Example usage (uncomment to test):
// const redis = new Redis({
//   url: process.env.REDIS_URL,
//   token: process.env.REDIS_TOKEN,
// });
// const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
// const user = new ethers.Wallet(process.env.USER_PRIVATE_KEY, provider);
// const vault = getVault(process.env.VAULT_ADDRESS, provider).connect(user);

// const withdrawTx = await vault.withdraw(
//   [100000000000000000000n], // amounts
//   "0x167742649592dEB298Af317b1aEd97D9dADD02a5", // token address
//   [ethers.keccak256(ethers.toUtf8Bytes("userPublicKey"))], // ownerhashes
//   ethers.toUtf8Bytes("userPublicKey"), // private key
//   "0x2A738Fe17d38c94Ec96b0c79d6Eef4EC48452e4F" // to
// );
// await withdrawTx.wait();
// const txHash = withdrawTx.hash;
// console.log(txHash);

// withdraw(
//   redis,
//   provider,
//   vault,
//   "0x5c22a416cda6d1d4e8378c2685234beb06ce2562479533e3a1f535ff7552ad22"
// );
