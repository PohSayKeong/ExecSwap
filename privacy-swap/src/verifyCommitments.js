import { ethers } from "ethers";
import "dotenv/config";

/**
 * Verify multiple commitments on-chain — fails immediately on first invalid commitment.
 *
 * @param provider       ethers provider
 * @param vaultAddress   CommitmentVault address
 * @param commitments    array of { amount, token, ownerHash }
 * @returns {Promise<void>} resolves if all commitments are valid, throws on first failure
 */
export async function verifyCommitments(vault, commitments, tokenIn) {
  console.log(`🔍 Verifying ${commitments.length} commitments...`);
  let tokenInAmount = 0;
  const hashedCommitments = [];

  // Loop through each commitment
  for (const entry of commitments) {
    const { amount, token, ownerhash } = entry;
    // Compute ownerhash and expected commitment
    const amountBN = BigInt(amount);
    const commitment = ethers.keccak256(
      ethers.solidityPacked(
        ["uint256", "address", "bytes32"],
        [amountBN, token, ownerhash]
      )
    );

    console.log(`\n🔹 Checking commitment: ${commitment}`);

    // Check existence on-chain
    let exists = false;
    try {
      exists = await vault.isCommitmentStored(commitment);
    } catch (err) {
      throw new Error(`Error checking on-chain commitment: ${err.message}`);
    }

    if (!exists) {
      throw new Error(`❌ Commitment not found on-chain: ${commitment}`);
    }

    if (token.toLowerCase() !== tokenIn.toLowerCase()) {
      throw new Error(
        `❌ Token address mismatch for commitment ${commitment}!\nExpected: ${tokenIn}\nProvided: ${token}`
      );
    }

    console.log(`✅ Commitment verified successfully: ${commitment}`);
    tokenInAmount += amount;
    hashedCommitments.push(commitment);
  }

  console.log("\n🎉 All commitments verified successfully.");
  return { tokenAmountInActual: tokenInAmount, hashedCommitments };
}
