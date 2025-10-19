# 🧩 IApp Mocks

This document describes mock payloads for interacting with the **IApp** interface — covering `Deposit`, `Swap`, and `Withdraw` operations.

---

## 💰 Deposit

| Field           | Type               | Description                                               |
| --------------- | ------------------ | --------------------------------------------------------- |
| `vault_address` | `string`           | Address of the vault contract handling deposits.          |
| `deposit_tx`    | `object / tx hash` | Transaction data or hash representing the deposit action. |

**Example:**

```json
{
  "vault_address": "0xVaultDepositAddress",
  "deposit_tx": "0xDepositTransactionHash"
}
```

---

## 🔄 Swap

| Field           | Type     | Description                                                               |
| --------------- | -------- | ------------------------------------------------------------------------- |
| `vault_address` | `string` | Address of the vault executing the swap.                                  |
| `Data`          | `object` | Main swap payload containing details of tokens, amounts, and commitments. |

### Data Structure

| Field             | Type      | Description                                                    |
| ----------------- | --------- | -------------------------------------------------------------- |
| `commitments`     | `array`   | List of commitment objects defining swap inputs.               |
| `tokenIn`         | `address` | Address of the token being swapped **from**.                   |
| `tokenOut`        | `address` | Address of the token being swapped **to**.                     |
| `tokenAmountIn`   | `uint256` | Amount of `tokenIn` to be swapped (in wei).                    |
| `minimumTokenOut` | `uint256` | Minimum acceptable amount of `tokenOut` (slippage protection). |
| `ownerhash`       | `bytes32` | Hashed owner identifier for privacy or authentication.         |

### Commitment Object

| Field       | Type      | Description                                        |
| ----------- | --------- | -------------------------------------------------- |
| `amount`    | `uint256` | Committed token amount (in wei).                   |
| `token`     | `address` | Address of the committed token.                    |
| `ownerhash` | `bytes32` | Hashed owner identifier linked to this commitment. |

> **Commitment Scheme:**
> Each commitment is computed as:
> `H(tokenAmount, token, H(userPrivate))`
> where `H` is a cryptographic hash function, `tokenAmount` is the amount being committed, `token` is the token address, and `userPrivate` is the user’s secret key.

**Example:**

```json
{
  "vault_address": "0xVaultSwapAddress",
  "Data": {
    "commitments": [
      {
        "amount": 100000000000000000000,
        "token": "0x108E8CaD9d3775E27584359a697093bbB53C23E3",
        "ownerhash": "0x63e2d5915e06ecad00a7e6c33ebb95356872e5f7d20e08626b2e5081d203baad"
      }
    ],
    "tokenIn": "0x108E8CaD9d3775E27584359a697093bbB53C23E3",
    "tokenOut": "0x30dd0C0204607C1E728b37F46e5D4E187b631a4B",
    "tokenAmountIn": 100000000000000000,
    "minimumTokenOut": 300000000000000000000,
    "ownerhash": "0x63e2d5915e06ecad00a7e6c33ebb95356872e5f7d20e08626b2e5081d203baad"
  }
}
```

---

## 🏧 Withdraw

| Field           | Type               | Description                                           |
| --------------- | ------------------ | ----------------------------------------------------- |
| `vault_address` | `string`           | Address of the vault holding the funds to withdraw.   |
| `withdraw_tx`   | `object / tx hash` | Transaction data or hash representing the withdrawal. |

**Example:**

```json
{
  "vault_address": "0xVaultWithdrawAddress",
  "withdraw_tx": "0xWithdrawTransactionHash"
}
```
