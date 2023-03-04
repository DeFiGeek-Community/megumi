import { BigNumber, utils } from "ethers";
import BalanceTree from "./balance-tree";

const { isAddress, getAddress } = utils;

// This is the blob that gets distributed and pinned to IPFS.
// It is completely sufficient for recreating the entire merkle tree.
// Anyone can verify that all air drops are included in the tree,
// and the tree has no additional distributions.
interface MerkleDistributorInfo {
  merkleRoot: string;
  claims: {
    [account: string]: {
      index: number;
      amount: string;
      proof: string[];
    };
  };
}

type Format = { [account: string]: number | string };
type Format2 = { address: string; amount: BigNumber | string };

export function parseBalanceMap(
  balances: Format | Format2[]
): MerkleDistributorInfo {
  const FormatToFormat2: Format2[] = Array.isArray(balances)
    ? balances
    : Object.keys(balances).map(
        (account): Format2 => ({
          address: account,
          amount: balances[account].toString(),
        })
      );

  const dataByAddress = FormatToFormat2.reduce<{
    [address: string]: {
      amount: BigNumber;
    };
  }>((memo, { address: account, amount }) => {
    if (!isAddress(account)) {
      throw new Error(`Found invalid address: ${account}`);
    }
    const parsed = getAddress(account);
    if (memo[parsed]) throw new Error(`Duplicate address: ${parsed}`);
    const parsedNum = BigNumber.from(amount);
    if (parsedNum.lte(0)) return memo;

    memo[parsed] = { amount: parsedNum, ...{} };
    return memo;
  }, {});

  const sortedAddresses = Object.keys(dataByAddress).sort();

  // construct a tree
  const tree = new BalanceTree(
    sortedAddresses.map((address) => ({
      account: address,
      amount: dataByAddress[address].amount,
    }))
  );

  // generate claims
  const claims = sortedAddresses.reduce<{
    [address: string]: {
      amount: string;
      index: number;
      proof: string[];
    };
  }>((memo, address, index) => {
    const { amount } = dataByAddress[address];
    memo[address] = {
      index,
      amount: amount.toHexString(),
      proof: tree.getProof(index, address, amount),
      ...{},
    };
    return memo;
  }, {});

  return {
    merkleRoot: tree.getHexRoot(),
    claims,
  };
}
