import { ethers } from "hardhat";
import { Contract } from "ethers";
import { TemplateType, TemplateArgs } from "./types";

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

export async function deployMerkleAirdrop<T extends TemplateType>(
  type: T,
  factory: Contract,
  args: TemplateArgs[T],
  creationFee: bigint,
  uuid?: string // nonce for create2
) {
  const templateName = ethers.utils.formatBytes32String(type);
  const abiCoder = ethers.utils.defaultAbiCoder;
  const encodedArgs: string = abiCoder.encode(TemplateArgs[type], args);

  uuid = uuid ?? ethers.utils.formatBytes32String(Math.random().toString());
  const tx = await factory.deployMerkleAirdrop(
    templateName,
    uuid,
    encodedArgs,
    { value: creationFee }
  );
  const receipt = await tx.wait();
  const event = receipt.events.find((event: any) => event.event === "Deployed");
  const [, templateAddr] = event.args;
  const Airdrop = await ethers.getContractFactory(`MerkleAirdrop${type}`);
  return Airdrop.attach(templateAddr);
}

export async function simulateDeployMerkleAirdrop<T extends TemplateType>(
  type: T,
  factory: Contract,
  args: TemplateArgs[T],
  creationFee: bigint,
  uuid?: string // nonce for create2
): Promise<string> {
  const templateName = ethers.utils.formatBytes32String(type);
  const abiCoder = ethers.utils.defaultAbiCoder;
  const encodedArgs: string = abiCoder.encode(TemplateArgs[type], args);

  uuid = uuid ?? ethers.utils.formatBytes32String(Math.random().toString());
  const address = await factory.callStatic.deployMerkleAirdrop(
    templateName,
    uuid,
    encodedArgs,
    { value: creationFee }
  );
  return address;
}
