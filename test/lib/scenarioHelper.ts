import { ethers } from "hardhat";
import type { TransactionReceipt } from "ethers";
import {
  TemplateType,
  TemplateArgs,
  TemplateContractMap,
} from "../../scripts/types";
import { Factory } from "../../typechain-types/contracts/Factory";
import { EthereumProvider } from "hardhat/types";
import { TestERC20 } from "../../typechain-types";

export async function sendERC20(
  erc20contract: any,
  to: any,
  amountStr: string,
  signer: any
) {
  let sendResult = await (
    await signer.sendTransaction({
      to: to,
      value: ethers.parseEther(amountStr),
    })
  ).wait();
}
export async function sendEther(to: any, amountStr: string, signer: any) {
  let sendResult = await (
    await signer.sendTransaction({
      to: to,
      value: ethers.parseEther(amountStr),
    })
  ).wait();
}

/**
 * Parses a transaction receipt to extract the deployed template address
 * Scans through transaction logs to find a `Deployed` event and then decodes it to an object
 *
 * @param {TransactionReceipt} receipt - The transaction receipt from the `deployAuction` call
 * @returns {string} Returns either the sent message or empty string if provided receipt does not contain `Deployed` log
 */
export async function getTemplateAddr(receipt: TransactionReceipt | null) {
  if (receipt === null) return "";
  const contractFactory = await ethers.getContractFactory("Factory");
  const iContract = contractFactory.interface;

  for (const log of receipt.logs) {
    try {
      const parsedLog = iContract.parseLog(log);
      if (parsedLog?.name == `Deployed`) {
        const [, templateAddr] = parsedLog?.args;
        return templateAddr as string;
      }
    } catch (error) {
      return "";
    }
  }

  return "";
}

export async function deployMerkleAirdrop<T extends TemplateType>(
  name: string,
  type: T,
  factory: Factory,
  args: TemplateArgs[T],
  creationFee: bigint,
  uuid?: string // nonce for create2
): Promise<TemplateContractMap[T]> {
  const templateName = ethers.encodeBytes32String(name);
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const encodedArgs: string = abiCoder.encode(TemplateArgs[type], args);

  uuid = uuid ?? ethers.encodeBytes32String(Math.random().toString());
  const tx = await factory.deployMerkleAirdrop(
    templateName,
    uuid,
    encodedArgs,
    { value: creationFee }
  );
  const receipt = await tx.wait();
  const templateAddr = await getTemplateAddr(receipt);
  const Airdrop = await ethers.getContractFactory(type);
  return Airdrop.attach(templateAddr) as TemplateContractMap[T];
}

export async function simulateDeployMerkleAirdrop<T extends TemplateType>(
  type: T,
  factory: Factory,
  args: TemplateArgs[T],
  creationFee: bigint,
  uuid?: string // nonce for create2
): Promise<string> {
  const templateName = ethers.encodeBytes32String(type);
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const encodedArgs: string = abiCoder.encode(TemplateArgs[type], args);

  uuid = uuid ?? ethers.encodeBytes32String(Math.random().toString());
  const address = await factory.deployMerkleAirdrop.staticCall(
    templateName,
    uuid,
    encodedArgs,
    { value: creationFee }
  );
  return address;
}

export async function deployCCIPRouter(linkReceiver: string): Promise<{
  chainSelector: bigint;
  sourceRouter: string;
  destinationRouter: string;
  wrappedNative: TestERC20;
  linkToken: TestERC20;
}> {
  const localSimulatorFactory = await ethers.getContractFactory(
    "CCIPLocalSimulator"
  );
  const localSimulator = await localSimulatorFactory.deploy();

  const config: {
    chainSelector_: bigint;
    sourceRouter_: string;
    destinationRouter_: string;
    wrappedNative_: string;
    linkToken_: string;
    ccipBnM_: string;
    ccipLnM_: string;
  } = await localSimulator.configuration();

  localSimulator.requestLinkFromFaucet(linkReceiver, ethers.parseEther("1"));

  const linkToken = await ethers.getContractAt("TestERC20", config.linkToken_);
  const wrappedNative = await ethers.getContractAt(
    "TestERC20",
    config.wrappedNative_
  );

  return {
    chainSelector: config.chainSelector_,
    sourceRouter: config.sourceRouter_,
    destinationRouter: config.destinationRouter_,
    wrappedNative: wrappedNative,
    linkToken,
  };
}

export async function getImpersonateSigner(
  address: `0x${string}`,
  provider: EthereumProvider
) {
  await provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  });
  return await ethers.getSigner(address);
}
