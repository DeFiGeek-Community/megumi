import { ethers } from "hardhat";
import { BytesLike } from "ethers";

export function parseAddr(addr: string) {
  if (!addr) throw new Error("Error: helper.parseAddr(undefined)");
  return `0x${addr.slice(26, addr.length)}`;
}
export function parseBool(bytes: string) {
  return parseInt(bytes.slice(bytes.length - 1, bytes.length)) === 1;
}
export function parseInteger(bytes: string) {
  bytes = bytes.slice(2, bytes.length);
  return parseInt(bytes);
}

const codec = ethers.AbiCoder.defaultAbiCoder();

export function encode(types: string[], values: (number | bigint | string)[]) {
  return codec.encode(types, values);
}
export function decode(types: string[], values: BytesLike) {
  return codec.decode(types, values);
}

export function toERC20(amount: string, decimal: number = 18): bigint {
  return ethers.parseUnits(amount, decimal);
}
export function toFloat(amount: string, decimal: number = 18): string {
  return ethers.formatUnits(amount, decimal);
}
