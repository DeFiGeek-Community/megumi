import type { NextApiRequest, NextApiResponse } from "next";
import { BigNumber, ethers, providers } from "ethers";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<numberResponse>
) {
  const query = req.query;
  const { chainId, tokenAddress, owner, spender } = query;
  const allowanceAbi = [
    {
      "constant": true,
      "inputs": [
        {
          "name": "owner",
          "type": "address"
        },
        {
          "name": "spender",
          "type": "address"
        }
      ],
      "name": "allowance",
      "outputs": [
        {
          "name": "",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    }    
  ];
  const provider = new providers.InfuraProvider(
    BigNumber.from(chainId).toNumber(),
    process.env.INFURA_API_KEY as string
  );
  const tokenContract = new ethers.Contract(
    tokenAddress as string,
    allowanceAbi,
    provider
  );
  const allowance = await tokenContract.allowance(owner, spender);
  res.status(200).json({ data: allowance });
}
