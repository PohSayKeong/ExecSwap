"use client";

import { useAppKit } from "@reown/appkit/react";
import { useAccount, useDisconnect } from "wagmi";
import PrivacySwap from "@/components/privacy-swap";
import { SwapProvider } from "@/context/SwapContext";

export default function Home() {
  const { open } = useAppKit();
  const { disconnectAsync } = useDisconnect();
  const { isConnected } = useAccount();

  const login = () => {
    open({ view: "Connect" });
  };

  const logout = async () => {
    try {
      await disconnectAsync();
    } catch (err) {
      console.error("Failed to logout:", err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-5">
      <nav className="bg-[#F4F7FC] rounded-xl p-4 mb-8 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="font-mono text-xl font-bold text-gray-800">
            ExecSwap
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* {isConnected && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="chain-selector"
                className="text-sm font-medium text-gray-700"
              >
                Chain:
              </label>
              <select
                id="chain-selector"
                value={chainId}
                onChange={handleChainChange}
                className="chain-selector"
              >
                {networks?.map((network) => (
                  <option key={network.id} value={network.id}>
                    {network.name}
                  </option>
                ))}
              </select>
            </div>
          )} */}
          {!isConnected ? (
            <button onClick={login} className="primary">
              Connect my wallet
            </button>
          ) : (
            <button onClick={logout} className="secondary">
              Disconnect
            </button>
          )}
        </div>
      </nav>

      {isConnected && (
        <section className="p-8 bg-[#F4F7FC] rounded-xl">
          <SwapProvider>
            <PrivacySwap />
          </SwapProvider>
        </section>
      )}
    </div>
  );
}
