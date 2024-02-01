import { network, run } from "hardhat";
import { readFileSync } from "fs";
import { TemplateType } from "../scripts/types";

async function main() {
  const basePath = `deployments/${network.name}/`;

  // Factory
  const factoryAddress = readFileSync(basePath + "Factory").toString();
  await run(`verify:verify`, {
    address: factoryAddress,
  });

  // FeePool
  const feePoolAddress = readFileSync(basePath + "FeePool").toString();
  await run(`verify:verify`, {
    address: feePoolAddress,
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
