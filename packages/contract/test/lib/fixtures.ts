import { ethers } from "hardhat";

export async function deployFactoryAndFeePoolFixture() {
  const [owner, addr1, addr2] = await ethers.getSigners();

  const Factory = await ethers.getContractFactory("Factory");
  const factory = await Factory.deploy(owner.address);
  await factory.waitForDeployment();
  const FeePool = await ethers.getContractFactory("FeePool");
  const feePool = await FeePool.deploy(owner.address);
  await feePool.waitForDeployment();

  return { factory, feePool, owner, addr1, addr2 };
}
