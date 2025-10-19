"use client";
import React from "react";
import Label from "@/components/ui/Label";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Image from "next/image";
import wethImg from "@/images/weth.png";

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
    <div className="bg-white rounded-lg p-4 shadow-sm ring-1 ring-gray-100">
      <Label>From</Label>
      <div className="flex items-center gap-4 mt-2">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Image
              className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold"
              src={wethImg}
              alt={tokenSymbol}
              width={40}
              height={40}
            />
            <Input
              value={value}
              onChange={(e: any) => onChange(e.target.value)}
              placeholder={`0.0 ${tokenSymbol}`}
              inputMode="decimal"
              className="text-lg font-medium flex-1"
            />
          </div>
          <div className="flex justify-between">
            <div className="text-xs text-gray-500 mt-1 ml-14 py-2">
              Balance:{" "}
              <span className="font-medium text-gray-700">
                {balance ?? "—"}
              </span>{" "}
              {tokenSymbol}
            </div>
            <Button
              className="text-xs py-1 px-0"
              variant="ghost"
              onClick={() => onChange(balance || "0")}
            >
              Max
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
