import fs from "node:fs/promises";
import { IExecDataProtectorDeserializer } from "@iexec/dataprotector-deserializer";
import { ethers } from "ethers";
import { Redis } from "@upstash/redis";
import { deposit } from "./deposit.js";

const main = async () => {
  const { IEXEC_OUT, IEXEC_APP_DEVELOPER_SECRET } = process.env;
  const secrets = JSON.parse(IEXEC_APP_DEVELOPER_SECRET || "{}");

  let computedJsonObj = {};

  try {
    let messages = [];

    const deserializer = new IExecDataProtectorDeserializer();
    const functionType = await deserializer.getValue("function_type", "string");
    const provider = new ethers.JsonRpcProvider(secrets.JSON_RPC_URL);
    const redis = new Redis({
      url: secrets.REDIS_URL,
      token: secrets.REDIS_TOKEN,
    });

    if (functionType === "deposit") {
      console.log("Function type: deposit");

      const vaultAddress = await deserializer.getValue(
        "vault_address",
        "string"
      );
      console.log("Vault Address:", vaultAddress);

      const depositTx = await deserializer.getValue("deposit_tx", "string");
      console.log("Deposit Tx:", depositTx);

      const depositResult = await deposit(
        redis,
        provider,
        vaultAddress,
        depositTx
      );

      if (depositResult) {
        messages.push("Deposit processed successfully");
      } else {
        throw new Error("Deposit processing failed");
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
