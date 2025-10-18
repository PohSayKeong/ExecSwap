"use client";
import React from "react";

export default function TransactionStatusToast({ txState }: any) {
  if (!txState || txState.status === "idle") return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-white shadow rounded-lg p-4">
        <div className="font-medium">Transaction</div>
        <div className="text-sm text-gray-600">Status: {txState.status}</div>
        {txState.txHash && (
          <div className="text-xs text-blue-600">
            Explorer: {txState.txHash}
          </div>
        )}
        {txState.error && (
          <div className="text-xs text-red-600">Error: {txState.error}</div>
        )}
      </div>
    </div>
  );
}
