"use client";
import React, {
  createContext,
  Dispatch,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { ethers } from "ethers";
import { useWalletClient } from "wagmi";
import { WETH, USDC, getErc20 } from "@/config/tokens";
import { Commitment } from "@/types/Commitment";

type TxState = { status: string; txHash?: string; error?: string };

type SwapContextType = {
  fromAmount: string;
  setFromAmount: (v: string) => void;
  estimatedOut: string | null;
  slippage: number;
  setSlippage: (n: number) => void;
  depositOpen: boolean;
  setDepositOpen: (b: boolean) => void;
  withdrawOpen: boolean;
  setWithdrawOpen: (b: boolean) => void;
  deposit: { token: string; amount: string };
  setDeposit: Dispatch<React.SetStateAction<{ token: string; amount: string }>>;
  withdraw: { token: string; commitment: string };
  setWithdraw: Dispatch<
    React.SetStateAction<{ token: string; commitment: string }>
  >;
  balances: {
    wallet: { WETH: string; USDC: string };
    contract: { WETH: string; USDC: string };
  };
  setBalances: (b: {
    wallet: { WETH: string; USDC: string };
    contract: { WETH: string; USDC: string };
  }) => void;
  txState: TxState;
  setTxState: (s: TxState) => void;
  triggerSwap: () => void;
  triggerDeposit: (txHash?: string) => void;
  triggerWithdraw: () => void;
  getBalances: () => Promise<{
    wallet: { WETH: string; USDC: string };
    contract: { WETH: string; USDC: string };
  }>;
};

const SwapContext = createContext<SwapContextType | undefined>(undefined);

export function SwapProvider({ children }: { children: React.ReactNode }) {
  const [fromAmount, setFromAmount] = useState("");
  const [estimatedOut, setEstimatedOut] = useState<string | null>(null);
  const [slippage, setSlippage] = useState<number>(0.5);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const [deposit, setDeposit] = useState({ token: "WETH", amount: "" });
  const [withdraw, setWithdraw] = useState({
    token: "WETH",
    commitment: "",
    to: "",
  });

  const [balances, setBalances] = useState({
    wallet: { WETH: "0.0", USDC: "0.0" },
    contract: { WETH: "0.0", USDC: "0.0" },
  });

  const { data: walletClient } = useWalletClient();

  const [txState, setTxState] = useState<TxState>({ status: "idle" });

  const triggerSwap = React.useCallback(() => {
    const out = (parseFloat(fromAmount || "0") * 1600).toFixed(6);
    setEstimatedOut(out);
    setTxState({ status: "awaitingSignature" });
    setTimeout(() => setTxState({ status: "pending" }), 1000);
    setTimeout(() => setTxState({ status: "confirmed" }), 3500);
  }, [fromAmount]);

  function triggerDeposit(txHash?: string) {
    setTxState({ status: "awaitingSignature", txHash });
    setTimeout(() => setTxState({ status: "pending", txHash }), 800);
    setTimeout(() => setTxState({ status: "confirmed", txHash }), 3000);
    setDepositOpen(false);
  }

  function triggerWithdraw() {
    setTxState({ status: "awaitingSignature" });
    setTimeout(() => setTxState({ status: "pending", txHash: "0xwd..." }), 800);
    setTimeout(
      () => setTxState({ status: "confirmed", txHash: "0xwd..." }),
      3000
    );
    setWithdrawOpen(false);
  }

  const getBalances = useCallback(async () => {
    // default shape
    const zeros = {
      wallet: { WETH: "0.0", USDC: "0.0" },
      contract: { WETH: "0.0", USDC: "0.0" },
    };
    try {
      if (!walletClient) return zeros;
      const provider = new ethers.BrowserProvider(walletClient.transport);
      const signer = await provider.getSigner(walletClient.account.address);
      const address = await signer.getAddress();

      const ercWeth = getErc20(WETH, provider);
      const ercUsdc = getErc20(USDC, provider);
      const commitments = JSON.parse(
        localStorage.getItem("commitments") || "[]"
      );

      const [walletWethRaw, walletUsdcRaw, contractWethRaw, contractUsdcRaw] =
        await Promise.all([
          ercWeth.balanceOf(address),
          ercUsdc.balanceOf(address),
          commitments
            .filter((c: Commitment) => c.token === WETH)
            .reduce(
              (acc: bigint, c: Commitment) => acc + BigInt(c.amount),
              BigInt(0)
            ),
          commitments
            .filter((c: Commitment) => c.token === USDC)
            .reduce(
              (acc: bigint, c: Commitment) => acc + BigInt(c.amount),
              BigInt(0)
            ),
        ]);

      const walletWeth = ethers.formatUnits(walletWethRaw ?? "0", 18);
      const walletUsdc = ethers.formatUnits(walletUsdcRaw ?? "0", 18);
      const contractWeth = ethers.formatUnits(contractWethRaw ?? "0", 18);
      const contractUsdc = ethers.formatUnits(contractUsdcRaw ?? "0", 18);

      setBalances({
        wallet: { WETH: walletWeth, USDC: walletUsdc },
        contract: { WETH: contractWeth, USDC: contractUsdc },
      });
    } catch (err) {
      console.error("getBalances failed", err);
      return zeros;
    }
  }, [walletClient]);

  const value = useMemo(
    () => ({
      fromAmount,
      setFromAmount,
      estimatedOut,
      slippage,
      setSlippage,
      depositOpen,
      setDepositOpen,
      withdrawOpen,
      setWithdrawOpen,
      deposit,
      setDeposit,
      withdraw,
      setWithdraw,
      balances,
      setBalances,
      txState,
      setTxState,
      triggerSwap,
      triggerDeposit,
      triggerWithdraw,
      getBalances,
    }),
    [
      fromAmount,
      estimatedOut,
      slippage,
      depositOpen,
      withdrawOpen,
      deposit,
      withdraw,
      balances,
      txState,
      triggerSwap,
      getBalances,
    ]
  );

  return <SwapContext.Provider value={value}>{children}</SwapContext.Provider>;
}

export function useSwapContext() {
  const ctx = useContext(SwapContext);
  if (!ctx) throw new Error("useSwapContext must be used within SwapProvider");
  return ctx;
}
