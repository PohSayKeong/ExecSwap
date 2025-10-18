import { ethers } from "ethers";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { Redis } from "@upstash/redis";
import "dotenv/config";

/**
 * Verify a deposit transaction on-chain via logs
 * @param provider - ethers provider (e.g., JsonRpcProvider)
 * @param vaultAddress - deployed CommitmentVault contract address
 * @param txHash - transaction hash of the deposit
 */
export async function deposit(redis, provider, vaultAddress, txHash) {
  console.log("🔍 Verifying deposit transaction:", txHash);

  // --- 1. Load ABI dynamically from JSON file ---
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const abiPath = path.join(__dirname, "./abi/ExecSwap.json");
  const contractJson = JSON.parse(fs.readFileSync(abiPath, "utf8"));
  const abi = contractJson.abi;

  // --- 2. Connect to the contract instance ---
  const vault = new ethers.Contract(vaultAddress, abi, provider);

  // --- 3. Fetch transaction receipt ---
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt)
    throw new Error("Transaction not found. Check the hash or network.");

  // --- 4. Parse logs and find the first Deposit event ---
  let depositEvent = null;
  for (const log of receipt.logs) {
    try {
      const parsed = vault.interface.parseLog(log);
      if (parsed && parsed.name === "Deposit") {
        depositEvent = parsed;
        break; // only one deposit event expected
      }
    } catch {
      // ignore non-matching logs
    }
  }

  if (!depositEvent) {
    throw new Error("No Deposit event found in the transaction logs.");
  }

  const { from, token, amount, ownerhash, commitmentHash } = depositEvent.args;
  // ensure each commitment is processed only once
  try {
    const processedKey = `processed:${commitmentHash}`;
    const already = await redis.get(processedKey);
    if (already) {
      console.log(
        `⏭️ Commitment ${commitmentHash} already processed — skipping.`
      );
      return;
    }
    // mark as processed; set a TTL of 30 days (optional)
    await redis.set(processedKey, "1");
  } catch (err) {
    throw new Error("Redis dedupe check failed, continuing:", err);
  }

  console.log("✅ Deposit verified:");
  console.log("   • From:        ", from);
  console.log("   • Token:       ", token);
  // simple: use a minimal ERC20 ABI and format amount if possible
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
    // leave formattedAmount as the raw value
  }
  console.log("   • Amount:      ", formattedAmount);
  console.log("   • Owner Hash:  ", ownerhash);
  console.log("   • Commitment:  ", commitmentHash);

  // --- 6. Store deposit info in Upstash Redis ---
  try {
    const key = token.toLowerCase();
    const existing = await redis.get(key);
    if (existing === null) {
      await redis.set(key, parseInt(formattedAmount));
    } else {
      await redis.incrby(key, parseInt(formattedAmount));
    }
    console.log("✅ Deposit info stored in Upstash Redis.");
  } catch (err) {
    throw new Error("Failed to store deposit info in Upstash Redis:", err);
  }

  return true;
}

// Example usage (uncomment to run):
// const redis = new Redis({
//   url: process.env.REDIS_URL,
//   token: process.env.REDIS_TOKEN,
// });
// const provider = new ethers.JsonRpcProvider(process.env.JSON_RPC_URL);
// const vaultAddress = process.env.VAULT_ADDRESS;
// const txHash = process.env.DEPOSIT_TX;
// deposit(redis, provider, vaultAddress, txHash);
