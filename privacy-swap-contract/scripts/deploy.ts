import { network } from "hardhat";
const { ethers } = await network.connect();

async function main() {
  const signers = await ethers.getSigners();
  console.log("🚀 Deploying ExecSwap...");
  const user = signers[0];
  const deployer = signers[1];
  const deployerAddress = deployer.address;
  console.log(`🔑 Deployer address: ${deployerAddress}`);
  const userAddress = user.address;
  console.log(`👤 User address: ${userAddress}`);

  // Deploy Weth (for local testing)
  const Weth = await ethers.getContractFactory("TestToken");
  const weth = await Weth.deploy("Wrapped Ether", "WETH", 18);
  await weth.waitForDeployment();
  console.log(`✅ Weth deployed at: ${await weth.getAddress()}`);

  // Mint some Weth to deployer and user for testing
  await weth.connect(deployer).mint(deployerAddress, ethers.parseEther("100"));
  console.log(`✅ Minted 100 Weth to deployer: ${deployerAddress}`);
  await weth.connect(deployer).mint(userAddress, ethers.parseEther("100"));
  console.log(`✅ Minted 100 Weth to user: ${userAddress}`);

  // Deploy a test token first (for local testing)
  const Token = await ethers.getContractFactory("TestToken");
  const token = await Token.deploy("USDC", "USDC", 18);
  await token.waitForDeployment();
  console.log(`✅ USDC deployed at: ${await token.getAddress()}`);

  // Mint to deployer for testing
  await token
    .connect(deployer)
    .mint(deployer.address, ethers.parseEther("1000"));
  console.log(`✅ Minted 1000 USDC to deployer: ${deployer.address}`);

  // Mint to user for testing...
  await token.connect(deployer).mint(userAddress, ethers.parseEther("1000"));
  console.log(`✅ Minted 1000 USDC to user: ${userAddress}`);

  // Deploy the ExecSwap
  const Vault = await ethers.getContractFactory("ExecSwap");
  const vault = await Vault.deploy();
  await vault.waitForDeployment();

  console.log(`✅ ExecSwap deployed at: ${await vault.getAddress()}`);

  // Deposit some Weth to the vault for testing
  const wethDepositAmount = ethers.parseEther("100");
  await weth
    .connect(deployer)
    .approve(await vault.getAddress(), wethDepositAmount);
  await vault
    .connect(deployer)
    .depositAndCommit(
      await weth.getAddress(),
      wethDepositAmount,
      ethers.keccak256(ethers.toUtf8Bytes("deployerPublicKey"))
    );
  console.log(
    `✅ Deployer deposited ${ethers.formatEther(
      wethDepositAmount
    )} WETH to ExecSwap vault`
  );

  // Deposit some USDC to the vault for testing
  const depositAmount = ethers.parseEther("500");
  await token
    .connect(deployer)
    .approve(await vault.getAddress(), depositAmount);
  await vault
    .connect(deployer)
    .depositAndCommit(
      await token.getAddress(),
      depositAmount,
      ethers.keccak256(ethers.toUtf8Bytes("deployerPublicKey"))
    );
  console.log(
    `✅ Deployer deposited ${ethers.formatEther(
      depositAmount
    )} USDC to ExecSwap vault`
  );

  // User approve and deposit some Weth to the vault for testing
  await weth
    .connect(user)
    .approve(await vault.getAddress(), wethDepositAmount, {
      from: userAddress,
    });
  const userDepositTx = await vault
    .connect(user)
    .depositAndCommit(
      await weth.getAddress(),
      wethDepositAmount,
      ethers.keccak256(ethers.toUtf8Bytes("userPublicKey")),
      { from: userAddress }
    );
  console.log(
    `✅ User deposited ${ethers.formatEther(
      wethDepositAmount
    )} WETH to ExecSwap vault`,
    `(tx: ${userDepositTx.hash})`
  );

  console.log("🎉 Deployment complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
