# merkle-airdrop-tool

Megumi is a generic merkle-distributor contract that identifies airdrop information by name.

This repository is powered by [@uniswap/merkle-distributor](https://github.com/Uniswap/merkle-distributor)

# Local Development

The following assumes the use of `node@>=16`.

## Setup

- copy `.env.sample` and rename as `.env`.
- get APIKey from [covalent](https://www.covalenthq.com/) and set the value to COVALENT_API_KEY in `.env`.
- get APIKey from [etherscan](https://etherscan.io/) and set the value to ETHERSCAN_API_KEY in `.env`.
- get APIKey from [infura](https://www.infura.io/) and set the value to INFURA_API_KEY in `.env`.

## Install Dependencies

```bash
npm i
```

## Generate type files

```bash
npx hardhat typechain
```

## Run tests for contracts

```bash
npm run test
```
