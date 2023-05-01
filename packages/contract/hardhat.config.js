require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
require("dotenv").config();

const { INFURA_KEY, ETHERSCAN_API_KEY, PRIVATE_KEY } = process.env;

module.exports = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 100000,
      },
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
      accounts: [`${PRIVATE_KEY}`],
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${INFURA_KEY}`,
      accounts: [`${PRIVATE_KEY}`],
    },
    hardhat: {
      forking: {
        url: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
      },
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  gasReporter: {
    enabled: true,
  },
};
