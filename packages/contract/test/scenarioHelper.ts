import { ethers } from "hardhat";

/* Types */
export const TemplateType = {
  STANDARD: "Standard",
  VESTING: "Vesting",
} as const;
export type TemplateType = (typeof TemplateType)[keyof typeof TemplateType];
export type TemplateArgs = {
  [TemplateType.STANDARD]: [string, string, string, string];
  [TemplateType.VESTING]: [string, string, string, string, string];
};
export const TemplateArgs: {[key in TemplateType]: string[]} = {
  [TemplateType.STANDARD]: ["address", "byte32", "address", "uint256"],
  [TemplateType.VESTING]: ["address", "byte32", "address", "uint256", "uint256"],
}

export async function sendERC20(
  erc20contract: any,
  to: any,
  amountStr: string,
  signer: any
) {
  let sendResult = await (
    await signer.sendTransaction({
      to: to,
      value: ethers.utils.parseEther(amountStr),
    })
  ).wait();
}
export async function sendEther(to: any, amountStr: string, signer: any) {
  let sendResult = await (
    await signer.sendTransaction({
      to: to,
      value: ethers.utils.parseEther(amountStr),
    })
  ).wait();
}

export async function deployAirdropTemplate<T extends TemplateType>(
  type: T,
  factory: any,
  args: TemplateArgs[T],
  creationFee: bigint
) {
  const templateName = ethers.utils.formatBytes32String(type);
  const abiCoder = ethers.utils.defaultAbiCoder;
  const encodedArgs: string = abiCoder.encode(
    TemplateArgs[type],
    args
  );
  const nonce = Math.random().toString()
  const tx = await factory.deployMerkleAirdrop(templateName, nonce, encodedArgs, { value: creationFee });
  const receipt = await tx.wait();
  const event = receipt.events.find((event: any) => event.event === "Deployed");
  const [, templateAddr] = event.args;
  const Airdrop = await ethers.getContractFactory(`MerkleAirdrop${type}`);
  return Airdrop.attach(templateAddr);
}
