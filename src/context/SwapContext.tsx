"use client";
import React, {
  createContext,
  Dispatch,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { ethers } from "ethers";
import { useWalletClient } from "wagmi";
import { WETH, USDC, getErc20 } from "@/config/tokens";
import { Commitment } from "@/types/Commitment";

type TxState = { status: string; txHash?: string; error?: string };

type SwapContextType = {
  fromAmount: string;
  setFromAmount: (v: string) => void;
  estimatedOut: string | null;
  slippage: number;
  setSlippage: (n: number) => void;
  depositOpen: boolean;
  setDepositOpen: (b: boolean) => void;
  withdrawOpen: boolean;
  setWithdrawOpen: (b: boolean) => void;
  deposit: { token: string; amount: string };
  setDeposit: Dispatch<React.SetStateAction<{ token: string; amount: string }>>;
  withdraw: WithdrawState;
  setWithdraw: Dispatch<React.SetStateAction<WithdrawState>>;
  balances: {
    wallet: { WETH: string; USDC: string };
    contract: { WETH: string; USDC: string };
  };
  setBalances: (b: {
    wallet: { WETH: string; USDC: string };
    contract: { WETH: string; USDC: string };
  }) => void;
  txState: TxState;
  setTxState: (s: TxState) => void;
  triggerSwap: () => void;
  performSwap: (options?: {
    tokenIn?: string;
    tokenOut?: string;
    tokenAmountIn?: bigint;
    minimumTokenOut?: bigint;
  }) => Promise<void>;
  triggerDeposit: (txHash?: string) => void;
  triggerWithdraw: () => void;
  getBalances: () => Promise<{
    wallet: { WETH: string; USDC: string };
    contract: { WETH: string; USDC: string };
  }>;
};

type WithdrawState = {
  token: string;
  commitment?: string;
  to?: string;
  selectedCommitment?: { amount: string; ownerhash: string } | null;
};

const SwapContext = createContext<SwapContextType | undefined>(undefined);

export function SwapProvider({ children }: { children: React.ReactNode }) {
  const [fromAmount, setFromAmountState] = useState("");
  const [estimatedOut, setEstimatedOut] = useState<string | null>(null);
  const [slippage, setSlippage] = useState<number>(0.5);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const [deposit, setDeposit] = useState({ token: "WETH", amount: "" });
  const [withdraw, setWithdraw] = useState<WithdrawState>({
    token: "WETH",
    commitment: undefined,
    to: undefined,
    selectedCommitment: null,
  });

  const [balances, setBalances] = useState({
    wallet: { WETH: "0.0", USDC: "0.0" },
    contract: { WETH: "0.0", USDC: "0.0" },
  });

  const { data: walletClient } = useWalletClient();

  const [txState, setTxState] = useState<TxState>({ status: "idle" });

  const triggerSwap = React.useCallback(() => {
    const out = (parseFloat(fromAmount || "0") * 1600).toFixed(6);
    setEstimatedOut(out);
    setTxState({ status: "awaitingSignature" });
    setTimeout(() => setTxState({ status: "pending" }), 1000);
    setTimeout(() => setTxState({ status: "confirmed" }), 3500);
  }, [fromAmount]);

  // Estimate out using real commitments and Chainlink ETH price
  const estimateOut = React.useCallback(async (amountStr: string) => {
    if (!amountStr || Number(amountStr) <= 0) {
      setEstimatedOut(null);
      return;
    }
    try {
      const tokenAmountIn = ethers.parseUnits(amountStr || "0", 18);

      // read commitments to ensure there's enough committed WETH
      const all = JSON.parse(localStorage.getItem("commitments") || "[]");
      const filtered = all.filter(
        (c: any) => c.token.toLowerCase() === WETH.toLowerCase()
      );
      let sum = BigInt(0);
      for (const c of filtered) {
        sum += BigInt(c.amount.toString());
      }
      if (sum < BigInt(tokenAmountIn.toString())) {
        // not enough committed balance to estimate
        setEstimatedOut(null);
        return;
      }

      // fetch ETH price from Chainlink feed
      const PRICE_FEED_ADDRESS = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
      const feedAbi = [
        {
          inputs: [],
          name: "latestAnswer",
          outputs: [{ internalType: "int256", name: "", type: "int256" }],
          stateMutability: "view",
          type: "function",
        },
      ];
      const feed = new ethers.Contract(
        PRICE_FEED_ADDRESS,
        feedAbi,
        new ethers.JsonRpcProvider("https://eth.llamarpc.com")
      );
      const ethPriceRaw = await feed.latestAnswer();
      const ethPrice = BigInt(ethPriceRaw.toString());

      // totalTokenOut = tokenAmountIn * ethPrice / 1e8
      const totalTokenOut =
        (BigInt(tokenAmountIn.toString()) * ethPrice) / BigInt(1e8);
      const formatted = ethers.formatUnits(totalTokenOut.toString(), 18);
      setEstimatedOut(formatted);
    } catch (err) {
      console.error("estimateOut failed", err);
      setEstimatedOut(null);
    }
  }, []);

  React.useEffect(() => {
    // compute estimate when fromAmount changes
    estimateOut(fromAmount).catch((e) => console.warn(e));
  }, [fromAmount, estimateOut]);

  // wrapper that updates fromAmount and immediately re-estimates
  const setFromAmount = React.useCallback(
    (v: string) => {
      setFromAmountState(v);
      // fire-and-forget estimate so UI updates real-time
      estimateOut(v).catch((e) => console.warn(e));
    },
    [estimateOut]
  );

  async function performSwap(options?: {
    tokenIn?: string;
    tokenOut?: string;
    tokenAmountIn?: bigint;
    minimumTokenOut?: bigint;
  }) {
    // client-side swap implementation (no on-chain tx):
    // - read commitments from localStorage
    // - pick commitments for tokenIn until tokenAmountIn is satisfied
    // - compute tokenOut amount using Chainlink ETH price
    // - create two new commitments: tokenOut total and change back to tokenIn
    // - remove consumed commitments, add new commitments to localStorage
    // - update balances state
    try {
      setTxState({ status: "swapping" });
      const tokenIn = options?.tokenIn ?? WETH;
      const tokenOut = options?.tokenOut ?? USDC;
      const tokenAmountIn = options?.tokenAmountIn ?? BigInt(0);
      const minimumTokenOut = options?.minimumTokenOut ?? BigInt(0);

      // collect commitments for tokenIn
      const all = JSON.parse(localStorage.getItem("commitments") || "[]");
      const filtered = all.filter(
        (c: any) => c.token.toLowerCase() === tokenIn.toLowerCase()
      );
      let sum = BigInt(0);
      const used: any[] = [];
      for (const c of filtered) {
        sum += BigInt(c.amount.toString());
        used.push(c);
        if (sum >= tokenAmountIn) break;
      }
      if (sum < tokenAmountIn) {
        throw new Error("Not enough committed balance to perform swap");
      }

      // fetch ETH price via Chainlink feed (same address used in swap.js)
      const PRICE_FEED_ADDRESS = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
      const feedAbi = [
        {
          inputs: [],
          name: "latestAnswer",
          outputs: [{ internalType: "int256", name: "", type: "int256" }],
          stateMutability: "view",
          type: "function",
        },
      ];
      const feed = new ethers.Contract(
        PRICE_FEED_ADDRESS,
        feedAbi,
        new ethers.JsonRpcProvider("https://eth.llamarpc.com")
      );
      const ethPriceRaw = await feed.latestAnswer();
      const ethPrice = BigInt(ethPriceRaw.toString());

      // ethPrice is scaled by 1e8, we'll compute using BigInt math: tokenOut = tokenAmountIn * ethPrice / 1e8
      const totalTokenOut = (tokenAmountIn * ethPrice) / BigInt(1e8);

      if (totalTokenOut < minimumTokenOut) {
        throw new Error("Swap would yield less than minimumTokenOut");
      }

      const change = sum - tokenAmountIn;

      // build new commitments (store amounts as strings)
      const ownerhash = ethers.keccak256(ethers.toUtf8Bytes("userPublicKey"));
      const tokenOutCommitment = {
        token: tokenOut,
        amount: totalTokenOut.toString(),
        ownerhash,
      };
      const changeCommitment = {
        token: tokenIn,
        amount: change.toString(),
        ownerhash,
      };

      // remove used commitments from existing (first-match removal)
      const existing = [...all];
      for (const u of used) {
        const idx = existing.findIndex(
          (c: any) =>
            c.ownerhash === u.ownerhash &&
            BigInt(c.amount).toString() === BigInt(u.amount).toString()
        );
        if (idx >= 0) existing.splice(idx, 1);
      }

      // add new commitments
      existing.push(tokenOutCommitment);
      if (change > BigInt(0)) existing.push(changeCommitment);

      // If a deployer private key is available and we're on the server, attempt on-chain submission
      const deployerKey = process.env.NEXT_PUBLIC_DEPLOYER_PRIVATE_KEY;
      console.log(deployerKey);
      const rpcUrl = "https://api.zan.top/arb-sepolia";
      if (deployerKey) {
        try {
          const provider = new ethers.JsonRpcProvider(rpcUrl);
          const signer = new ethers.Wallet(deployerKey, provider);
          const VAULT_ADDRESS = (await import("@/config/tokens")).VAULT;
          const vault = new ethers.Contract(
            VAULT_ADDRESS,
            (await import("@/abi/ExecSwap.json")).abi ||
              (await import("@/abi/ExecSwap.json")),
            signer
          );

          // verify used commitments exist on-chain
          const hashedCommitments: string[] = [];
          for (const u of used) {
            const commitment = ethers.keccak256(
              ethers.solidityPacked(
                ["uint256", "address", "bytes32"],
                [
                  ethers.toBigInt(u.amount.toString()),
                  u.token || tokenIn,
                  u.ownerhash,
                ]
              )
            );
            const exists = await vault.isCommitmentStored(commitment);
            if (!exists)
              throw new Error(`Commitment not found on-chain: ${commitment}`);
            hashedCommitments.push(commitment);
          }

          // compute on-chain commitments (keccak256 of amount, token, ownerhash)
          const ownerhash = ethers.keccak256(
            ethers.toUtf8Bytes("userPublicKey")
          );
          const tokenOutCommitmentHash = ethers.keccak256(
            ethers.solidityPacked(
              ["uint256", "address", "bytes32"],
              [ethers.toBigInt(totalTokenOut.toString()), tokenOut, ownerhash]
            )
          );
          const changeCommitmentHash = ethers.keccak256(
            ethers.solidityPacked(
              ["uint256", "address", "bytes32"],
              [ethers.toBigInt(change.toString()), tokenIn, ownerhash]
            )
          );

          console.log(
            tokenOutCommitmentHash,
            changeCommitmentHash,
            hashedCommitments
          );
          const tx = await vault.updateCommitment(
            [tokenOutCommitmentHash, changeCommitmentHash],
            hashedCommitments
          );
          await tx.wait();
          localStorage.setItem("commitments", JSON.stringify(existing));
          setTxState({ status: "confirmed", txHash: tx.hash });

          setTimeout(() => {
            setTxState({ status: "idle" });
          }, 5000);
          return;
        } catch (err) {
          console.error(
            "on-chain submission failed, falling back to local-only update",
            err
          );
        }
      }

      // update balances in state using same reduce logic as getBalances
      const contractWethRaw = existing
        .filter((c: any) => c.token === WETH)
        .reduce((acc: bigint, c: any) => acc + BigInt(c.amount), BigInt(0));
      const contractUsdcRaw = existing
        .filter((c: any) => c.token === USDC)
        .reduce((acc: bigint, c: any) => acc + BigInt(c.amount), BigInt(0));

      const contractWeth = ethers.formatUnits(contractWethRaw.toString(), 18);
      const contractUsdc = ethers.formatUnits(contractUsdcRaw.toString(), 18);

      setBalances((b) => ({
        ...b,
        contract: { WETH: contractWeth, USDC: contractUsdc },
      }));
    } catch (err) {
      console.error("performSwap failed", err);
      setTxState({
        status: "failed",
        error: (err as Error)?.message ?? String(err),
      });
      throw err;
    }
  }

  function triggerDeposit(txHash?: string) {
    setTxState({ status: "awaitingSignature", txHash });
    setTimeout(() => setTxState({ status: "pending", txHash }), 800);
    setTimeout(() => setTxState({ status: "confirmed", txHash }), 3000);
    setDepositOpen(false);
  }

  function triggerWithdraw() {
    setTxState({ status: "awaitingSignature" });
    setTimeout(() => setTxState({ status: "pending", txHash: "0xwd..." }), 800);
    setTimeout(
      () => setTxState({ status: "confirmed", txHash: "0xwd..." }),
      3000
    );
    setWithdrawOpen(false);
  }

  const getBalances = useCallback(async () => {
    // default shape
    const zeros = {
      wallet: { WETH: "0.0", USDC: "0.0" },
      contract: { WETH: "0.0", USDC: "0.0" },
    };
    try {
      if (!walletClient) return zeros;
      const provider = new ethers.BrowserProvider(walletClient.transport);
      const signer = await provider.getSigner(walletClient.account.address);
      const address = await signer.getAddress();

      const ercWeth = getErc20(WETH, provider);
      const ercUsdc = getErc20(USDC, provider);
      const commitments = JSON.parse(
        localStorage.getItem("commitments") || "[]"
      );

      const [walletWethRaw, walletUsdcRaw, contractWethRaw, contractUsdcRaw] =
        await Promise.all([
          ercWeth.balanceOf(address),
          ercUsdc.balanceOf(address),
          commitments
            .filter((c: Commitment) => c.token === WETH)
            .reduce(
              (acc: bigint, c: Commitment) => acc + BigInt(c.amount),
              BigInt(0)
            ),
          commitments
            .filter((c: Commitment) => c.token === USDC)
            .reduce(
              (acc: bigint, c: Commitment) => acc + BigInt(c.amount),
              BigInt(0)
            ),
        ]);

      const walletWeth = ethers.formatUnits(walletWethRaw ?? "0", 18);
      const walletUsdc = ethers.formatUnits(walletUsdcRaw ?? "0", 18);
      const contractWeth = ethers.formatUnits(contractWethRaw ?? "0", 18);
      const contractUsdc = ethers.formatUnits(contractUsdcRaw ?? "0", 18);

      setBalances({
        wallet: { WETH: walletWeth, USDC: walletUsdc },
        contract: { WETH: contractWeth, USDC: contractUsdc },
      });
    } catch (err) {
      console.error("getBalances failed", err);
      return zeros;
    }
  }, [walletClient]);

  const value = useMemo(
    () => ({
      fromAmount,
      setFromAmount,
      estimatedOut,
      slippage,
      setSlippage,
      depositOpen,
      setDepositOpen,
      withdrawOpen,
      setWithdrawOpen,
      deposit,
      setDeposit,
      withdraw,
      setWithdraw,
      balances,
      setBalances,
      txState,
      setTxState,
      triggerSwap,
      triggerDeposit,
      triggerWithdraw,
      getBalances,
      performSwap,
    }),
    [
      fromAmount,
      estimatedOut,
      slippage,
      setFromAmount,
      depositOpen,
      withdrawOpen,
      deposit,
      withdraw,
      balances,
      txState,
      triggerSwap,
      getBalances,
    ]
  );

  return <SwapContext.Provider value={value}>{children}</SwapContext.Provider>;
}

export function useSwapContext() {
  const ctx = useContext(SwapContext);
  if (!ctx) throw new Error("useSwapContext must be used within SwapProvider");
  return ctx;
}
