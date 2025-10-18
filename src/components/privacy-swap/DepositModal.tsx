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
      <h3 className="text-lg font-semibold mb-4">Deposit</h3>
      <Label>Token</Label>
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

      <div className="flex justify-end gap-2">
        <Button onClick={onClose} className="border">
          Cancel
        </Button>
        <Button onClick={onDeposit} className="bg-blue-600 text-white">
          Deposit
        </Button>
      </div>
    </Dialog>
  );
}
