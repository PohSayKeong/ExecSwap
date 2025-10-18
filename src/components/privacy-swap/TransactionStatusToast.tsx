"use client";
import React from "react";

export default function TransactionStatusToast({ txState }: any) {
  if (!txState || txState.status === "idle") return null;
  const statusColor =
    txState.status === "pending"
      ? "bg-yellow-100 text-yellow-800"
      : txState.status === "confirmed"
      ? "bg-green-100 text-green-800"
      : txState.status === "failed"
      ? "bg-red-100 text-red-800"
      : "bg-gray-100 text-gray-800";

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-white shadow-lg rounded-lg p-4 w-80">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div
                className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}
              >
                {txState.status}
              </div>
              <div className="text-sm font-medium">Transaction</div>
            </div>
            {txState.txHash && (
              <div className="text-xs text-blue-600 mt-2">
                Explorer: {txState.txHash}
              </div>
            )}
            {txState.error && (
              <div className="text-xs text-red-600 mt-2">
                Error: {txState.error}
              </div>
            )}
          </div>
          <div>
            <button className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
        </div>
      </div>
    </div>
  );
}
