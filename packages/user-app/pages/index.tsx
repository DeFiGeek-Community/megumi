import Head from "next/head";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

export default function Home() {
  return (
    <>
      <Head>
        <title>Merkle-Airdrop-Tool</title>
        <meta name="description" content="Merkle-Airdrop-Tool" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <h1>Merkle-Airdrop-Tool</h1>
        <Box sx={{ p: 1, m: 1, display: "flex", justifyContent: "center" }}>
          <Button
            variant="contained"
            href="/create-merkle-tree-snapshot"
            sx={{ p: 1, m: 1 }}
          >
            Create merkle-tree by snapshot
          </Button>
          <Button
            variant="contained"
            href="/create-merkle-tree-manual"
            sx={{ p: 1, m: 1 }}
          >
            Create merkle-tree by manual
          </Button>
          <Button
            variant="contained"
            href="/regist-airdrop"
            sx={{ p: 1, m: 1 }}
          >
            Regist airdrop
          </Button>
          <Button variant="contained" href="/deposit-token" sx={{ p: 1, m: 1 }}>
            Deposit Token
          </Button>
          <Button variant="contained" href="/claim-airdrop" sx={{ p: 1, m: 1 }}>
            Claim Airdrop
          </Button>
        </Box>
      </main>
    </>
  );
}
