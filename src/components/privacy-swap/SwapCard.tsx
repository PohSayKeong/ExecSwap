"use client";
import React from "react";
import { ethers } from "ethers";
import { WETH } from "@/config/tokens";
import TokenInput from "./TokenInput";
import Button from "@/components/ui/Button";
import USDCImg from "@/images/usdc.png";
import Image from "next/image";
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
  const [committedBalance, setCommittedBalance] = React.useState<string | null>(
    null
  );

  React.useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem("commitments") || "[]");
      const sumByAddress = all
        .filter(
          (c: any) => c.token && c.token.toLowerCase() === WETH.toLowerCase()
        )
        .reduce((acc: bigint, c: any) => acc + BigInt(c.amount), BigInt(0));
      const sumBySymbol = all
        .filter((c: any) => c.token === "WETH")
        .reduce((acc: bigint, c: any) => acc + BigInt(c.amount), BigInt(0));
      const finalSum = sumByAddress > BigInt(0) ? sumByAddress : sumBySymbol;
      setCommittedBalance(ethers.formatUnits(finalSum.toString(), 18));
    } catch {
      setCommittedBalance(null);
    }
  }, [txState, fromAmount]);
  // compute UI-only minimum out based on slippage and estimatedOut (strings)
  const computeMinOut = () => {
    if (!estimatedOut) return null;
    const parsed = parseFloat(String(estimatedOut));
    if (!isFinite(parsed)) return null;
    const min = parsed * (1 - slippage / 100);
    return min.toFixed(6).replace(/\.0+$/, "");
  };

  const minOut = computeMinOut();

  // determine if user has sufficient committed balance to swap
  let insufficient = false;
  try {
    const availableStr = committedBalance ?? balances?.contract?.WETH ?? "0";
    const availableUnits = ethers.parseUnits(availableStr || "0", 18);
    const requestedUnits = ethers.parseUnits(fromAmount || "0", 18);
    if (BigInt(requestedUnits.toString()) > BigInt(availableUnits.toString())) {
      insufficient = true;
    }
  } catch {
    // parse errors -> treat as insufficient to be safe
    insufficient = true;
  }

  return (
    <div className="bg-gradient-to-b from-white to-gray-50 shadow-lg rounded-2xl p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-xl font-semibold">Privacy Swap</h3>
          <p className="text-sm text-gray-500 mt-1">
            WETH → USDC • Arbitrum Sepolia
          </p>
        </div>
      </div>

      <TokenInput
        tokenSymbol="WETH"
        value={fromAmount}
        onChange={(v: string) => setFromAmount(v)}
        balance={committedBalance ?? balances?.contract?.WETH}
      />

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
        <div className="md:col-span-2">
          <div className="flex gap-3">
            <div className="flex-1 p-3 bg-white rounded-lg shadow-sm ring-1 ring-gray-100">
              <div className="text-xs text-gray-500">Estimated out</div>
              <div className="mt-1 text-lg font-medium">
                {estimatedOut ? (
                  <>
                    {estimatedOut}
                    <Image
                      className="mx-1 w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 items-center justify-center text-white font-semibold inline-block"
                      src={USDCImg}
                      alt="USDC"
                      width={24}
                      height={24}
                    />
                    USDC
                  </>
                ) : (
                  "—"
                )}
              </div>
            </div>

            <div className="w-1/2 p-3 bg-white rounded-lg shadow-sm ring-1 ring-gray-100">
              <div className="text-xs text-gray-500">Minimum out</div>
              <div className="mt-1 text-lg font-medium">
                {minOut ? (
                  <>
                    {minOut}
                    <Image
                      className="mx-1 w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 items-center justify-center text-white font-semibold inline-block"
                      src={USDCImg}
                      alt="USDC"
                      width={24}
                      height={24}
                    />
                    USDC
                  </>
                ) : (
                  "—"
                )}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Slippage: {slippage}%
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSlippage(0.1)}
              className={`px-3 py-1 rounded-full text-sm ${
                slippage === 0.1
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              0.1%
            </button>
            <button
              onClick={() => setSlippage(0.5)}
              className={`px-3 py-1 rounded-full text-sm ${
                slippage === 0.5
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              0.5%
            </button>
            <button
              onClick={() => setSlippage(1)}
              className={`px-3 py-1 rounded-full text-sm ${
                slippage === 1
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              1%
            </button>
          </div>

          <div className="flex gap-2 justify-start">
            <Button
              onClick={onOpenDeposit}
              className="px-3 py-1 bg-blue-600 text-white rounded-md"
            >
              Deposit
            </Button>
            <Button
              onClick={onOpenWithdraw}
              className="px-3 py-1 bg-yellow-500 text-white rounded-md"
            >
              Withdraw
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <Button
          onClick={onSwap}
          className="min-w-40 py-2 bg-black text-white rounded-lg shadow"
          disabled={!fromAmount || parseFloat(fromAmount) <= 0 || insufficient}
        >
          {insufficient ? "Insufficient committed funds" : "Swap"}
        </Button>

        <div className="text-sm text-gray-500">{txState?.status ?? "idle"}</div>
      </div>
    </div>
  );
}
