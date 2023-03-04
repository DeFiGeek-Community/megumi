import type { NextApiRequest, NextApiResponse } from "next";

type holdersResponseData = { address: string; balance: string }[];
type holdersResponse = { data: holdersResponseData };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<holdersResponse>
) {
  const query = req.query;
  const { chainId, tokenAddress, blockNumber } = query;
  const BASE_URL = "https://api.covalenthq.com/v1/" + chainId + "/tokens/";
  const TOKEN_HOLDERS_URL = "/token_holders/?";
  let param = new URLSearchParams({
    key: process.env.COVALENT_API_KEY as string,
    "block-height": blockNumber as string,
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
  res.status(200).json({ data: response });
}
