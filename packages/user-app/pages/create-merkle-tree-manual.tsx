import { useMetaMask } from "metamask-react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Head from "next/head";
import { useCallback, useRef, useState } from "react";
import { BigNumber, ethers } from "ethers";

import { downloadMerkleTreeJson, shortenAddress } from "@/src/util";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";

export default function CreateAirdrop() {
  const { status, connect, account, chainId } = useMetaMask();
  const { switchChain } = useMetaMask();

  const airdropAddressAmountListRef = useRef<HTMLInputElement>(null);
  const [airdropAddressAmountListValue, setAirdropAddressAmountListValue] =
    useState("");
  const [airdropAddressAmountListError, setAirdropAddressAmountListError] =
    useState(false);

  const [airdropList, setAirdropList] = useState<airdropListData[]>([]);
  const [ttlAirdropAmount, setTtlAirdropAmount] = useState("");
  const [validateFlg, setValidateFlg] = useState(false);

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

  function AirdropcalculatedList() {
    return (
      <>
        {validateFlg ? (
          <Box sx={{ width: 0.7 }}>
            <Stack>
              <Box sx={{ display: "flex", justifyContent: "start" }}>
                <TableContainer
                  sx={{
                    m: 2,
                    width: 0.6,
                    maxHeight: 500,
                  }}
                >
                  <Table aria-label="simple table" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell colSpan={2}>Airdrop Amount</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Address</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {airdropList.map((elm, index) => (
                        <TableRow key={index}>
                          <TableCell component="th" scope="row">
                            {elm.address}
                          </TableCell>
                          <TableCell align="right">
                            {elm.amount.toString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
              <Typography
                sx={{
                  m: 2,
                }}
              >
                Calcurated Total Airdrop Amount : {ttlAirdropAmount}
              </Typography>
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
                    downloadMerkleTreeJson(ttlAirdropAmount, airdropList);
                  }}
                >
                  Download Merkletree
                </Button>
              </Box>
            </Stack>
          </Box>
        ) : (
          <></>
        )}
      </>
    );
  }
  const formValidation = (): boolean => {
    let valid = true;
    let errorText = "";

    let v = airdropAddressAmountListRef?.current;
    if (v) {
      v.setCustomValidity("");
      let ok = v.validity.valid;
      if (v.value !== "") {
        let spl = v.value.split(/\r?\n/);
        for (let i = 0; i < spl.length; i++) {
          ok &&= spl[i].includes(",");
          if (ok) {
            let result: string[] = spl[i].split(",");
            ok &&= result.length === 2;
            if (!ok) {
              errorText = "each line must contain two elements";
              break;
            }
            ok &&= result[0] !== "" && result[1] !== "";
            if (!ok) {
              errorText = "address and/or amount is a blank character";
              break;
            }
            ok &&= ethers.utils.isAddress(result[0]);
            if (!ok) {
              errorText = "address is not valid";
              break;
            }
            ok &&= !Number.isNaN(result[1]);
            if (!ok) {
              errorText = "amount is only number";
              break;
            }
            ok &&= Number.isInteger(Number(result[1]));
            if (!ok) {
              errorText = "amount is only integer";
              break;
            }
          } else {
            errorText = "string does not contain a comma";
            break;
          }
        }
      }
      setAirdropAddressAmountListError(!ok);
      if (!ok) {
        v.setCustomValidity(errorText);
      }
      valid &&= ok;
    }
    return valid;
  };

  const generateAirdropList = async () => {
    setValidateFlg(false);

    if (chainId == null) {
      return;
    }
    let snapshotAmountDict: { [address: string]: BigNumber } = {};
    let airdropAmountList: airdropListData[] = [];
    let ttlAirdropAmount = BigNumber.from(0);

    let v = airdropAddressAmountListRef?.current;
    if (v) {
      v.setCustomValidity("");
      let ok = v.validity.valid;
      if (v.value !== "") {
        let spl = v.value.split(/\r?\n/);
        spl.forEach(function (elm) {
          let result: string[] = elm.split(",");
          snapshotAmountDict[result[0]] = BigNumber.from(result[1]);
        });

        let snapshotAmountList = Object.entries(snapshotAmountDict).sort(
          (p1, p2) => {
            let p1Key = p1[0];
            let p2Key = p2[0];
            if (p1Key < p2Key) {
              return -1;
            }
            if (p1Key > p2Key) {
              return 1;
            }
            return 0;
          }
        );

        snapshotAmountList.map((elm) => {
          ttlAirdropAmount = ttlAirdropAmount.add(elm[1]);
          airdropAmountList.push({ address: elm[0], amount: elm[1] });
        });

        setAirdropList(airdropAmountList);
        setTtlAirdropAmount(ttlAirdropAmount.toString());
        setValidateFlg(true);
      }
    }
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
                    width: 0.7,
                  }}
                >
                  <Typography
                    sx={{
                      m: 2,
                    }}
                  >
                    Airdrop List (Separated by line breaks)
                    <br />
                    <br />
                    Enter one line at a time in the following order: <br />
                    address,amount
                    <br />
                    Don't forget the comma(,) between the address and the
                    amount!
                    <br />
                    <br />
                    (Input Example)
                    <br />
                    0x999...111,100
                    <br />
                    0x111...999,200
                    <br />
                    ...
                    <br />
                  </Typography>
                  <TextField
                    id="excluded-address-list"
                    variant="outlined"
                    multiline
                    sx={{
                      width: 0.6,
                    }}
                    defaultValue={airdropAddressAmountListValue}
                    onChange={(e: OnChangeEvent) =>
                      setAirdropAddressAmountListValue(e.target.value)
                    }
                    inputRef={airdropAddressAmountListRef}
                    error={airdropAddressAmountListError}
                    helperText={
                      airdropAddressAmountListError &&
                      airdropAddressAmountListRef?.current?.validationMessage
                    }
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
                      generateAirdropList();
                    }
                  }}
                >
                  Create Airdrop List
                </Button>
              </Box>
              <Box
                sx={{
                  p: 1,
                  m: 2,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <AirdropcalculatedList />
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
