"use client";
import React from "react";
import SwapCard from "./SwapCard";
import DepositModal from "./DepositModal";
import WithdrawModal from "./WithdrawModal";
import TransactionStatusToast from "./TransactionStatusToast";
import { useSwapUI } from "../../hooks/useSwapUI";

export default function PrivacySwap() {
  const ui = useSwapUI();

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
        onSwap={() => ui.triggerSwap()}
        balances={ui.balances}
        txState={ui.txState}
      />

      <DepositModal
        open={ui.depositOpen}
        onClose={() => ui.setDepositOpen(false)}
        depositState={ui.deposit}
        setDepositState={ui.setDeposit}
        onDeposit={() => ui.triggerDeposit()}
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

      <TransactionStatusToast txState={ui.txState} />
    </div>
  );
}
