import { ethers } from "ethers";
import TestTokenAbi from "@/abi/TestToken.json";

export const WETH = "0x3d033b8633F8BDA5540687B412ffaDf9A54818C6";
export const USDC = "0x39161944DE87d140236Bb5BF0435f0c67163c8e8";
export const VAULT = "0xa1B0bcf21F9Bd265A2b9478cEc99F1dc200B6d10";

export function getErc20(
  address: string,
  providerOrSigner?: ethers.BrowserProvider | ethers.Signer | null
) {
  const provider = providerOrSigner ?? undefined;
  // provider may be a BrowserProvider or a Signer - ethers.Contract accepts either
  return new ethers.Contract(
    address,
    TestTokenAbi.abi || TestTokenAbi,
    provider
  );
}

export function getErc20Contracts(
  providerOrSigner?: ethers.BrowserProvider | ethers.Signer | null
) {
  return {
    ercWeth: getErc20(WETH, providerOrSigner),
    ercUsdc: getErc20(USDC, providerOrSigner),
  };
}
