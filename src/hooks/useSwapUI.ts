"use client";
import { useState } from "react";
import { formatNumber } from "../utils/format";

export function useSwapUI() {
  const [fromAmount, setFromAmount] = useState("");
  const [estimatedOut, setEstimatedOut] = useState<string | null>(null);
  const [slippage, setSlippage] = useState<number>(0.5);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const [deposit, setDeposit] = useState({ token: "WETH", amount: "" });
  const [withdraw, setWithdraw] = useState({ token: "USDC", amount: "" });

  const [balances] = useState({
    wallet: { WETH: "1.234", USDC: "400.00" },
    contract: { WETH: "0.0", USDC: "0.0" },
  });

  const [txState, setTxState] = useState<any>({ status: "idle" });

  function triggerSwap() {
    // UI-only: simulate estimate and tx lifecycle
    const out = (parseFloat(fromAmount || "0") * 1600).toFixed(6); // placeholder rate
    setEstimatedOut(out);
    setTxState({ status: "awaitingSignature" });
    setTimeout(
      () => setTxState({ status: "pending", txHash: "0xabc..." }),
      1000
    );
    setTimeout(
      () => setTxState({ status: "confirmed", txHash: "0xabc..." }),
      3500
    );
  }

  function triggerDeposit() {
    setTxState({ status: "awaitingSignature" });
    setTimeout(
      () => setTxState({ status: "pending", txHash: "0xdep..." }),
      800
    );
    setTimeout(
      () => setTxState({ status: "confirmed", txHash: "0xdep..." }),
      3000
    );
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

  return {
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
    txState,
    triggerSwap,
    triggerDeposit,
    triggerWithdraw,
  };
}
