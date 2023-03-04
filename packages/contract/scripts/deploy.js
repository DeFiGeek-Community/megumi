const { ethers } = require("hardhat");

async function main() {
  const MerkleAirdrop = await ethers.getContractFactory("MerkleAirdrop");
  const merkleAirdrop = await MerkleAirdrop.deploy();

  await merkleAirdrop.deployed();

  console.log(`MerkleAirdrop deployed to ${merkleAirdrop.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
