type OnChangeEvent = React.ChangeEvent<HTMLInputElement>;
type holdersResponseData = { address: string; balance: string }[];
type holdersResponse = { data: holdersResponseData };
type numberResponse = { data: BigNumber };
type AddressMap = { [chainId: string]: string };
type airdropListData = { address: string; amount: BigNumber };
interface Window {
    ethereum: any
}