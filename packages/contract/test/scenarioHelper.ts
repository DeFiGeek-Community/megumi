import { ethers } from "hardhat";
import { Contract } from "ethers";

/* Types */
// TODO extract to ui workspace and import from ui package
export const TemplateType = {
  STANDARD: "Standard",
  VESTING: "Vesting",
} as const;
export type TemplateType = (typeof TemplateType)[keyof typeof TemplateType];
export type TemplateArgs = {
  [TemplateType.STANDARD]: [
    string,
    string,
    string,
    bigint,
    number,
    number,
    string
  ];
  [TemplateType.VESTING]: [
    string,
    string,
    string,
    bigint,
    number,
    number,
    number,
    string
  ];
};
export const TemplateArgs: { [key in TemplateType]: string[] } = {
  // owner_, merkleRoot_, token_, depositAmount_, nonce_, deadline_, signature_
  [TemplateType.STANDARD]: [
    "address",
    "bytes32",
    "address",
    "uint256",
    "uint256",
    "uint256",
    "bytes",
  ],
  // owner_, merkleRoot_, token_, depositAmount_, vesting, nonce_, deadline_, signature_
  [TemplateType.VESTING]: [
    "address",
    "bytes32",
    "address",
    "uint256",
    "uint256",
    "uint256",
    "uint256",
    "bytes",
  ],
};

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
