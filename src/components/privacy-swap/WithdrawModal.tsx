"use client";
import React from "react";
import { Dialog } from "@/components/ui/Dialog";
import Label from "@/components/ui/Label";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { useWithdraw } from "@/hooks/useWithdraw";
import { WETH, USDC, VAULT } from "@/config/tokens";
import { ethers } from "ethers";
import { useSwapUI } from "@/hooks/useSwapUI";

export default function WithdrawModal({
  open,
  onClose,
  withdrawState,
  setWithdrawState,
  balances,
}: any) {
  const { withdraw } = useWithdraw(VAULT);
  const { txState } = useSwapUI();
  const [isWorking, setIsWorking] = React.useState(false);
  const tokenKey = withdrawState?.token === "WETH" ? "WETH" : "USDC";

  const handleWithdraw = async () => {
    try {
      setIsWorking(true);
      const tokenAddr = withdrawState.token === "WETH" ? WETH : USDC;
      // use selected commitment
      const sel = withdrawState.commitment;
      if (!sel) throw new Error("No commitment selected");
      const amountUnits = BigInt(sel.amount);
      const to = withdrawState.to;
      await withdraw(tokenAddr, amountUnits, to, {
        amounts: [sel.amount.toString()],
        ownerhashes: [sel.ownerhash],
      });
      setIsWorking(false);
    } catch (err) {
      console.error("withdraw flow failed", err);
      setIsWorking(false);
    }
  };

  function CommitmentsList({
    token,
    selected,
    onSelect,
  }: {
    token: string;
    selected: any;
    onSelect: (c: any) => void;
  }) {
    const [commitments, setCommitments] = React.useState<any[]>([]);

    React.useEffect(() => {
      const all = JSON.parse(localStorage.getItem("commitments") || "[]");
      const filtered = all.filter(
        (c: any) => c.token === (token === "WETH" ? WETH : USDC)
      );
      setCommitments(filtered);
    }, [token]);

    if (!commitments || commitments.length === 0) {
      return (
        <div className="text-sm text-gray-500 mb-3">No commitments found</div>
      );
    }

    return (
      <div className="mb-3">
        <div className="max-h-48 overflow-y-auto pr-2">
          {commitments.map((c: any, idx: number) => (
            <label
              key={`${c.ownerhash}-${idx}`}
              className={`flex items-center gap-3 mb-2 p-2 rounded ${
                selected?.ownerhash === c.ownerhash &&
                selected?.amount === c.amount
                  ? "bg-gray-100"
                  : "hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="commitment"
                className="h-4 w-4 text-yellow-600"
                checked={
                  selected?.ownerhash === c.ownerhash &&
                  selected?.amount === c.amount
                }
                onChange={() =>
                  onSelect({ amount: c.amount, ownerhash: c.ownerhash })
                }
              />
              <div className="text-sm text-gray-700 break-words max-w-[350px]">
                {ethers.formatUnits(c.amount, 18)} {token}
                <div className="text-xs text-gray-400">{c.ownerhash}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-yellow-500 text-white flex items-center justify-center">
            W
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              Withdraw from Privacy Pool
            </h3>
            <p className="text-sm text-gray-500">
              Select token and amount to withdraw
            </p>
          </div>
        </div>

        <Label className="mt-2">Token</Label>
        <Select
          value={withdrawState.token}
          onChange={(e: any) =>
            setWithdrawState((s: any) => ({ ...s, token: e.target.value }))
          }
          className="mb-3"
        >
          <option value="WETH">WETH</option>
          <option value="USDC">USDC</option>
        </Select>

        <Label>Withdraw to</Label>
        <Input
          value={withdrawState.to ?? ""}
          onChange={(e: any) =>
            setWithdrawState((s: any) => ({ ...s, to: e.target.value }))
          }
          placeholder="Recipient address"
          className="mb-3"
        />

        <Label className="mt-2">Your commitments ({tokenKey})</Label>
        <CommitmentsList
          token={tokenKey}
          selected={withdrawState.commitment}
          onSelect={(c: any) =>
            setWithdrawState((s: any) => ({ ...s, commitment: c }))
          }
        />

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div>
            Wallet: {balances?.wallet?.[tokenKey] ?? "—"} {tokenKey}
          </div>
          <div>
            In-contract: {balances?.contract?.[tokenKey] ?? "—"} {tokenKey}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </Button>
          <Button
            onClick={handleWithdraw}
            className="px-4 py-2 bg-yellow-600 text-white rounded"
            disabled={
              isWorking || !withdrawState.commitment || !withdrawState.to
            }
          >
            {isWorking || txState.status !== "idle"
              ? txState.status
              : "Withdraw"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
