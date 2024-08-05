import { readFileSync, writeFileSync } from "fs";

const BOTTOM_THRESHOLD = 1000000;

async function main() {
  const pndTxjpBalanceRaw = readFileSync(
    "./scripts/snapshot_sample/temp/snapshot_pnd_txjp.json",
    "utf8"
  );
  const pndTxjpBalance = JSON.parse(pndTxjpBalanceRaw);

  const txjpBalanceRaw = readFileSync(
    "./scripts/snapshot_sample/temp/snapshot_txjp.json",
    "utf8"
  );
  const txjpBalance = JSON.parse(txjpBalanceRaw);

  const result: { [key: string]: string } = { ...pndTxjpBalance };

  for (const key in txjpBalance) {
    if (result.hasOwnProperty(key)) {
      const sum = parseInt(result[key]) + parseInt(txjpBalance[key]);
      if (sum < BOTTOM_THRESHOLD) continue;
      result[key] = (
        parseInt(result[key]) + parseInt(txjpBalance[key])
      ).toString();
    } else {
      if (txjpBalance[key] < BOTTOM_THRESHOLD) continue;
      result[key] = txjpBalance[key];
    }
  }

  const sum = Object.values(result).reduce(
    (acc, string) => acc + BigInt(string),
    0n
  );

  console.log("SUM: ", sum.toString());

  writeFileSync(
    "./scripts/snapshot_sample/temp/snapshot_merge.json",
    JSON.stringify(result, null, 2)
  );
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
