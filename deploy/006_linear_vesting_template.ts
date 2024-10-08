import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { TemplateType } from "../scripts/types";
import {
  deploy,
  getFoundation,
  getContractAddress,
  existsDeployedContract,
  addTemplate,
} from "../scripts/deployUtil";

const codename = TemplateType.LINEAR_VESTING;

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { ethers, network } = hre;
  const { getContractFactory } = ethers;
  const foundation = await getFoundation();
  const factoryAddress = getContractAddress(network.name, "Factory");
  const feePoolAddress = getContractAddress(network.name, "FeePool");
  const distributorContractName = hre.network.tags.sender
    ? "DistributorSender"
    : "DistributorReceiver";
  const distributorAddress = getContractAddress(
    hre.network.name,
    distributorContractName
  );
  if (
    factoryAddress === null ||
    feePoolAddress === null ||
    distributorAddress === null
  ) {
    throw new Error("factory or feepool address is null");
  }

  let Template;
  if (!existsDeployedContract(network.name, codename)) {
    console.log(`${codename} is deploying with factory=${factoryAddress}...`);

    Template = await deploy(codename, {
      from: foundation,
      args: [factoryAddress, feePoolAddress, distributorAddress],
      log: true,
      getContractFactory,
      subdir: "templates",
    });
  } else {
    Template = (await getContractFactory(codename)).attach(
      getContractAddress(network.name, codename)
    );
    console.log(`${codename} is already deployed. skipping deploy...`);
  }

  try {
    await addTemplate(
      network.name,
      codename,
      factoryAddress,
      Template.target.toString()
    );
  } catch (e: any) {
    console.trace(e.message);
  }
};
export default func;
func.tags = [codename];
