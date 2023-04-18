export function shortenAddress(address: string | null) {
  if (address === null) {
    return "";
  } else {
    return address.substring(0, 6) + "..." + address.substring(38);
  }
}
