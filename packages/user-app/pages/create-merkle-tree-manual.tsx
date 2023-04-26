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

  const airdropTokenAmountRef = useRef<HTMLInputElement>(null);
  const snapshotTokenAddress1Ref = useRef<HTMLInputElement>(null);
  const snapshotTokenAddress2Ref = useRef<HTMLInputElement>(null);
  const snapshotTokenCoefficient1Ref = useRef<HTMLInputElement>(null);
  const snapshotTokenCoefficient2Ref = useRef<HTMLInputElement>(null);
  const snapshotBlockNumberRef = useRef<HTMLInputElement>(null);
  const excludedAddressListRef = useRef<HTMLInputElement>(null);
  const airdropAddressAmountListRef = useRef<HTMLInputElement>(null);

  const [airdropTokenAmountValue, setAirdropTokenAmountValue] = useState("");
  const [snapshotTokenAddress1Value, setSnapshotTokenAddress1Value] =
    useState("");
  const [snapshotTokenAddress2Value, setSnapshotTokenAddress2Value] =
    useState("");
  const [snapshotTokenCoefficient1Value, setSnapshotTokenCoefficient1Value] =
    useState("1");
  const [snapshotTokenCoefficient2Value, setSnapshotTokenCoefficient2Value] =
    useState("1");
  const [snapshotBlockNumberValue, setSnapshotBlockNumberValue] = useState("");
  const [excludedAddressListValue, setExcludedAddressListValue] = useState("");
  const [airdropAddressAmountListValue, setAirdropAddressAmountListValue] = useState("");

  const [airdropTokenAmountError, setAirdropTokenAmountError] = useState(false);
  const [snapshotTokenAddress1Error, setSnapshotTokenAddress1Error] =
    useState(false);
  const [snapshotTokenAddress2Error, setSnapshotTokenAddress2Error] =
    useState(false);
  const [snapshotTokenCoefficient1Error, setSnapshotTokenCoefficient1Error] =
    useState(false);
  const [snapshotTokenCoefficient2Error, setSnapshotTokenCoefficient2Error] =
    useState(false);
  const [snapshotBlockNumberError, setSnapshotBlockNumberError] =
    useState(false);
  const [excludedAddressListError, setExcludedAddressListError] =
    useState(false);
  const [airdropAddressAmountListError, setAirdropAddressAmountListError] =
    useState(false);

  const [snapshotList, setSnaphshotList] = useState<[string, BigNumber][]>([]);
  const [airdropList, setAirdropList] = useState<airdropListData[]>([]);
  const [ttlAirdropAmount, setTtlAirdropAmount] = useState("");
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

  function AirdropcalculatedList() {
    return (
      <>
        {deployReadyFlg ? (
          <Box sx={{ width: 0.7 }}>
            <Stack>
              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <TableContainer
                  sx={{
                    m: 2,
                    width: 0.4,
                    height: 500,
                  }}
                >
                  <Table aria-label="simple table" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell colSpan={2}>Snapshot Amount</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Address</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {snapshotList.map((elm, index) => (
                        <TableRow key={index}>
                          <TableCell component="th" scope="row">
                            {elm[0]}
                          </TableCell>
                          <TableCell align="right">
                            {elm[1].toString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TableContainer
                  sx={{
                    m: 2,
                    width: 0.4,
                    height: 500,
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
        //,が文字列に含まれているか判定
        //含まれていれば,で分割をする
        //,で分割したものの要素数が2か判定
        //,で分けたときに前半と後半の文字列がどちらも空文字でないか判定
        //,で分けたときに前半の文字列がアドレスになっているか判定
        //,で分けたときに後半の文字列が数値になっているか判定
        //,で分けたときに後半の文字列が整数か判定
        spl.forEach(function (elm) {
          ok &&= elm.includes(',');
          if (ok) {
            let result: string[] = elm.split(',');
            ok &&= result.length === 2;
            if (!ok) { errorText = "each line must contain two elements"; }
            ok &&= result[0] !== "" && result[1] !== "";
            if (!ok) { errorText = "address and/or amount is a blank character"; }
            ok &&= ethers.utils.isAddress(result[0]);
            if (!ok) { errorText = "address is not valid"; }
            ok &&= !Number.isNaN(result[1]);
            if (!ok) { errorText = "amount is only number"; }
            ok &&= Number.isInteger(result[1]);
            if (!ok) { errorText = "amount is only integer"; }
          }
          else { errorText = "string does not contain a comma"; }
        });
      }
      setAirdropAddressAmountListError(!ok);
      if (!ok) {
        v.setCustomValidity(errorText);
      }
      valid &&= ok;
    }
    /*let v = airdropAddressAmountListRef?.current;
    if (v) {
      v.setCustomValidity("");
      let ok = v.validity.valid;
      if (v.value !== "") {
        let spl = v.value.split(/\r?\n/);
        spl.forEach(function (elm) {
          ok &&= elm.includes(',');
        });
      }
      setAirdropAddressAmountListError(!ok);
      if (!ok) {
        v.setCustomValidity("string does not contain a comma");
      }
      valid &&= ok;
    }
    if (valid) {
      if (v) {
        v.setCustomValidity("");
        let ok = v.validity.valid;
        if (v.value !== "") {
          let spl = v.value.split(/\r?\n/);
          spl.forEach(function (elm) {
            let result: string[] = elm.split(',');
            ok &&= result.length === 2;
          });
        }
        setAirdropAddressAmountListError(!ok);
        if (!ok) {
          v.setCustomValidity("each line must contain two elements");
        }
        valid &&= ok;
      }
      if (v) {
        v.setCustomValidity("");
        let ok = v.validity.valid;
        if (v.value !== "") {
          let spl = v.value.split(/\r?\n/);
          spl.forEach(function (elm) {
            let result: string[] = elm.split(',');
            ok &&= result[0] !== "" && result[1] !== "";
          });
        }
        setAirdropAddressAmountListError(!ok);
        if (!ok) {
          v.setCustomValidity("address and/or amount is a blank character");
        }
        valid &&= ok;
      }
      if (v) {
        v.setCustomValidity("");
        let ok = v.validity.valid;
        if (v.value !== "") {
          let spl = v.value.split(/\r?\n/);
          spl.forEach(function (elm) {
            let result: string[] = elm.split(',');
            ok &&= ethers.utils.isAddress(result[0]);
          });
        }
        setAirdropAddressAmountListError(!ok);
        if (!ok) {
          v.setCustomValidity("address is not valid");
        }
        valid &&= ok;
      }
      if (v) {
        v.setCustomValidity("");
        let ok = v.validity.valid;
        if (v.value !== "") {
          let spl = v.value.split(/\r?\n/);
          spl.forEach(function (elm) {
            let result: string[] = elm.split(',');
            ok &&= !Number.isNaN(result[1]);
          });
        }
        setAirdropAddressAmountListError(!ok);
        if (!ok) {
          v.setCustomValidity("amount is only number");
        }
        valid &&= ok;
      }
      if (v) {
        v.setCustomValidity("");
        let ok = v.validity.valid;
        if (v.value !== "") {
          let spl = v.value.split(/\r?\n/);
          spl.forEach(function (elm) {
            let result: string[] = elm.split(',');
            ok &&= Number.isInteger(result[1]);
          });
        }
        setAirdropAddressAmountListError(!ok);
        if (!ok) {
          v.setCustomValidity("amount is only integer");
        }
        valid &&= ok;
      }
    }*/

    return valid;
  };

  const extractTokenBalance = async (
    snapshotAmount: { [address: string]: BigNumber },
    ttlSnapshotAmount: BigNumber,
    snapshotTokenAddress: string,
    coefficient: BigNumber
  ): Promise<[{ [address: string]: BigNumber }, BigNumber]> => {
    let response = await fetch(
      "/api/token/holders?chainId=" +
      BigNumber.from(chainId).toString() +
      "&tokenAddress=" +
      snapshotTokenAddress +
      "&blockNumber=" +
      snapshotBlockNumberValue
    );
    let responseJson = (await response.json()) as holdersResponse;
    responseJson.data.map((data: { address: string; balance: string }) => {
      if (excludedAddressListValue.includes(data.address)) {
        return;
      }
      const parsedAmount = BigNumber.from(data.balance).mul(coefficient);
      if (snapshotAmount[data.address] == undefined) {
        snapshotAmount[data.address] = parsedAmount;
      } else {
        snapshotAmount[data.address] =
          snapshotAmount[data.address].add(parsedAmount);
      }
      ttlSnapshotAmount = ttlSnapshotAmount.add(parsedAmount);
    });

    return [snapshotAmount, ttlSnapshotAmount];
  };

  const useApiForWrittingFile = async (airdropAmountList: airdropListData[]) => {
    await fetch("/api/merkletree", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "merkle-tree",
        chainId: parseInt(chainId as string, 16), //5,
        data: airdropAmountList,
      }),
    });
  };

  const generateAirdropList = async () => {
    setDeployReadyFlg(false);

    if (chainId == null) {
      return;
    }
    let snapshotAmountDict: { [address: string]: BigNumber } = {};
    let resSnapshotAmount: { [address: string]: BigNumber } = {};
    let airdropAmountList: airdropListData[] = [];
    let ttlSnapshotAmount = BigNumber.from(0);
    let resTtlSnapshotAmount = BigNumber.from(0);
    let ttlAirdropAmount = BigNumber.from(0);
    let airdropAmount = BigNumber.from(airdropTokenAmountValue);
    let snapshotTokenCoefficient1 = BigNumber.from(
      snapshotTokenCoefficient1Value
    );
    let snapshotTokenCoefficient2 = BigNumber.from(
      snapshotTokenCoefficient2Value
    );
    if (snapshotTokenAddress2Value !== "") {
      let response = await fetch(
        "/api/token/decimal?chainId=" +
        BigNumber.from(chainId).toString() +
        "&tokenAddress=" +
        snapshotTokenAddress1Value
      );
      let responseJson = (await response.json()) as decimalResponse;
      const decimals1 = responseJson.data;

      response = await fetch(
        "/api/token/decimal?chainId=" +
        BigNumber.from(chainId).toString() +
        "&tokenAddress=" +
        snapshotTokenAddress2Value
      );
      responseJson = (await response.json()) as decimalResponse;
      const decimals2 = responseJson.data;

      if (decimals1 > decimals2) {
        snapshotTokenCoefficient2 = snapshotTokenCoefficient2.mul(
          BigNumber.from(10).pow(decimals1 - decimals2)
        );
      } else if (decimals2 > decimals1) {
        snapshotTokenCoefficient1 = snapshotTokenCoefficient1.mul(
          BigNumber.from(10).pow(decimals2 - decimals1)
        );
      }

      [resSnapshotAmount, resTtlSnapshotAmount] = await extractTokenBalance(
        snapshotAmountDict,
        ttlSnapshotAmount,
        snapshotTokenAddress2Value,
        snapshotTokenCoefficient2
      );
      snapshotAmountDict = resSnapshotAmount;
      ttlSnapshotAmount = resTtlSnapshotAmount;
    }

    [resSnapshotAmount, resTtlSnapshotAmount] = await extractTokenBalance(
      snapshotAmountDict,
      ttlSnapshotAmount,
      snapshotTokenAddress1Value,
      snapshotTokenCoefficient1
    );
    snapshotAmountDict = resSnapshotAmount;
    ttlSnapshotAmount = resTtlSnapshotAmount;

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

    setSnaphshotList(snapshotAmountList);

    snapshotAmountList.map((elm) => {
      let calculatedAmount = airdropAmount.mul(elm[1]).div(ttlSnapshotAmount);
      ttlAirdropAmount = ttlAirdropAmount.add(calculatedAmount);
      airdropAmountList.push({ address: elm[0], amount: calculatedAmount });
    });

    setAirdropList(airdropAmountList);

    setTtlAirdropAmount(ttlAirdropAmount.toString());

    //the cese using api
    //useApiForWrittingFile(airdropAmountList, chainId);
    setDeployReadyFlg(true);
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
                  <Typography
                    sx={{
                      m: 2,
                    }}
                  >
                    Airdrop List (Separated by line breaks)<br /><br />

                    Enter one line at a time in the following order: <br />
                    address,amount<br />
                    Don't forget the comma(,) between the address and the amount!<br /><br />

                    (Input Example)<br />
                    0xaaa...zzz,100<br />
                    0x111...999,200<br />
                    ...<br />

                  </Typography>
                  <TextField
                    id="excluded-address-list"
                    variant="outlined"
                    multiline
                    sx={{
                      width: 0.5,
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
                    let valid = formValidation();
                    if (valid) {
                      console.log("valid");
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
