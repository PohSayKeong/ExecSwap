"use client";
import { useCallback } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import ExecSwapAbi from "@/abi/ExecSwap.json";
import { getErc20Contracts, VAULT, WETH } from "@/config/tokens";
import { Eip1193Provider } from "ethers";
import { useSwapUI } from "./useSwapUI";
import { useDataProtector } from "./useDataProtector";
import { grantAccessData } from "@/config/iAppConfig";

export function useDeposit(vaultAddress: string) {
  const { address, connector } = useAccount();
  const { setDepositOpen, getBalances, setTxState } = useSwapUI();
  const { dataProtectorCore } = useDataProtector();

  const getProviderAndSigner = useCallback(async () => {
    // prefer connector provider when available
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

  const getBalance = useCallback(
    async (tokenAddress: string) => {
      if (!address) return "0";
      try {
        const { provider } = await getProviderAndSigner();
        const { ercWeth, ercUsdc } = getErc20Contracts(provider);
        const erc20 =
          tokenAddress.toLowerCase() === WETH.toLowerCase() ? ercWeth : ercUsdc;
        const bal = await erc20.balanceOf(address);
        return ethers.formatUnits(bal, 18);
      } catch (err) {
        console.error("balanceOf failed", err);
        return "0";
      }
    },
    [address, getProviderAndSigner]
  );

  const checkAllowance = useCallback(
    async (tokenAddress: string) => {
      if (!address) return 0;
      try {
        const { provider } = await getProviderAndSigner();
        const { ercWeth, ercUsdc } = getErc20Contracts(provider);
        const erc20 =
          tokenAddress.toLowerCase() === WETH.toLowerCase() ? ercWeth : ercUsdc;
        const allowance = await erc20.allowance(address, vaultAddress);
        return allowance;
      } catch (err) {
        console.error("allowance failed", err);
        return 0;
      }
    },
    [address, vaultAddress, getProviderAndSigner]
  );

  const approveExact = useCallback(
    async (tokenAddress: string, amountUnits: ethers.BigNumberish) => {
      const ps = await getProviderAndSigner();
      const signer = ps.signer;
      setTxState({ status: "approving" });
      console.log("Approving", tokenAddress, amountUnits.toString());
      const { ercWeth, ercUsdc } = getErc20Contracts(signer);
      const erc20 =
        tokenAddress.toLowerCase() === WETH.toLowerCase() ? ercWeth : ercUsdc;
      try {
        const tx = await erc20.approve(vaultAddress, amountUnits);
        setTxState({ status: "awaitingApproval", txHash: tx.hash });
        await tx.wait();
        setTxState({ status: "idle" });
        return tx;
      } catch (err) {
        setTxState({
          status: "failed",
          error: (err as Error)?.message ?? String(err),
        });
        throw err;
      }
    },
    [vaultAddress, getProviderAndSigner, setTxState]
  );

  const deposit = useCallback(
    async (tokenAddress: string, amountUnits: ethers.BigNumberish) => {
      const ps = await getProviderAndSigner();
      const signer = ps.signer;
      const vault = new ethers.Contract(
        vaultAddress,
        ExecSwapAbi.abi || ExecSwapAbi,
        signer
      );
      try {
        setTxState({ status: "depositing" });
        const tx = await vault.depositAndCommit(
          tokenAddress,
          amountUnits,
          ethers.keccak256(ethers.toUtf8Bytes("userPublicKey"))
        );
        setTxState({ status: "pending", txHash: tx.hash });
        const receipt = await tx.wait();
        setTxState({ status: "confirmed", txHash: tx.hash });
        const commitment = {
          token: tokenAddress,
          amount: amountUnits.toString(),
          ownerhash: ethers.keccak256(ethers.toUtf8Bytes("userPublicKey")),
        };
        // Save commitment to local storage
        const commitments = JSON.parse(
          localStorage.getItem("commitments") || "[]"
        );
        commitments.push(commitment);
        localStorage.setItem("commitments", JSON.stringify(commitments));

        if (!dataProtectorCore) {
          throw new Error("DataProtectorCore is not initialized");
        }

        setTxState({ status: "protecting data", txHash: tx.hash });
        const { address: protectedData } = await dataProtectorCore.protectData({
          data: {
            vault_address: VAULT,
            deposit_tx: tx.hash,
          },
        });

        setTxState({ status: "granting access", txHash: tx.hash });
        await dataProtectorCore.grantAccess({
          protectedData,
          ...grantAccessData,
        });
        setTxState({ status: protectedData });

        setDepositOpen(false);
        getBalances();
        return receipt;
      } catch (err) {
        setTxState({
          status: "failed",
          error: (err as Error)?.message ?? String(err),
        });
        throw err;
      }
    },
    [
      getProviderAndSigner,
      vaultAddress,
      dataProtectorCore,
      setDepositOpen,
      getBalances,
      setTxState,
    ]
  );

  const reset = () => setTxState({ status: "idle" });

  return {
    getBalance,
    checkAllowance,
    approveExact,
    deposit,
    reset,
  };
}
