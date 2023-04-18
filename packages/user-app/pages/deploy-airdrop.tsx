import { useMetaMask } from "metamask-react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Head from "next/head";
import { useCallback, useRef, useState } from "react";
import { BigNumber, ethers } from "ethers";
import { shortenAddress } from "@/src/util";

export default function CreateAirdrop() {
  const { status, connect, account, chainId } = useMetaMask();
  const { switchChain } = useMetaMask();

  const airdropNameRef = useRef<HTMLInputElement>(null);
  const airdropTokenAddressRef = useRef<HTMLInputElement>(null);
  const initialDepositAmountRef = useRef<HTMLInputElement>(null);

  const [airdropNameValue, setAirdropNameValue] = useState("");
  const [airdropTokenAddressValue, setAirdropTokenAddressValue] = useState("");
  const [initialDepositAmountValue, setInitialDepositAmountValue] =
    useState("0");

  const [airdropNameError, setAirdropNameError] = useState(false);
  const [airdropTokenAddressError, setAirdropTokenAddressError] =
    useState(false);
  const [initialDepositAmountError, setInitialDepositAmountError] =
    useState(false);
  const [deployReadyFlg, setDeployReadyFlg] = useState(false);

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

    let networks: Networks = {
      eth_mainnet: "0x1", // 1
      // Test nets
      eth_goerli: "0x5", // 5
      // Layers 2
      // arbitrum: "0xa4b1", // 42161
      // optimism: "0xa", // 10
      // Side chains
      // polygon_mainnet: "0x89", // 137
      // polygon_mumbai: "0x13881", // 80001
    };

    if (process.env.NODE_ENV === "development") {
      networks["local"] = "0x7a69"; // 31337
    }

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
          <ListItem key={-1}>
            <Typography>Switch Network</Typography>
          </ListItem>
          <Divider />
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

  const formValidation = (): boolean => {
    let valid = true;

    let v = airdropNameRef?.current;
    if (v) {
      v.setCustomValidity("");
      let ok = v.validity.valid;
      setAirdropNameError(!ok);
      if (!ok) {
        v.setCustomValidity("name is not valid");
      }
      valid &&= ok;
    }
    v = airdropTokenAddressRef?.current;
    if (v) {
      v.setCustomValidity("");
      let ok = v.validity.valid;
      ok &&= ethers.utils.isAddress(v.value);
      setAirdropTokenAddressError(!ok);
      if (!ok) {
        v.setCustomValidity("address is not valid");
      }
      valid &&= ok;
    }

    return valid;
  };

  const deployAirdropInfo = async () => {
    let response = await fetch(
      "/api/token/decimal?chainId=" +
        BigNumber.from(chainId).toString() +
        "&tokenAddress=" +
        airdropTokenAddressValue
    );
    let decimalResponse = (await response.json()) as decimalResponse;
    const decimal = decimalResponse.data;
  };

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
            <Stack>
              <Box
                sx={{
                  m: 2,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <Stack
                  sx={{
                    mt: 1,
                    width: 0.6,
                  }}
                >
                  <Grid
                    container
                    sx={{
                      m: 2,
                    }}
                    columnSpacing={{ xs: 2 }}
                  >
                    <Grid item xs={3}>
                      <Typography
                        sx={{
                          m: 2,
                        }}
                      >
                        Airdrop Name
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        id="airdrop-name"
                        variant="outlined"
                        required
                        defaultValue={airdropNameValue}
                        onChange={(e: OnChangeEvent) =>
                          setAirdropNameValue(e.target.value)
                        }
                        inputRef={airdropNameRef}
                        error={airdropNameError}
                        helperText={
                          airdropNameError &&
                          airdropNameRef?.current?.validationMessage
                        }
                      />
                    </Grid>
                  </Grid>
                  <Grid
                    container
                    sx={{
                      m: 2,
                    }}
                    columnSpacing={{ xs: 2 }}
                  >
                    <Grid item xs={3}>
                      <Typography
                        sx={{
                          m: 2,
                        }}
                      >
                        Airdrop Token Address
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        id="airdrop-token-address"
                        variant="outlined"
                        required
                        defaultValue={airdropTokenAddressValue}
                        onChange={(e: OnChangeEvent) =>
                          setAirdropTokenAddressValue(e.target.value)
                        }
                        inputRef={airdropTokenAddressRef}
                        error={airdropTokenAddressError}
                        helperText={
                          airdropTokenAddressError &&
                          airdropTokenAddressRef?.current?.validationMessage
                        }
                      />
                    </Grid>
                  </Grid>
                </Stack>
              </Box>
              <Box
                sx={{
                  p: 1,
                  m: 2,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <Button
                  variant="contained"
                  onClick={() => {
                    let valid = formValidation();
                    if (valid) {
                    }
                    setDeployReadyFlg(valid);
                  }}
                >
                  Deploy Airdrop
                </Button>
              </Box>
            </Stack>
          </>
        ) : (
          <Box sx={{ p: 1, m: 2, display: "flex", justifyContent: "center" }}>
            <Button variant="contained" onClick={connect} sx={{ p: 1, m: 2 }}>
              Connect to MetaMask
            </Button>
          </Box>
        )}
      </>
    </>
  );
}
