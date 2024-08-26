import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import "dotenv/config";

const { INFURA_KEY, ETHERSCAN_API_KEY, PRIVATE_KEY } = process.env;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
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
      tags: ["receiver"],
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_KEY}`,
      accounts: [`${PRIVATE_KEY}`],
      tags: ["receiver"],
    },
    base_sepolia: {
      url: `https://sepolia.base.org`,
      chainId: 84532,
      accounts: [`${PRIVATE_KEY}`],
      tags: ["sender"],
    },
    base_mainnet: {
      url: `https://mainnet.base.org`,
      chainId: 8453,
      accounts: [`${PRIVATE_KEY}`],
      tags: ["sender"],
    },
    hardhat: {
      forking: {
        url: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
      },
      tags: ["receiver"],
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  gasReporter: {
    enabled: true,
  },
};
export default config;
