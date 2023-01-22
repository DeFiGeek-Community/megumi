/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    COVALENT_API_KEY: process.env.COVALENT_API_KEY,
  },
}

module.exports = nextConfig
