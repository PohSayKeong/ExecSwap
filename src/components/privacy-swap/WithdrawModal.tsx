"use client";
import React from "react";

export default function WithdrawModal({
  open,
  onClose,
  withdrawState,
  setWithdrawState,
  onWithdraw,
  balances,
}: any) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Withdraw</h3>
        <label className="block text-sm font-medium text-gray-700">Token</label>
        <select
          value={withdrawState.token}
          onChange={(e) =>
            setWithdrawState((s: any) => ({ ...s, token: e.target.value }))
          }
          className="w-full p-2 border rounded mb-3"
        >
          <option value="WETH">WETH</option>
          <option value="USDC">USDC</option>
        </select>

        <label className="block text-sm font-medium text-gray-700">
          Amount
        </label>
        <input
          value={withdrawState.amount}
          onChange={(e) =>
            setWithdrawState((s: any) => ({ ...s, amount: e.target.value }))
          }
          placeholder="0.0"
          className="w-full p-2 border rounded mb-3"
          inputMode="decimal"
        />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded border">
            Cancel
          </button>
          <button
            onClick={onWithdraw}
            className="px-4 py-2 bg-yellow-600 text-white rounded"
          >
            Withdraw
          </button>
        </div>
      </div>
    </div>
  );
}
