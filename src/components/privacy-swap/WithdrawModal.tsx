"use client";
import React from "react";
import { Dialog } from "@/components/ui/Dialog";
import Label from "@/components/ui/Label";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";

export default function WithdrawModal({
  open,
  onClose,
  withdrawState,
  setWithdrawState,
  onWithdraw,
  balances,
}: any) {
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

        <Label>Amount</Label>
        <Input
          value={withdrawState.amount}
          onChange={(e: any) =>
            setWithdrawState((s: any) => ({ ...s, amount: e.target.value }))
          }
          placeholder="0.0"
          inputMode="decimal"
          className="mb-3"
        />

        <Label>Withdraw to</Label>
        <Input
          value={withdrawState.to ?? ""}
          onChange={(e: any) =>
            setWithdrawState((s: any) => ({ ...s, to: e.target.value }))
          }
          placeholder="Recipient address"
          className="mb-3"
        />

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div>Wallet: {balances?.wallet?.USDC ?? "—"} USDC</div>
          <div>In-contract: {balances?.contract?.USDC ?? "—"} USDC</div>
        </div>

        <div className="flex justify-end gap-3">
          <Button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </Button>
          <Button
            onClick={onWithdraw}
            className="px-4 py-2 bg-yellow-600 text-white rounded"
          >
            Withdraw
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
