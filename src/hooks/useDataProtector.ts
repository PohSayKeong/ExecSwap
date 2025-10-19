"use client";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import {
  IExecDataProtector,
  IExecDataProtectorCore,
} from "@iexec/dataprotector";

export function useDataProtector() {
  const { isConnected, connector } = useAccount();
  const [dataProtector, setDataProtector] = useState<IExecDataProtector | null>(
    null
  );
  const [dataProtectorCore, setDataProtectorCore] =
    useState<IExecDataProtectorCore | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function initialize() {
      if (isConnected && connector) {
        setLoading(true);
        try {
          const provider =
            (await connector.getProvider()) as import("ethers").Eip1193Provider;

          const dp = new IExecDataProtector(provider, {
            allowExperimentalNetworks: true,
          });
          setDataProtector(dp);
          setDataProtectorCore(dp.core);
        } catch (err) {
          console.error("Failed to initialize data protector:", err);
        } finally {
          setLoading(false);
        }
      }
    }
    initialize();
  }, [isConnected, connector]);

  return { dataProtector, dataProtectorCore, loading };
}
