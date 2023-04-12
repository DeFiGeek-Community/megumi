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
import { merkleAirdropAbi } from "@merkle-airdrop-tool/contract/exports/MerkleAirdrop";

export default function CreateAirdrop() {
    const { status, connect, account, chainId } = useMetaMask();
    const { switchChain } = useMetaMask();

    const airdropNameRef = useRef<HTMLInputElement>(null);
    const airdropTokenAddressRef = useRef<HTMLInputElement>(null);
    const airdropTokenAmountRef = useRef<HTMLInputElement>(null);
    const initialDepositAmountRef = useRef<HTMLInputElement>(null);
    const snapshotTokenAddress1Ref = useRef<HTMLInputElement>(null);
    const snapshotTokenAddress2Ref = useRef<HTMLInputElement>(null);
    const snapshotTokenCoefficient1Ref = useRef<HTMLInputElement>(null);
    const snapshotTokenCoefficient2Ref = useRef<HTMLInputElement>(null);
    const snapshotBlockNumberRef = useRef<HTMLInputElement>(null);
    const excludedAddressListRef = useRef<HTMLInputElement>(null);

    const [airdropNameValue, setAirdropNameValue] = useState("");
    const [airdropTokenAddressValue, setAirdropTokenAddressValue] = useState("");
    const [airdropTokenAmountValue, setAirdropTokenAmountValue] = useState("");
    const [initialDepositAmountValue, setInitialDepositAmountValue] =
        useState("0");
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

    const [airdropNameError, setAirdropNameError] = useState(false);
    const [airdropTokenAddressError, setAirdropTokenAddressError] =
        useState(false);
    const [airdropTokenAmountError, setAirdropTokenAmountError] = useState(false);
    const [initialDepositAmountError, setInitialDepositAmountError] =
        useState(false);
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

    const [snapshotList, setSnaphshotList] = useState<[string, BigNumber][]>([]);
    const [airdropList, setAirdropList] = useState<
        { address: string; amount: BigNumber }[]
    >([]);
    const [ttlAirdropAmount, setTtlAirdropAmount] = useState("");

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
        v = airdropTokenAmountRef?.current;
        if (v) {
            v.setCustomValidity("");
            let ok = v.validity.valid;
            ok &&= Number.isInteger(+v.value);
            setAirdropTokenAmountError(!ok);
            if (!ok) {
                v.setCustomValidity("amount is only integer");
            }
            valid &&= ok;
        }
        v = initialDepositAmountRef?.current;
        if (v) {
            v.setCustomValidity("");
            let ok = v.validity.valid;
            ok &&= Number.isInteger(+v.value);
            setInitialDepositAmountError(!ok);
            if (!ok) {
                v.setCustomValidity("amount is only integer");
            }
            valid &&= ok;
        }
        v = snapshotTokenAddress1Ref?.current;
        if (v) {
            v.setCustomValidity("");
            let ok = v.validity.valid;
            ok &&= ethers.utils.isAddress(v.value);
            setSnapshotTokenAddress1Error(!ok);
            if (!ok) {
                v.setCustomValidity("address is not valid");
            }
            valid &&= ok;
        }
        v = snapshotTokenAddress2Ref?.current;
        if (v) {
            v.setCustomValidity("");
            let ok = v.validity.valid;
            if (v.value !== "") {
                ok &&= ethers.utils.isAddress(v.value);
            }
            setSnapshotTokenAddress2Error(!ok);
            if (!ok) {
                v.setCustomValidity("address is not valid");
            }
            valid &&= ok;
        }
        v = snapshotTokenCoefficient1Ref?.current;
        if (v) {
            v.setCustomValidity("");
            let ok = v.validity.valid;
            ok &&= Number.isInteger(+v.value);
            setSnapshotTokenCoefficient1Error(!ok);
            if (!ok) {
                v.setCustomValidity("coefficient is only integer");
            }
            valid &&= ok;
        }
        v = snapshotTokenCoefficient2Ref?.current;
        if (v) {
            v.setCustomValidity("");
            let ok = v.validity.valid;
            ok &&= Number.isInteger(+v.value);
            setSnapshotTokenCoefficient2Error(!ok);
            if (!ok) {
                v.setCustomValidity("coefficient is only integer");
            }
            valid &&= ok;
        }
        v = snapshotBlockNumberRef?.current;
        if (v) {
            v.setCustomValidity("");
            let ok = v.validity.valid;
            ok &&= Number.isInteger(+v.value);
            setSnapshotBlockNumberError(!ok);
            if (!ok) {
                v.setCustomValidity("block number is only integer");
            }
            valid &&= ok;
        }
        v = excludedAddressListRef?.current;
        if (v) {
            v.setCustomValidity("");
            let ok = v.validity.valid;
            if (v.value !== "") {
                let spl = v.value.split(/\r?\n/);
                spl.forEach(function (elm) {
                    ok &&= ethers.utils.isAddress(elm);
                });
            }
            setExcludedAddressListError(!ok);
            if (!ok) {
                v.setCustomValidity("address is not valid");
            }
            valid &&= ok;
        }

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

    const generateAirdropList = async () => {
        if (chainId == null) {
            return;
        }
        let snapshotAmountDict: { [address: string]: BigNumber } = {};
        let resSnapshotAmount: { [address: string]: BigNumber } = {};
        let airdropAmountList: { address: string; amount: BigNumber }[] = [];
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
        setInitialDepositAmountValue(ttlAirdropAmount.toString());
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
                                                Snapshot Block Number
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <TextField
                                                id="snapshot-block-number"
                                                variant="outlined"
                                                required
                                                defaultValue={snapshotBlockNumberValue}
                                                inputProps={{ style: { textAlign: "right" } }}
                                                sx={{
                                                    width: 0.5,
                                                }}
                                                onChange={(e: OnChangeEvent) =>
                                                    setSnapshotBlockNumberValue(e.target.value)
                                                }
                                                inputRef={snapshotBlockNumberRef}
                                                error={snapshotBlockNumberError}
                                                helperText={
                                                    snapshotBlockNumberError &&
                                                    snapshotBlockNumberRef?.current?.validationMessage
                                                }
                                            />
                                        </Grid>
                                    </Grid>
                                    <Grid
                                        container
                                        sx={{
                                            m: 2,
                                        }}
                                        columnSpacing={{ xs: 1 }}
                                    >
                                        <Grid item xs={3}>
                                            <Typography
                                                sx={{
                                                    m: 2,
                                                }}
                                            >
                                                Snapshot Token Address
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={9}>
                                            <Grid
                                                container
                                                sx={{
                                                    m: 1,
                                                }}
                                                columnSpacing={{ xs: 1 }}
                                            >
                                                <Grid item xs={6}>
                                                    <TextField
                                                        fullWidth
                                                        label="address"
                                                        id="snapshot-token-address-1"
                                                        variant="outlined"
                                                        required
                                                        defaultValue={snapshotTokenAddress1Value}
                                                        onChange={(e: OnChangeEvent) =>
                                                            setSnapshotTokenAddress1Value(e.target.value)
                                                        }
                                                        inputRef={snapshotTokenAddress1Ref}
                                                        error={snapshotTokenAddress1Error}
                                                        helperText={
                                                            snapshotTokenAddress1Error &&
                                                            snapshotTokenAddress1Ref?.current
                                                                ?.validationMessage
                                                        }
                                                    />
                                                </Grid>
                                                <Grid item xs={2}>
                                                    <TextField
                                                        fullWidth
                                                        label="coefficient"
                                                        id="snapshot-token-coefficient-1"
                                                        variant="outlined"
                                                        required
                                                        defaultValue={snapshotTokenCoefficient1Value}
                                                        inputProps={{ style: { textAlign: "right" } }}
                                                        onChange={(e: OnChangeEvent) =>
                                                            setSnapshotTokenCoefficient1Value(e.target.value)
                                                        }
                                                        inputRef={snapshotTokenCoefficient1Ref}
                                                        error={snapshotTokenCoefficient1Error}
                                                        helperText={
                                                            snapshotTokenCoefficient1Error &&
                                                            snapshotTokenCoefficient1Ref?.current
                                                                ?.validationMessage
                                                        }
                                                    />
                                                </Grid>
                                            </Grid>
                                            <Grid
                                                container
                                                sx={{
                                                    m: 1,
                                                }}
                                                columnSpacing={{ xs: 1 }}
                                            >
                                                <Grid item xs={6}>
                                                    <TextField
                                                        fullWidth
                                                        label="address"
                                                        id="snapshot-token-address-2"
                                                        variant="outlined"
                                                        defaultValue={snapshotTokenAddress2Value}
                                                        onChange={(e: OnChangeEvent) =>
                                                            setSnapshotTokenAddress2Value(e.target.value)
                                                        }
                                                        inputRef={snapshotTokenAddress2Ref}
                                                        error={snapshotTokenAddress2Error}
                                                        helperText={
                                                            snapshotTokenAddress2Error &&
                                                            snapshotTokenAddress2Ref?.current
                                                                ?.validationMessage
                                                        }
                                                    />
                                                </Grid>
                                                <Grid item xs={2}>
                                                    <TextField
                                                        fullWidth
                                                        label="coefficient"
                                                        id="snapshot-token-coefficient-2"
                                                        variant="outlined"
                                                        inputProps={{ style: { textAlign: "right" } }}
                                                        defaultValue={snapshotTokenCoefficient2Value}
                                                        onChange={(e: OnChangeEvent) =>
                                                            setSnapshotTokenCoefficient2Value(e.target.value)
                                                        }
                                                        inputRef={snapshotTokenCoefficient2Ref}
                                                        error={snapshotTokenCoefficient2Error}
                                                        helperText={
                                                            snapshotTokenCoefficient2Error &&
                                                            snapshotTokenCoefficient2Ref?.current
                                                                ?.validationMessage
                                                        }
                                                    />
                                                </Grid>
                                            </Grid>
                                        </Grid>
                                    </Grid>

                                    <Typography
                                        sx={{
                                            m: 2,
                                        }}
                                    >
                                        Excluded Address List(Separated by line breaks)
                                    </Typography>
                                    <TextField
                                        id="excluded-address-list"
                                        variant="outlined"
                                        multiline
                                        sx={{
                                            width: 0.5,
                                        }}
                                        defaultValue={excludedAddressListValue}
                                        onChange={(e: OnChangeEvent) =>
                                            setExcludedAddressListValue(e.target.value)
                                        }
                                        inputRef={excludedAddressListRef}
                                        error={excludedAddressListError}
                                        helperText={
                                            excludedAddressListError &&
                                            excludedAddressListRef?.current?.validationMessage
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