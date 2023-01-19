import { useMetaMask } from "metamask-react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import Head from "next/head";
import { useCallback, useState } from "react";

export default function CreateAirdrop() {
  const { status, connect, account, chainId, ethereum } = useMetaMask();
  const { switchChain } = useMetaMask();

  function ChainButton() {
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const open = Boolean(anchorEl);
    const id = open ? "simple-popover" : undefined;
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
      setAnchorEl(null);
    };

    type Networks = {
      [key: string]: string;
    };

    const networks: Networks = {
      mainnet: "0x1", // 1
      // Test nets
      goerli: "0x5", // 5
      // Layers 2
      arbitrum: "0xa4b1", // 42161
      optimism: "0xa", // 10
      // Side chains
      polygon: "0x89", // 137
      mumbai: "0x13881", // 80001
    };

    const getKeyByValue = useCallback(
      (value: any) => {
        return Object.keys(networks).reduce((r, k) => {
          return networks[k] == value ? k : r;
        }, "unknown network");
      },
      [chainId]
    );

    function NetworksButtonList() {
      return (
        <List>
          {Object.keys(networks).map((key, index) => {
            return (
              <ListItem key={index}>
                <Button onClick={() => switchChain(networks[key])}>
                  {key}
                </Button>
              </ListItem>
            );
          })}
        </List>
      );
    }

    return (
      <>
        <Button
          aria-describedby={id}
          variant="contained"
          onClick={handleClick}
          color="info"
        >
          <>{getKeyByValue(chainId)}</>
        </Button>
        <>
          <Popover
            id={id}
            open={open}
            anchorEl={anchorEl}
            onClose={handleClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "left",
            }}
          >
            <>
              <NetworksButtonList />
            </>
          </Popover>
        </>
      </>
    );
  }

  function AppBarStatus() {
    return (
      <>
        <AppBar position="static">
          <Box sx={{ m: 1, display: "flex", justifyContent: "flex-end" }}>
            <Box sx={{ m: 1 }}>
              <ChainButton />
            </Box>
            <Box
              sx={{
                m: 1,
                display: "flex",
                alignItems: "flex-end",
                flexDirection: "column",
              }}
            >
              <Typography>Connected as</Typography>
              <Typography>{shortenAddress(account)}</Typography>
            </Box>
          </Box>
        </AppBar>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Merkle-Airdrop-Tool</title>
        <meta name="description" content="Merkle-Airdrop-Tool" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <>
        {status === "connected" ? (
          <>
            <AppBarStatus />
            <Box
              sx={{ p: 1, m: 1, display: "flex", justifyContent: "center" }}
            ></Box>
          </>
        ) : (
          <Box sx={{ p: 1, m: 1, display: "flex", justifyContent: "center" }}>
            <Button variant="contained" onClick={connect} sx={{ p: 1, m: 1 }}>
              Connect to MetaMask
            </Button>
          </Box>
        )}
      </>
    </>
  );
}

function shortenAddress(address: string | null) {
  if (address === null) {
    return "";
  } else {
    return address.substring(0, 6) + "..." + address.substring(38);
  }
}
