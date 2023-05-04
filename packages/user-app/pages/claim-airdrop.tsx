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
import { useCallback, useEffect, useRef, useState } from "react";
import { BigNumber, ethers, providers } from "ethers";
import { shortenAddress } from "@/src/util";
import { MERKLEAIRDROP_ADDRESSES } from "@/src/addresses";
import { merkleAirdropAbi } from "@merkle-airdrop-tool/contract/exports/MerkleAirdrop";
import { useRouter } from "next/router";

export default function ClaimAirdrop() {
  const router = useRouter();
  const query = router.query;

  const { status, connect, account, chainId } = useMetaMask();
  const { switchChain } = useMetaMask();

  const airdropNameRef = useRef<HTMLInputElement>(null);
  const merkleTreeRef = useRef<HTMLInputElement>(null);

  const [airdropNameValue, setAirdropNameValue] = useState("");
  const [merkleTreeValue, setMerkleTreeValue] = useState("");

  const [airdropNameError, setAirdropNameError] = useState(false);
  const [merkleTreeError, setMerkleTreeError] = useState(false);

  useEffect(() => {
    const { airdropname, merkletree } = query;
    if (airdropname) {
      setAirdropNameValue(airdropname as string);
    }
    if (merkletree) {
      setMerkleTreeValue(merkletree as string);
    }
  }, [query]);

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
    v = merkleTreeRef?.current;
    if (v) {
      v.setCustomValidity("");
      let ok = v.validity.valid;
      setMerkleTreeError(!ok);
      if (!ok) {
        v.setCustomValidity("merkle-tree is not valid");
      }
      valid &&= ok;
    }

    return valid;
  };

  const claimAirdrop = async () => {
    const ethereum = new ethers.providers.Web3Provider(window.ethereum);
    const signer = ethereum.getSigner();
    const provider = new providers.InfuraProvider(
      BigNumber.from(chainId).toNumber(),
      process.env.INFURA_API_KEY as string
    );

    const merkleAirdropAddress = MERKLEAIRDROP_ADDRESSES[chainId as string];

    const merkleAirdropContract = new ethers.Contract(
      merkleAirdropAddress,
      merkleAirdropAbi,
      provider
    ).connect(signer);
    const airdropName = ethers.utils.formatBytes32String(airdropNameValue);
    const airdropInfo = await merkleAirdropContract.getAirdropInfo(airdropName);
    const airdropTokenAddress = airdropInfo[0];
    if (ethers.constants.AddressZero === airdropTokenAddress) {
      alert("AirdropInfo does not exist.");
      return;
    }

    let responseJson;
    try {
      const response = await fetch(merkleTreeValue);
      responseJson = await response.json();
    } catch (e) {
      alert("merkletree URL invalid");
      return;
    }
    const claimer = ethers.utils.getAddress(account as string);
    const claimInfo = responseJson?.claims[claimer];
    console.log(claimInfo);
    if (claimInfo == undefined) {
      alert("You are not eligible.\nAirdrop Name or MerkleTree may be wrong.");
      return;
    }

    try {
      const tx = await merkleAirdropContract.claim(
        airdropName,
        claimInfo.index,
        claimer,
        claimInfo.amount,
        claimInfo.proof,
        { value: ethers.utils.parseEther("0.0002") }
      );
      alert("Transaction Executed\nhash:\n" + tx.hash);
    } catch (e) {
      console.log(e);
      alert("Transaction will fail.\nAirdrop Name or MerkleTree may be wrong.");
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
                        MerkleTree
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        id="merkle-tree"
                        variant="outlined"
                        required
                        defaultValue={merkleTreeValue}
                        onChange={(e: OnChangeEvent) =>
                          setMerkleTreeValue(e.target.value)
                        }
                        inputRef={merkleTreeRef}
                        error={merkleTreeError}
                        helperText={
                          merkleTreeError &&
                          merkleTreeRef?.current?.validationMessage
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
                    if (formValidation()) {
                      claimAirdrop();
                    }
                  }}
                >
                  Claim Airdrop
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
