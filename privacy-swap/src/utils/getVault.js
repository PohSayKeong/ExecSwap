import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { ethers } from "ethers";

/**
 * Load the vault contract (address read from deserializer) and return the contract instance
 * @param vaultAddress - address of deployed vault contract
 * @param provider - ethers provider
 * @returns { vault, abi }
 */
export function getVault(vaultAddress, provider) {
  console.log("Vault Address:", vaultAddress);

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const abiPath = path.join(__dirname, "../abi/ExecSwap.json");
  const contractJson = JSON.parse(fs.readFileSync(abiPath, "utf8"));
  const abi = contractJson.abi;

  const vault = new ethers.Contract(vaultAddress, abi, provider);
  return vault;
}
