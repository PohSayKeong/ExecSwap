import { expect } from "chai";
import { network } from "hardhat";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/types";
import type { ExecSwap, TestToken } from "../typechain-types/index.js";

const { ethers } = await network.connect();
describe("ExecSwap", function () {
  let vault: ExecSwap;
  let token: TestToken;
  let owner: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let withdrawer: HardhatEthersSigner;

  beforeEach(async () => {
    [owner, user, withdrawer] = await ethers.getSigners();

    // Deploy a mock ERC20
    const Token = await ethers.getContractFactory("TestToken");
    token = await Token.deploy("TestToken", "TT", 18);
    await token.waitForDeployment();

    // Deploy the ExecSwap contract
    const Vault = await ethers.getContractFactory("ExecSwap");
    vault = (await Vault.deploy()) as unknown as ExecSwap;
    await vault.waitForDeployment();

    // Mint tokens to user
    await token.mint(user.address, ethers.parseEther("1000"));
  });

  it("should allow a user to deposit and record a commitment", async () => {
    const amount = ethers.parseEther("10");
    const ownerPk = ethers.toUtf8Bytes("userPublicKey1");
    const ownerhash = ethers.keccak256(ownerPk);
    const commitment = ethers.keccak256(
      ethers.solidityPacked(
        ["uint256", "address", "bytes32"],
        [amount, await token.getAddress(), ownerhash]
      )
    );

    await token.connect(user).approve(await vault.getAddress(), amount);

    await expect(
      vault
        .connect(user)
        .depositAndCommit(await token.getAddress(), amount, ownerhash)
    )
      .to.emit(vault, "Deposit")
      .withArgs(
        user.address,
        await token.getAddress(),
        amount,
        ownerhash,
        commitment
      );

    expect(await vault.commitments(commitment)).to.equal(true);
  });

  it("should not allow duplicate commitments", async () => {
    const amount = ethers.parseEther("10");
    const ownerPk = ethers.toUtf8Bytes("userPublicKey1");
    const ownerhash = ethers.keccak256(ownerPk);

    await token.connect(user).approve(await vault.getAddress(), amount);

    await vault
      .connect(user)
      .depositAndCommit(await token.getAddress(), amount, ownerhash);

    await token.connect(user).approve(await vault.getAddress(), amount);

    // Attempting to deposit the same commitment again should fail
    await expect(
      vault
        .connect(user)
        .depositAndCommit(await token.getAddress(), amount, ownerhash)
    ).to.be.revertedWith("commitment exists");
  });

  it("should allow owner to nullify commitments with owner secret", async () => {
    const amount = ethers.parseEther("5");
    const ownerPk = ethers.toUtf8Bytes("userPublicKey1");
    const ownerhash = ethers.keccak256(ownerPk);
    const otherOwnerPk = ethers.toUtf8Bytes("userPublicKey2");
    const otherOwnerhash = ethers.keccak256(otherOwnerPk);

    await token.connect(user).approve(await vault.getAddress(), amount);
    await vault
      .connect(user)
      .depositAndCommit(await token.getAddress(), amount, ownerhash);

    const commitment = ethers.keccak256(
      ethers.solidityPacked(
        ["uint256", "address", "bytes32"],
        [amount, await token.getAddress(), ownerhash]
      )
    );
    const newCommitment = ethers.keccak256(
      ethers.solidityPacked(
        ["uint256", "address", "bytes32"],
        [amount, await token.getAddress(), otherOwnerhash]
      )
    );

    expect(await vault.commitments(commitment)).to.equal(true);

    // Nullify using owner secret
    await vault
      .connect(owner)
      .updateCommitment(
        [newCommitment],
        [amount],
        [await token.getAddress()],
        [ownerPk]
      );

    expect(await vault.commitments(commitment)).to.equal(false);
    expect(await vault.commitments(newCommitment)).to.equal(true);
  });

  it("should withdraw correctly when given valid commitments", async () => {
    const amount = ethers.parseEther("5");
    const ownerPk = ethers.toUtf8Bytes("userPublicKey1");
    const ownerhash = ethers.keccak256(ownerPk);

    await token.connect(user).approve(await vault.getAddress(), amount);
    await vault
      .connect(user)
      .depositAndCommit(await token.getAddress(), amount, ownerhash);

    const beforeBal = await token.balanceOf(withdrawer.address);

    await expect(
      vault
        .connect(user)
        .withdraw(
          [amount],
          await token.getAddress(),
          [ownerhash],
          ownerPk,
          withdrawer.address
        )
    )
      .to.emit(vault, "Withdraw")
      .withArgs(
        withdrawer.address,
        await token.getAddress(),
        amount,
        ownerhash
      );

    const afterBal = await token.balanceOf(withdrawer.address);
    expect(afterBal - beforeBal).to.equal(amount);
  });

  it("should revert on reused (spent) commitments", async () => {
    const amount = ethers.parseEther("5");
    const ownerPk = ethers.toUtf8Bytes("userPublicKey1");
    const ownerhash = ethers.keccak256(ownerPk);

    await token.connect(user).approve(await vault.getAddress(), amount);
    await vault
      .connect(user)
      .depositAndCommit(await token.getAddress(), amount, ownerhash);

    // first withdrawal works
    await vault
      .connect(user)
      .withdraw(
        [amount],
        await token.getAddress(),
        [ownerhash],
        ownerPk,
        withdrawer.address
      );

    // reusing same commitment fails
    await expect(
      vault
        .connect(user)
        .withdraw(
          [amount],
          await token.getAddress(),
          [ownerhash],
          ownerPk,
          withdrawer.address
        )
    ).to.be.revertedWith("commitment spent");
  });
});
