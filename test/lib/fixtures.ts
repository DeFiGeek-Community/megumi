import { ethers } from "hardhat";
import { deployCCIPRouter } from "./scenarioHelper";

/**
 * Deploy Factory, FeePool and Distributor contracts
 */
export async function deployFactoryAndFeePoolFixture() {
  const [owner, addr1, addr2] = await ethers.getSigners();

  const Factory = await ethers.getContractFactory("Factory");
  const factory = await Factory.deploy(owner.address);
  await factory.waitForDeployment();
  const FeePool = await ethers.getContractFactory("FeePool");
  const feePool = await FeePool.deploy(owner.address);
  await feePool.waitForDeployment();

  const MGM = await ethers.getContractFactory("TestERC20");
  const mgm = await MGM.deploy("Megumi", "MGM", ethers.parseEther("50000000"));
  await mgm.waitForDeployment();

  const {
    chainSelector,
    sourceRouter,
    destinationRouter,
    wrappedNative,
    linkToken,
  } = await deployCCIPRouter(owner.address);

  const DistributorSender = await ethers.getContractFactory(
    "DistributorSender"
  );
  const distributorSender = await DistributorSender.deploy(
    factory.target,
    sourceRouter,
    owner.address
  );
  await distributorSender.waitForDeployment();

  const DistributorReceiver = await ethers.getContractFactory(
    "DistributorReceiver"
  );
  const distributorReceiver = await DistributorReceiver.deploy(
    factory.target,
    destinationRouter,
    owner.address
  );
  await distributorReceiver.waitForDeployment();

  return {
    factory,
    feePool,
    chainSelector,
    distributorSender,
    distributorReceiver,
    wrappedNative,
    linkToken,
    mgm,
    owner,
    addr1,
    addr2,
  };
}
