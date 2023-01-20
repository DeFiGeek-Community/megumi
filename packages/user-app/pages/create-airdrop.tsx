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
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Head from "next/head";
import { useCallback, useRef, useState } from "react";

export default function CreateAirdrop() {
  const { status, connect, account, chainId, ethereum } = useMetaMask();
  const { switchChain } = useMetaMask();

  function shortenAddress(address: string | null) {
    if (address === null) {
      return "";
    } else {
      return address.substring(0, 6) + "..." + address.substring(38);
    }
  }

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

  const airdropTokenAddressRef = useRef<HTMLInputElement>(null);
  const snapshotTokenAddress1Ref = useRef<HTMLInputElement>(null);
  const snapshotTokenAddress2Ref = useRef<HTMLInputElement>(null);
  const snapshotTokenEfficient1Ref = useRef<HTMLInputElement>(null);
  const snapshotTokenEfficient2Ref = useRef<HTMLInputElement>(null);
  const snapshotBlockNumberRef = useRef<HTMLInputElement>(null);
  const excludedAddressListRef = useRef<HTMLInputElement>(null);
  const [airdropTokenAddressValue, setAirdropTokenAddressValue] = useState("");
  const [snapshotTokenAddress1Value, setSnapshotTokenAddress1Value] =
    useState("");
  const [snapshotTokenAddress2Value, setSnapshotTokenAddress2Value] =
    useState("");
  const [snapshotTokenEfficient1Value, setSnapshotTokenEfficient1Value] =
    useState("");
  const [snapshotTokenEfficient2Value, setSnapshotTokenEfficient2Value] =
    useState("");
  const [snapshotBlockNumberValue, setSnapshotBlockNumberValue] = useState("");
  const [excludedAddressListValue, setExcludedAddressListValue] = useState("");
  const [airdropTokenAddressError, setAirdropTokenAddressError] =
    useState(false);
  const [snapshotTokenAddress1Error, setSnapshotTokenAddress1Error] =
    useState(false);
  const [snapshotTokenAddress2Error, setSnapshotTokenAddress2Error] =
    useState(false);
  const [snapshotTokenEfficient1Error, setSnapshotTokenEfficient1Error] =
    useState(false);
  const [snapshotTokenEfficient2Error, setSnapshotTokenEfficient2Error] =
    useState(false);
  const [snapshotBlockNumberError, setSnapshotBlockNumberError] =
    useState(false);
  const [excludedAddressListError, setExcludedAddressListError] =
    useState(false);

  const formValidation = (): boolean => {
    let valid = true;

    let v = airdropTokenAddressRef?.current;
    if (v) {
      const ok = v.validity.valid;
      v.setCustomValidity("address is not valid");
      setAirdropTokenAddressError(!ok);
      valid &&= ok;
    }
    v = snapshotTokenAddress1Ref?.current;
    if (v) {
      const ok = v.validity.valid;
      setSnapshotTokenAddress1Error(!ok);
      valid &&= ok;
    }
    v = snapshotTokenAddress2Ref?.current;
    if (v) {
      const ok = v.validity.valid;
      setSnapshotTokenAddress2Error(!ok);
      valid &&= ok;
    }
    v = snapshotTokenEfficient1Ref?.current;
    if (v) {
      const ok = v.validity.valid;
      setSnapshotTokenAddress2Error(!ok);
      valid &&= ok;
    }
    v = snapshotTokenEfficient2Ref?.current;
    if (v) {
      const ok = v.validity.valid;
      setSnapshotTokenAddress2Error(!ok);
      valid &&= ok;
    }
    v = snapshotBlockNumberRef?.current;
    if (v) {
      const ok = v.validity.valid;
      setSnapshotTokenAddress2Error(!ok);
      valid &&= ok;
    }
    v = excludedAddressListRef?.current;
    if (v) {
      const ok = v.validity.valid;
      setSnapshotTokenAddress2Error(!ok);
      valid &&= ok;
    }

    return valid;
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
                  p: 1,
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
                  <Typography
                    sx={{
                      m: 2,
                    }}
                  >
                    Airdrop Token Address
                  </Typography>
                  <TextField
                    id="airdrop-token-address"
                    variant="outlined"
                    required
                    inputRef={airdropTokenAddressRef}
                    error={airdropTokenAddressError}
                    helperText={
                      airdropTokenAddressError &&
                      airdropTokenAddressRef?.current?.validationMessage
                    }
                  />
                  <Typography
                    sx={{
                      m: 2,
                    }}
                  >
                    Snapshot Token Address
                  </Typography>
                  <Grid
                    container
                    sx={{
                      mt: 1,
                    }}
                    columnSpacing={{ xs: 2 }}
                  >
                    <Grid item xs={8}>
                      <TextField
                        fullWidth
                        label="address"
                        id="snapshot-token-address-1"
                        variant="outlined"
                        required
                        inputRef={snapshotTokenAddress1Ref}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField
                        fullWidth
                        label="coefficient"
                        id="snapshot-token-coefficient-1"
                        variant="outlined"
                        required
                        defaultValue="1"
                        inputRef={snapshotTokenEfficient1Ref}
                      />
                    </Grid>
                  </Grid>
                  <Grid
                    container
                    sx={{
                      mt: 1,
                    }}
                    columnSpacing={{ xs: 2 }}
                  >
                    <Grid item xs={8}>
                      <TextField
                        fullWidth
                        label="address"
                        id="snapshot-token-address-2"
                        variant="outlined"
                        inputRef={snapshotTokenAddress2Ref}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField
                        fullWidth
                        label="coefficient"
                        id="snapshot-token-coefficient-2"
                        variant="outlined"
                        defaultValue="1"
                        inputRef={snapshotTokenEfficient2Ref}
                      />
                    </Grid>
                  </Grid>
                  <Typography
                    sx={{
                      m: 2,
                    }}
                  >
                    Snapshot Block Number
                  </Typography>
                  <TextField
                    id="snapshot-block-number"
                    variant="outlined"
                    required
                    sx={{
                      width: 0.2,
                    }}
                    inputRef={snapshotBlockNumberRef}
                  />
                  <Typography
                    sx={{
                      m: 2,
                    }}
                  >
                    Excluded Address List(Separated by commas or line breaks)
                  </Typography>
                  <TextField
                    id="excluded-address-list"
                    variant="outlined"
                    multiline
                    inputRef={excludedAddressListRef}
                  />
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
                    if (formValidation()) {
                      alert("OK!");
                    } else {
                      alert("no");
                    }
                  }}
                >
                  Create Airdrop List
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
