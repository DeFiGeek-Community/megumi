import { ethers } from "hardhat";
import { writeFileSync } from "fs";
import pndABI from "./abi/pndCJPY.json";
import { SNAPSHOT_BLOCK, IGNORE_LIST } from "./settings";

const NETWORK = "mainnet";
const PND_ADDRESS = "0xAA59F501c92092E624D30Cff77eAFf5EA4E7BfA2";
const START_BLOCK = 18434542; // Deployed at this block
const TOKEN_ADDRESS = "0x961dD84059505D59f82cE4fb87D3c09bec65301d";

async function getEventsUntilBlock(
  contractAddress: string,
  abi: any,
  startBlock: number,
  untilBlock: number
) {
  const provider = new ethers.AlchemyProvider(
    NETWORK,
    process.env.ALCHEMY_API_KEY
  );
  const Pnd = new ethers.Contract(contractAddress, abi, provider);
  const withdrawFilter = Pnd.filters.WithdrawCollateral();
  const supplyFilter = Pnd.filters.SupplyCollateral();
  const withdrawEvents = await Pnd.queryFilter(
    withdrawFilter,
    startBlock,
    untilBlock
  );
  const supplyEvents = await Pnd.queryFilter(
    supplyFilter,
    startBlock,
    untilBlock
  );

  return { withdrawEvents, supplyEvents };
}

async function main() {
  const abi = pndABI;
  const { withdrawEvents, supplyEvents } = await getEventsUntilBlock(
    PND_ADDRESS,
    abi,
    START_BLOCK,
    SNAPSHOT_BLOCK
  );

  const pndCollateralizedTXJPBalanceByAddress: {
    [key: string]: bigint;
  } = {};

  // Supply events
  for (const i in supplyEvents) {
    if (!supplyEvents[i].args) continue;
    if (supplyEvents[i].args.asset !== TOKEN_ADDRESS) {
      console.info("[INFO] Not a target token. Skip...");
      continue;
    }
    if (supplyEvents[i].args.from !== supplyEvents[i].args.dest) {
      console.warn("[WARN] dest address is not same as from address");
    }

    pndCollateralizedTXJPBalanceByAddress[supplyEvents[i].args.from] =
      supplyEvents[i].args.dst in pndCollateralizedTXJPBalanceByAddress
        ? pndCollateralizedTXJPBalanceByAddress[supplyEvents[i].args.dst] +
          supplyEvents[i].args.amount
        : supplyEvents[i].args.amount;
  }

  // Withdraw events
  for (const i in withdrawEvents) {
    if (!withdrawEvents[i].args) continue;
    if (withdrawEvents[i].args.asset !== TOKEN_ADDRESS) {
      console.info("[INFO] Not a target. Skip...");
      continue;
    }
    if (withdrawEvents[i].args.src !== withdrawEvents[i].args.to) {
      console.warn("[WARN] src address is not same as to address");
    }
    if (!(withdrawEvents[i].args.src in pndCollateralizedTXJPBalanceByAddress))
      throw Error("Address not found");
    pndCollateralizedTXJPBalanceByAddress[withdrawEvents[i].args.src] =
      pndCollateralizedTXJPBalanceByAddress[withdrawEvents[i].args.src] -
      withdrawEvents[i].args.amount;
  }

  const sum1 = Object.values(pndCollateralizedTXJPBalanceByAddress).reduce(
    (acc, balance) => acc + balance,
    0n
  );

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(
    pndCollateralizedTXJPBalanceByAddress
  )) {
    if (!IGNORE_LIST.includes(key.toLowerCase()) && value > 0)
      result[key] = value.toString();
  }

  const sum2 = Object.values(result).reduce(
    (acc, balance) => acc + BigInt(balance),
    0n
  );

  console.log("SUM: ", sum1.toString(), sum2.toString());

  writeFileSync(
    "./scripts/snapshot_sample/temp/snapshot_pnd_txjp.json",
    JSON.stringify(result, null, 2)
  );
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
