import { network, run } from "hardhat";
import { readFileSync } from "fs";
import { TemplateType } from "../scripts/types";
import { getFoundation } from "./deployUtil";

async function main() {
  const basePath = `deployments/${network.name}/`;
  const foundation = await getFoundation();

  // Factory
  const factoryAddress = readFileSync(basePath + "Factory").toString();
  await run(`verify:verify`, {
    address: factoryAddress,
    constructorArguments: [foundation.address],
  });

  // FeePool
  const feePoolAddress = readFileSync(basePath + "FeePool").toString();
  await run(`verify:verify`, {
    address: feePoolAddress,
    constructorArguments: [foundation.address],
  });

  // Standard template
  const standardAddress = readFileSync(
    basePath + TemplateType.STANDARD
  ).toString();
  await run(`verify:verify`, {
    address: standardAddress,
    constructorArguments: [factoryAddress, feePoolAddress],
  });

  // LinearVesting template
  const linearVestingAddress = readFileSync(
    basePath + TemplateType.LINEAR_VESTING
  ).toString();
  await run(`verify:verify`, {
    address: linearVestingAddress,
    constructorArguments: [factoryAddress, feePoolAddress],
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
