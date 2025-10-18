"use client";
import React from "react";
import TokenInput from "./TokenInput";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";

type Balances = {
  wallet?: { WETH?: string; USDC?: string };
  contract?: { WETH?: string; USDC?: string };
};

type SwapCardProps = {
  fromAmount: string;
  setFromAmount: (v: string) => void;
  estimatedOut?: string | null;
  slippage: number;
  setSlippage: (n: number) => void;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onSwap: () => void;
  balances?: any;
  txState?: any;
};

export default function SwapCard({
  fromAmount,
  setFromAmount,
  estimatedOut,
  slippage,
  setSlippage,
  onOpenDeposit,
  onOpenWithdraw,
  onSwap,
  balances,
  txState,
}: SwapCardProps) {
  return (
    <div className="bg-white shadow rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Privacy Swap</h3>
        <div className="text-sm text-gray-500">
          WETH → USDC (Arbitrum Sepolia)
        </div>
      </div>

      <TokenInput
        tokenSymbol="WETH"
        value={fromAmount}
        onChange={(v: string) => setFromAmount(v)}
        balance={balances?.wallet?.WETH}
      />

      <div className="my-4 text-sm text-gray-600">
        Estimated out: {estimatedOut ?? "—"} USDC
      </div>

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-gray-700">Slippage</label>
        <Select
          value={String(slippage)}
          onChange={(e: any) => setSlippage(parseFloat(e.target.value))}
        >
          <option value="0.1">0.1%</option>
          <option value="0.5">0.5%</option>
          <option value="1">1%</option>
        </Select>
        <div className="flex-1 text-right">
          <Button
            onClick={onOpenDeposit}
            className="mr-2 bg-blue-50 text-blue-700"
          >
            Deposit
          </Button>
          <Button
            onClick={onOpenWithdraw}
            className="bg-yellow-50 text-yellow-700"
          >
            Withdraw
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button
          onClick={onSwap}
          className="bg-black text-white"
          disabled={!fromAmount || parseFloat(fromAmount) <= 0}
        >
          Swap
        </Button>
        <div className="text-sm text-gray-500">{txState?.status ?? "idle"}</div>
      </div>
    </div>
  );
}
