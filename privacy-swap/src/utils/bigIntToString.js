import { ethers } from "ethers";

export const bigIntToString = (bigIntValue) => {
  return ethers.formatEther(ethers.toBigInt(bigIntValue.toString()));
};
