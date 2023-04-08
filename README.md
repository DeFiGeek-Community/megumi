# merkle-airdrop-tool

merkle-airdrop-tool is a generic merkle-distributor contract that identifies airdrop information by name.

This repository is powered by [@uniswap/merkle-distributor](https://github.com/Uniswap/merkle-distributor) and [@uniswap/permit2](https://github.com/Uniswap/permit2).

# Local Development

The following assumes the use of `node@>=16`.

## Setup

- copy `.env.sample` and rename as `.env`.
- get APIKey from [covalent](https://www.covalenthq.com/) and set the value to COVALENT_API_KEY in `.env`.
- get APIKey from [etherscan](https://etherscan.io/) and set the value to ETHERSCAN_API_KEY in `.env`.
- get APIKey from [infura](https://www.infura.io/) and set the value to INFURA_API_KEY in `.env`.

## Install Dependencies

`npm i`

## Run interface

`npm run user-app-dev`
