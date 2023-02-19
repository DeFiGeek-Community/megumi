// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { parseBalanceMap } from '@/src/parse-balance-map'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
    if (req.method !== 'POST') {
        res.status(405).end()
        return
      }
    let merkletree = JSON.stringify(parseBalanceMap(req.body.data))
    const fs = require('fs')
    fs.writeFileSync( "public/merkletree/"+req.body.chainId+"/"+req.body.name+".json" , merkletree)
  res.status(200).end()
}
