"use client";
import React, { useEffect } from "react";
import SwapCard from "./SwapCard";
import DepositModal from "./DepositModal";
import WithdrawModal from "./WithdrawModal";
import TransactionStatusToast from "./TransactionStatusToast";
import { useSwapUI } from "../../hooks/useSwapUI";

export default function PrivacySwap() {
  const ui = useSwapUI();
  const { getBalances } = ui;

  // Effect to fetch balances
  useEffect(() => {
    getBalances();
  }, [getBalances]);

  return (
    <div className="max-w-3xl mx-auto">
      <SwapCard
        fromAmount={ui.fromAmount}
        setFromAmount={ui.setFromAmount}
        estimatedOut={ui.estimatedOut}
        slippage={ui.slippage}
        setSlippage={ui.setSlippage}
        onOpenDeposit={() => ui.setDepositOpen(true)}
        onOpenWithdraw={() => ui.setWithdrawOpen(true)}
        onSwap={async () => {
          try {
            const { parseUnits } = await import("ethers");
            const tokenAmountIn = parseUnits(ui.fromAmount || "0", 18);
            const minOutStr = ui.estimatedOut
              ? (
                  parseFloat(ui.estimatedOut) *
                  (1 - ui.slippage / 100)
                ).toString()
              : "0";
            const minimumTokenOut = parseUnits(minOutStr, 18);
            await ui.performSwap({
              tokenIn: (await import("@/config/tokens")).WETH,
              tokenOut: (await import("@/config/tokens")).USDC,
              tokenAmountIn: BigInt(tokenAmountIn.toString()),
              minimumTokenOut: BigInt(minimumTokenOut.toString()),
            });
          } catch (err) {
            console.error("performSwap failed", err);
          }
        }}
        balances={ui.balances}
        txState={ui.txState}
      />

      <DepositModal
        open={ui.depositOpen}
        onClose={() => ui.setDepositOpen(false)}
        depositState={ui.deposit}
        setDepositState={ui.setDeposit}
        balances={ui.balances}
      />

      <WithdrawModal
        open={ui.withdrawOpen}
        onClose={() => ui.setWithdrawOpen(false)}
        withdrawState={ui.withdraw}
        setWithdrawState={ui.setWithdraw}
        onWithdraw={() => ui.triggerWithdraw()}
        balances={ui.balances}
      />

      <TransactionStatusToast />
    </div>
  );
}
