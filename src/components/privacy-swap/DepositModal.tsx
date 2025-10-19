"use client";
import React from "react";
import { Dialog } from "@/components/ui/Dialog";
import Label from "@/components/ui/Label";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { useDeposit } from "@/hooks/useDeposit";
import { ethers } from "ethers";
import { WETH, USDC } from "@/config/tokens";
import { useSwapUI } from "@/hooks/useSwapUI";

type DepositModalProps = {
  open: boolean;
  onClose: () => void;
  depositState: { token: string; amount: string };
  setDepositState: React.Dispatch<
    React.SetStateAction<{ token: string; amount: string }>
  >;
  balances?: Record<string, { [key: string]: string }>;
};

export default function DepositModal({
  open,
  onClose,
  depositState,
  setDepositState,
  balances,
}: DepositModalProps) {
  const { checkAllowance, approveExact, deposit } = useDeposit(
    "0xa1B0bcf21F9Bd265A2b9478cEc99F1dc200B6d10"
  );
  const { txState } = useSwapUI();

  const [isWorking, setIsWorking] = React.useState(false);

  const handleDeposit = async () => {
    const tokenAddr = depositState.token === "WETH" ? WETH : USDC;
    try {
      setIsWorking(true);
      const amountUnits = ethers.parseUnits(depositState.amount || "0", 18);
      const allowance = await checkAllowance(tokenAddr);
      if (allowance < amountUnits) {
        await approveExact(tokenAddr, amountUnits);
      }
      await deposit(tokenAddr, amountUnits);
      setIsWorking(false);
    } catch (err) {
      console.error("deposit flow failed", err);
      setIsWorking(false);
    }
  };

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
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setDepositState((s) => ({ ...s, token: e.target.value }))
          }
          className="mb-3"
        >
          <option value="WETH">WETH</option>
          <option value="USDC">USDC</option>
        </Select>

        <Label>Amount</Label>
        <Input
          value={depositState.amount}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setDepositState((s) => ({ ...s, amount: e.target.value }))
          }
          placeholder="0.0"
          inputMode="decimal"
          className="mb-3"
        />

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div>Wallet: {balances?.wallet?.WETH ?? "—"} WETH</div>
          <div>In-contract: {balances?.contract?.WETH ?? "—"} WETH</div>
        </div>

        {txState?.txHash && (
          <div className="text-xs text-blue-600 mb-3">
            <a
              href={`https://sepolia.arbiscan.io/tx/${txState.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              View transaction on explorer
            </a>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </Button>
          <Button
            onClick={handleDeposit}
            className="px-4 py-2 bg-blue-600 text-white rounded"
            disabled={
              isWorking ||
              !depositState.amount ||
              parseFloat(depositState.amount) <= 0
            }
          >
            {isWorking || txState.status !== "idle"
              ? txState.status
              : "Approve & Deposit"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
