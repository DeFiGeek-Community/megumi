import { readFileSync, writeFileSync } from "fs";

async function main() {
  const merkleTreeFile = readFileSync(
    "./scripts/snapshot_sample/temp/merkletree.json",
    "utf8"
  );
  const merkleTree = JSON.parse(merkleTreeFile);

  const claims = merkleTree.claims;
  const tsvArray = [];

  for (const [address, data] of Object.entries(claims)) {
    const proofString = data.proof.join(",");
    tsvArray.push(
      `${address}\t${data.index}\t${data.amount}\t${BigInt(
        data.amount
      )}\t${proofString}`
    );
  }

  const tsvString = tsvArray.join("\n");

  writeFileSync(
    "./scripts/snapshot_sample/temp/claim_data.tsv",
    tsvString,
    "utf8"
  );
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
