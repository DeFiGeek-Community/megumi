/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    COVALENT_API_KEY: process.env.COVALENT_API_KEY,
    INFURA_API_KEY: process.env.INFURA_API_KEY,
  },
  trailingSlash: true,
};

module.exports = nextConfig;
