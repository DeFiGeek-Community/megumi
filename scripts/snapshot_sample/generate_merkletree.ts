import { parseBalanceMap } from "../../../user-app/src/parse-balance-map";
import { readFileSync, writeFileSync } from "fs";

async function main() {
  const AIRDROP_AMOUNT = 50000000000000000000000000n;
  const balanceDataRaw = readFileSync(
    "./scripts/snapshot_sample/temp/snapshot_merge.json",
    "utf8"
  );
  const balanceData: { [key: string]: string } = JSON.parse(balanceDataRaw);
  const sum = Object.values(balanceData).reduce(
    (acc, string) => acc + BigInt(string),
    0n
  );
  console.log("sum: ", sum.toString());
  const allocationData: { [key: string]: string } = { ...balanceData };
  for (const key in allocationData) {
    if (allocationData.hasOwnProperty(key)) {
      const allocation = (BigInt(allocationData[key]) * AIRDROP_AMOUNT) / sum;
      allocationData[key] = allocation.toString();
    }
  }
  const accutualAirdropAmount = Object.values(allocationData).reduce(
    (acc, string) => acc + BigInt(string),
    0n
  );
  const merkleTree = parseBalanceMap(
    accutualAirdropAmount.toString(),
    allocationData
  );

  console.log("merkleTree: ", merkleTree);

  writeFileSync(
    "./scripts/snapshot_sample/temp/merkletree.json",
    JSON.stringify(merkleTree, null, 2)
  );
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
