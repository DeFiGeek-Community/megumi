type OnChangeEvent = React.ChangeEvent<HTMLInputElement>;
type holdersResponseData = { address: string; balance: string }[];
type holdersResponse = { data: holdersResponseData };
type decimalResponse = { data: number };
type AddressMap = { [chainId: number]: string };
type airdropListData = { address: string; amount: BigNumber };
