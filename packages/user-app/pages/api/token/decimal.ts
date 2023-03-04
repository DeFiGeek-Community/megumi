import type { NextApiRequest, NextApiResponse } from "next";
import { BigNumber, ethers, providers } from "ethers";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<decimalResponse>
) {
  const query = req.query;
  const { chainId, tokenAddress } = query;
  const decimalsAbi = [
    {
      constant: true,
      inputs: [],
      name: "decimals",
      outputs: [{ name: "", type: "uint8" }],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  ];
  const provider = new providers.InfuraProvider(
    BigNumber.from(chainId).toNumber(),
    process.env.INFURA_API_KEY as string
  );
  let tokenContract = new ethers.Contract(
    tokenAddress as string,
    decimalsAbi,
    provider
  );
  const decimals = await tokenContract.decimals();
  res.status(200).json({ data: decimals });
}
