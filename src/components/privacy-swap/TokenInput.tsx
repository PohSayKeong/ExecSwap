"use client";
import React from "react";
import Label from "@/components/ui/Label";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type TokenInputProps = {
  tokenSymbol: string;
  value: string;
  onChange: (v: string) => void;
  balance?: string;
};

export default function TokenInput({
  tokenSymbol,
  value,
  onChange,
  balance,
}: TokenInputProps) {
  return (
    <div className="border rounded p-3">
      <Label>From</Label>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Input
            value={value}
            onChange={(e: any) => onChange(e.target.value)}
            placeholder={`0.0 ${tokenSymbol}`}
            inputMode="decimal"
          />
          <div className="text-xs text-gray-500 mt-1">
            Balance: {balance ?? "—"} {tokenSymbol}
          </div>
        </div>
        <div className="w-24 text-right font-medium">
          {tokenSymbol}
          <div>
            <Button className="mt-2 text-xs">Use max</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
