"use client";
import React from "react";
import { Dialog } from "@/components/ui/Dialog";
import Label from "@/components/ui/Label";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";

export default function DepositModal({
  open,
  onClose,
  depositState,
  setDepositState,
  onDeposit,
  balances,
}: any) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
            D
          </div>
          <div>
            <h3 className="text-lg font-semibold">Deposit to Privacy Pool</h3>
            <p className="text-sm text-gray-500">
              Choose token and amount to deposit
            </p>
          </div>
        </div>

        <Label className="mt-2">Token</Label>
        <Select
          value={depositState.token}
          onChange={(e: any) =>
            setDepositState((s: any) => ({ ...s, token: e.target.value }))
          }
          className="mb-3"
        >
          <option value="WETH">WETH</option>
          <option value="USDC">USDC</option>
        </Select>

        <Label>Amount</Label>
        <Input
          value={depositState.amount}
          onChange={(e: any) =>
            setDepositState((s: any) => ({ ...s, amount: e.target.value }))
          }
          placeholder="0.0"
          inputMode="decimal"
          className="mb-3"
        />

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div>Wallet: {balances?.wallet?.WETH ?? "—"} WETH</div>
          <div>In-contract: {balances?.contract?.WETH ?? "—"} WETH</div>
        </div>

        <div className="flex justify-end gap-3">
          <Button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </Button>
          <Button
            onClick={onDeposit}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Deposit
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
