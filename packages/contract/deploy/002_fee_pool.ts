import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import {
  deploy,
  existsDeployedContract,
  getFoundation,
} from "../scripts/deployUtil";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  if (existsDeployedContract(hre.network.name, "FeePool")) {
    console.log(`FeePool is already deployed. skipping deploy...`);
    return;
  }

  const { ethers } = hre;
  const { getContractFactory } = ethers;
  const foundation = await getFoundation();

  await deploy("FeePool", {
    from: foundation,
    args: [],
    log: true,
    getContractFactory,
  });
};
export default func;
func.tags = ["FeePool"];