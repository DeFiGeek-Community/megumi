import { writeFileSync } from "fs";
import { ethers } from "hardhat";
import { SNAPSHOT_BLOCK, IGNORE_LIST } from "./settings";

type holdersResponseData = { address: string; balance: string }[];

const CHAIN_ID = 1;
const TOKEN_ADDRESS = "0x961dD84059505D59f82cE4fb87D3c09bec65301d";

const extractTokenBalance = async (
  snapshotTokenAddress: string,
  untilBlock: number
): Promise<{ [address: string]: bigint }> => {
  const responseJson = await fetchHolders(
    CHAIN_ID,
    snapshotTokenAddress,
    untilBlock
  );

  return responseJson.items.reduce(
    (
      acc: { [key: string]: string },
      data: { address: string; balance: string }
    ) => {
      if (!IGNORE_LIST.includes(data.address.toLowerCase())) {
        acc[ethers.getAddress(data.address)] = data.balance;
      }
      return acc;
    },
    {}
  );
};

async function fetchHolders(
  chainId: number,
  tokenAddress: string,
  snapshotBlockNumber: number
) {
  const BASE_URL = `https://api.covalenthq.com/v1/${chainId}/tokens/`;
  const TOKEN_HOLDERS_URL = "/token_holders/?";
  let param = new URLSearchParams({
    key: process.env.COVALENT_API_KEY as string,
    "block-height": `${snapshotBlockNumber}`,
    "page-size": "1000",
  });
  let response: holdersResponseData = [];
  let covRes;
  let pageNumber = 0;
  while (true) {
    param.set("page-number", pageNumber.toString());
    covRes = await fetch(
      BASE_URL + tokenAddress + TOKEN_HOLDERS_URL + param.toString()
    );
    if (covRes.ok) {
      covRes = await covRes.json();
      covRes = covRes.data;
      covRes.items.map((data: { address: string; balance: string }) => {
        response.push({ address: data.address, balance: data.balance });
      });
      if (covRes.pagination.has_more) {
        pageNumber += 1;
      } else {
        break;
      }
    } else {
      console.error(covRes);
      break;
    }
  }
  return covRes;
}

async function main() {
  const result = await extractTokenBalance(TOKEN_ADDRESS, SNAPSHOT_BLOCK);

  const sum = Object.values(result).reduce(
    (acc, string) => acc + BigInt(string),
    BigInt(0)
  );

  console.log("SUM: ", sum.toString());

  writeFileSync(
    "./scripts/snapshot_sample/temp/snapshot_txjp.json",
    JSON.stringify(result, null, 2)
  );
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
