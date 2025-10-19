"use client";
import { useSwapContext } from "@/context/SwapContext";

export function useSwapUI() {
  return useSwapContext();
}
