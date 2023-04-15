const { ethers } = require("hardhat");
const { PERMIT2_ADDRESS } = require("@uniswap/permit2-sdk");

async function main() {
  const MerkleAirdrop = await ethers.getContractFactory("MerkleAirdrop");
  const merkleAirdrop = await MerkleAirdrop.deploy(PERMIT2_ADDRESS);

  await merkleAirdrop.deployed();

  console.log(`MerkleAirdrop deployed to ${merkleAirdrop.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
