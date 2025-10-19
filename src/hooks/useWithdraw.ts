"use client";
import { useCallback } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import ExecSwapAbi from "@/abi/ExecSwap.json";
import { Eip1193Provider } from "ethers";
import { useSwapUI } from "./useSwapUI";
import { useDataProtector } from "./useDataProtector";
import { VAULT } from "@/config/tokens";
import { grantAccessData } from "@/config/iAppConfig";

export function useWithdraw(vaultAddress: string) {
  const { address, connector } = useAccount();
  const { setWithdrawOpen, getBalances, setTxState } = useSwapUI();
  const { dataProtectorCore } = useDataProtector();

  const getProviderAndSigner = useCallback(async () => {
    try {
      if (connector) {
        const rawProvider = await connector.getProvider();
        const web3Provider = new ethers.BrowserProvider(
          rawProvider as Eip1193Provider
        );
        const signer = await web3Provider.getSigner();
        return { provider: web3Provider, signer };
      }
    } catch (e) {
      console.warn(
        "connector.getProvider failed, falling back to window.ethereum",
        e
      );
    }

    throw new Error("No provider available");
  }, [connector]);

  const collectCommitmentsForAmount = useCallback(
    (tokenAddress: string, amountUnits: bigint) => {
      const commitments = JSON.parse(
        localStorage.getItem("commitments") || "[]"
      );
      const filtered = commitments.filter(
        (c: any) => c.token.toLowerCase() === tokenAddress.toLowerCase()
      );

      // greedy selection: pick commitments until we reach requested amount
      const amounts: string[] = [];
      const ownerhashes: string[] = [];
      let sum = BigInt(0);

      for (const c of filtered) {
        const amt = BigInt(c.amount.toString());
        amounts.push(amt.toString());
        ownerhashes.push(c.ownerhash);
        sum += amt;
        if (sum >= amountUnits) break;
      }

      if (sum < amountUnits) {
        throw new Error(
          "Not enough committed balance to withdraw requested amount"
        );
      }

      return { amounts, ownerhashes, used: { amounts, ownerhashes } };
    },
    []
  );

  const withdraw = useCallback(
    async (
      tokenAddress: string,
      amountUnits: ethers.BigNumberish,
      to: string,
      options?: { amounts?: string[]; ownerhashes?: string[] }
    ) => {
      const ps = await getProviderAndSigner();
      const signer = ps.signer;
      const vault = new ethers.Contract(
        vaultAddress,
        ExecSwapAbi.abi || ExecSwapAbi,
        signer
      );

      try {
        setTxState({ status: "withdrawing" });

        const amountBig = BigInt(amountUnits.toString());

        // If caller supplied explicit commitments, use them. Otherwise collect greedily.
        let amounts: string[] = [];
        let ownerhashes: string[] = [];
        if (options?.amounts && options?.ownerhashes) {
          amounts = options.amounts.map((a) => BigInt(a).toString());
          ownerhashes = options.ownerhashes;
        } else {
          const collected = collectCommitmentsForAmount(
            tokenAddress,
            amountBig
          );
          amounts = collected.amounts;
          ownerhashes = collected.ownerhashes;
        }

        // owner public key bytes used when depositing (placeholder in deposit flow)
        const ownerPk = ethers.toUtf8Bytes("userPublicKey");

        const tx = await vault.withdraw(
          amounts,
          tokenAddress,
          ownerhashes,
          ownerPk,
          to
        );
        setTxState({ status: "pending", txHash: tx.hash });
        const receipt = await tx.wait();
        setTxState({ status: "confirmed", txHash: tx.hash });

        // remove used commitments from localStorage. We remove matching occurrences
        // for the exact amounts+ownerhashes provided/selected.
        const existing = JSON.parse(
          localStorage.getItem("commitments") || "[]"
        );
        const toRemove: Array<{ amount: string; ownerhash: string }> = [];
        for (let i = 0; i < ownerhashes.length; i++) {
          toRemove.push({
            amount: BigInt(amounts[i]).toString(),
            ownerhash: ownerhashes[i],
          });
        }
        const remaining = [...existing];
        for (const rem of toRemove) {
          const idx = remaining.findIndex(
            (c: any) =>
              c.ownerhash === rem.ownerhash &&
              BigInt(c.amount).toString() === BigInt(rem.amount).toString()
          );
          if (idx >= 0) remaining.splice(idx, 1);
        }
        localStorage.setItem("commitments", JSON.stringify(remaining));

        if (!dataProtectorCore) {
          throw new Error("DataProtectorCore is not initialized");
        }

        setTxState({ status: "protecting data", txHash: tx.hash });
        const { address: protectedData } = await dataProtectorCore.protectData({
          data: {
            vault_address: VAULT,
            withdraw_tx: tx.hash,
          },
        });

        setTxState({ status: "granting access", txHash: tx.hash });
        await dataProtectorCore.grantAccess({
          protectedData,
          ...grantAccessData,
        });
        setTxState({ status: protectedData });

        setWithdrawOpen(false);
        getBalances();

        return receipt;
      } catch (err) {
        setTxState({
          status: "Failed",
          error: (err as Error)?.message ?? String(err),
        });
        throw err;
      }
    },
    [
      collectCommitmentsForAmount,
      getProviderAndSigner,
      getBalances,
      setTxState,
      setWithdrawOpen,
      vaultAddress,
      dataProtectorCore,
    ]
  );

  const reset = () => setTxState({ status: "idle" });

  return { withdraw, reset, collectCommitmentsForAmount };
}
