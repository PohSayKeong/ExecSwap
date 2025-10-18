import fs from "node:fs/promises";
import { IExecDataProtectorDeserializer } from "@iexec/dataprotector-deserializer";
import { ethers } from "ethers";
import { Redis } from "@upstash/redis";
import { deposit } from "./deposit.js";
import { getVault } from "./utils/getVault.js";
import { swap } from "./swap.js";
import { withdraw } from "./withdraw.js";

const main = async () => {
  const { IEXEC_OUT, IEXEC_APP_DEVELOPER_SECRET } = process.env;
  const secrets = JSON.parse(IEXEC_APP_DEVELOPER_SECRET || "{}");

  let computedJsonObj = {};

  try {
    let messages = [];

    // Access args from command line
    const args = process.argv.slice(2); // Skip node and script name
    // Example: iapp run myapp --args "mode=swap"
    const action = args[0];

    const deserializer = new IExecDataProtectorDeserializer();
    const provider = new ethers.JsonRpcProvider(secrets.JSON_RPC_URL);
    const signer = new ethers.Wallet(secrets.PRIVATE_KEY, provider);
    const redis = new Redis({
      url: secrets.REDIS_URL,
      token: secrets.REDIS_TOKEN,
    });

    // --- Load vault (contract instance) ---
    const vaultAddress = await deserializer.getValue("vault_address", "string");
    const vault = getVault(vaultAddress, provider).connect(signer);

    if (action === "deposit") {
      console.log("Function type: deposit");

      const depositTx = await deserializer.getValue("deposit_tx", "string");
      console.log("Deposit Tx:", depositTx);

      const depositResult = await deposit(redis, provider, vault, depositTx);

      if (depositResult) {
        messages.push("Deposit processed successfully");
      } else {
        throw new Error("Deposit processing failed");
      }
    } else if (action === "swap") {
      console.log("Function type: swap");

      const data = await deserializer.getValue("data", "file");
      const decoder = new TextDecoder();
      const decodedString = decoder.decode(data);
      const {
        commitments,
        tokenIn,
        tokenOut,
        tokenAmountIn,
        minimumTokenOut,
        ownerhash,
      } = JSON.parse(decodedString);

      const swapResults = await swap(
        redis,
        vault,
        commitments,
        tokenIn,
        tokenOut,
        tokenAmountIn,
        minimumTokenOut,
        ownerhash
      );

      if (!swapResults) {
        throw new Error("Swap processing failed");
      }

      for (const { commitment, tokenOutAmount, token } of swapResults) {
        messages.push(`${commitment},${tokenOutAmount},${token}\n`);
      }
    } else if (action === "withdraw") {
      console.log("Function type: withdraw");

      const withdrawTx = await deserializer.getValue("withdraw_tx", "string");
      console.log("Withdraw Tx:", withdrawTx);

      const withdrawResult = await withdraw(redis, provider, vault, withdrawTx);

      if (withdrawResult) {
        messages.push("Withdraw processed successfully");
      } else {
        throw new Error("Withdraw processing failed");
      }
    }

    // Write result to IEXEC_OUT
    await fs.writeFile(`${IEXEC_OUT}/result.txt`, messages.join(","));

    // Build the "computed.json" object
    computedJsonObj = {
      "deterministic-output-path": `${IEXEC_OUT}/result.txt`,
    };
  } catch (e) {
    // Handle errors
    console.log(e);

    // Build the "computed.json" object with an error message
    computedJsonObj = {
      "deterministic-output-path": IEXEC_OUT,
      "error-message": e.message,
    };
  } finally {
    // Save the "computed.json" file
    await fs.writeFile(
      `${IEXEC_OUT}/computed.json`,
      JSON.stringify(computedJsonObj)
    );
  }
};

main();
