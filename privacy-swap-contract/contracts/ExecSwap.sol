// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ExecSwap - Commitment-based ERC20 vault
 * @notice
 *  - Accepts ERC20 deposits that are stored as commitments on-chain.
 *  - A commitment is: commitment = keccak256(abi.encodePacked(amount, token, ownerhash))
 *  - Anyone can deposit an ERC20 by providing the amount and ownerhash (ownerhash = keccak256(ownerPk)).
 *  - The contract owner can also submit raw commitment hashes on-chain (submitCommitment).
 *  - Withdraw: user provides a series of revealed commitments (amounts + token + ownerhashes) and the owner public key (ownerPk).
 *    The contract checks ownerhash == keccak256(ownerPk) and that each commitment exists and is unspent. It sums amounts (for a single token)
 *    and transfers that ERC20 amount to the provided destination address.
 *
 * Security notes (short):
 *  - Commitments are single-use (marked as spent when withdrawn).
 *  - Simple nonReentrant guard is included.
 *  - This implementation expects ownerPk to be the raw bytes that were hashed to produce ownerhash (i.e. keccak256(ownerPk) == ownerhash).
 */

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ExecSwap is Ownable {
    constructor() Ownable(msg.sender) {}

    // commitment = keccak256(abi.encodePacked(amount, token, ownerhash))

    mapping(bytes32 => bool) public commitments; // stored commitment existence
    mapping(bytes32 => bool) public spent; // prevent double-withdraw

    // reentrancy guard
    uint256 private _locked = 1;
    modifier nonReentrant() {
        require(_locked == 1, "ReentrancyGuard: reentrant call");
        _locked = 2;
        _;
        _locked = 1;
    }

    event Deposit(
        address indexed from,
        address indexed token,
        uint256 amount,
        bytes32 ownerhash,
        bytes32 commitmentHash
    );
    event CommitmentsUpdated(bytes32[] added, bytes32[] removed);
    event Withdraw(
        address indexed to,
        address indexed token,
        uint256 amount,
        bytes32 ownerhash
    );

    /// @notice Deposit tokens and record the commitment hash on-chain
    /// @param token ERC20 token address
    /// @param amount amount to deposit (must be approved beforehand)
    /// @param ownerhash keccak256(ownerPk) - user-supplied hash of their public key
    function depositAndCommit(
        address token,
        uint256 amount,
        bytes32 ownerhash
    ) external nonReentrant {
        require(amount > 0, "amount=0");
        require(token != address(0), "token=0");

        // transfer tokens into contract (user must have approved first)
        bool ok = IERC20(token).transferFrom(msg.sender, address(this), amount);
        require(ok, "transferFrom failed");

        bytes32 commitment = keccak256(
            abi.encodePacked(amount, token, ownerhash)
        );
        require(!commitments[commitment], "commitment exists");

        commitments[commitment] = true;

        emit Deposit(msg.sender, token, amount, ownerhash, commitment);
    }

    /// @notice Owner can submit new commitments and nullify existing ones by providing owner secrets
    /// @param newCommitments array of commitments to add
    /// @param nullifyCommitments array of commitments to remove
    function updateCommitment(
        bytes32[] calldata newCommitments,
        bytes32[] calldata nullifyCommitments
    ) external onlyOwner {
        for (uint256 i = 0; i < newCommitments.length; i++) {
            bytes32 c = newCommitments[i];
            require(c != bytes32(0), "empty add");
            require(!commitments[c], "already active");
            commitments[c] = true;
        }

        for (uint256 i = 0; i < nullifyCommitments.length; i++) {
            require(commitments[nullifyCommitments[i]], "commitment not found");
            commitments[nullifyCommitments[i]] = false;
        }

        emit CommitmentsUpdated(newCommitments, nullifyCommitments);
    }

    /// @notice Withdraw a series of revealed commitments that belong to the same owner (same ownerPk).
    /// @dev All commitment entries must reference the same token address. This function sums the amounts and transfers the total.
    /// @param amounts the amounts for each commitment (same order as ownerhashes)
    /// @param token the ERC20 token address (all commitments must use this token)
    /// @param ownerhashes array of ownerhash values included in the commitments (each should equal keccak256(ownerPk))
    /// @param ownerPk the public key bytes whose keccak256 should equal the ownerhash
    /// @param to destination address for the withdrawn tokens
    function withdraw(
        uint256[] calldata amounts,
        address token,
        bytes32[] calldata ownerhashes,
        bytes calldata ownerPk,
        address to
    ) external nonReentrant {
        require(amounts.length == ownerhashes.length, "length mismatch");
        require(amounts.length > 0, "no commitments");
        require(token != address(0), "token=0");
        require(to != address(0), "to=0");

        // compute ownerhash from provided public key bytes
        bytes32 derivedOwnerHash = keccak256(ownerPk);

        uint256 total = 0;

        for (uint256 i = 0; i < amounts.length; i++) {
            uint256 amt = amounts[i];
            bytes32 oh = ownerhashes[i];

            require(amt > 0, "amount=0");
            require(oh == derivedOwnerHash, "ownerhash mismatch");

            bytes32 commitment = keccak256(abi.encodePacked(amt, token, oh));
            require(commitments[commitment], "commitment not found");
            require(!spent[commitment], "commitment spent");

            // mark spent immediately to avoid re-use
            spent[commitment] = true;

            total += amt;
        }

        require(total > 0, "total=0");

        // final transfer
        bool sent = IERC20(token).transfer(to, total);
        require(sent, "transfer failed");

        emit Withdraw(to, token, total, derivedOwnerHash);
    }

    // --- view helpers ---
    function commitmentOf(
        uint256 amount,
        address token,
        bytes32 ownerhash
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(amount, token, ownerhash));
    }

    function isCommitmentStored(
        bytes32 commitment
    ) external view returns (bool) {
        return commitments[commitment];
    }

    function isCommitmentSpent(
        bytes32 commitment
    ) external view returns (bool) {
        return spent[commitment];
    }
}
