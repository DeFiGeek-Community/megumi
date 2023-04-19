import { parseBalanceMap } from "./parse-balance-map";

export function shortenAddress(address: string | null) {
  if (address === null) {
    return "";
  } else {
    return address.substring(0, 6) + "..." + address.substring(38);
  }
}

export const downloadMerkleTreeJson = async (
  airdropAmount: string,
  airdropAmountList: airdropListData[]
) => {
  let merkletree = JSON.stringify(
    parseBalanceMap(airdropAmount, airdropAmountList)
  );
  const fileName = "merkle-tree.json";
  const data = new Blob([JSON.stringify(merkletree)], { type: "text/json" });
  const jsonURL = window.URL.createObjectURL(data);
  const link = document.createElement("a");
  document.body.appendChild(link);
  link.href = jsonURL;
  link.setAttribute("download", fileName);
  link.click();
  document.body.removeChild(link);
};
