import { readFileSync, writeFileSync, existsSync } from "fs";
import { Contract, Interface } from "ethers";
import { ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import chalk from "chalk";
import { Factory } from "../typechain-types";

type Options = {
  from?: SignerWithAddress | undefined;
  signer?: SignerWithAddress | undefined;
  ABI?: any | undefined;
  subdir?: string;
  args?: Array<any> | undefined;
  linkings?: Array<string> | undefined;
  log?: boolean | undefined;
  getContractFactory: any;
};

export async function getFoundation(): Promise<SignerWithAddress> {
  const accounts = await ethers.getSigners();
  return accounts[0];
}

export function getContractAddress(_network: string, _name: string): string {
  return readFileSync(`deployments/${_network}/${_name}`).toString();
}

export function getDeploymentAddressPath(_network: string, _name: string) {
  return `./deployments/${_network}/${_name}`;
}

export function existsDeployedContract(_network: string, _name: string) {
  return existsSync(getDeploymentAddressPath(_network, _name));
}

export async function deploy(contractName: string, opts: Options) {
  const foundation: SignerWithAddress = await getFoundation();
  if (!opts.from) opts.from = foundation;
  if (!opts.signer) opts.signer = opts.from;
  if (!opts.ABI) opts.ABI = genABI(contractName, opts.subdir);
  if (!opts.args) opts.args = [];
  if (!opts.linkings) opts.linkings = [];
  if (!opts.log) opts.log = false;

  const _Factory = await opts.getContractFactory(contractName, {
    signer: opts.signer,
  });

  const _Contract: Contract = await _Factory.deploy(...opts.args);
  await _Contract.waitForDeployment();
  if (opts.log)
    console.log(
      `${contractName} is deployed as ${
        _Contract.target
      } by ${await opts.signer.getAddress()}`
    );
  writeFileSync(
    `deployments/${network.name}/${contractName}`,
    _Contract.target.toString()
  );
  return _Contract;
}

export function genABI(filename: string, subdir?: string) {
  return new Interface(
    JSON.parse(
      readFileSync(
        `artifacts/contracts/${
          subdir ? `${subdir}/` : ""
        }${filename}.sol/${filename}.json`
      ).toString()
    ).abi
  );
}

export async function addTemplate(
  networkName: string,
  templateName: string,
  deployedFactoryAddress: string,
  deployedTemplateAddress: string
): Promise<string> {
  /*
        1. Instanciate the deployed factory and template.
    */
  const foundation = await getFoundation();
  const FFactory = await ethers.getContractFactory("Factory", foundation);
  const Factory = FFactory.attach(deployedFactoryAddress) as Factory;
  const FTemplate = await ethers.getContractFactory(templateName, foundation);
  const Template = FTemplate.attach(deployedTemplateAddress);

  /*
        2. consistency check between the embedded factory addr in the template and the on-chain factory itself.
    */
  const factoryAddressFromFile = getContractAddress(networkName, "Factory");
  if (factoryAddressFromFile !== deployedFactoryAddress) {
    throw new Error(
      `factoryAddressFromFile=${factoryAddressFromFile} is not equal to deployedFactoryAddress=${deployedFactoryAddress}`
    );
  }

  /*
      3. Finding unique name
  */
  const name = ethers.encodeBytes32String(templateName);
  const initializeSignature =
    Template.interface.getFunction("initialize")!.selector;
  const transferSignature =
    Template.interface.getFunction("initializeTransfer")!.selector;

  /*
      4. Register the template to the Factory.
  */
  console.log(
    `"mapping(${name} => ${Template.target})" is being registered to the Factory... (Factory.owner = ${foundation.address})`
  );
  let tx = await Factory.connect(foundation).addTemplate(
    name,
    Template.target.toString(),
    initializeSignature,
    transferSignature
  );
  await tx.wait();

  /*
      5. Show result.
  */
  console.log(
    chalk.green.bgBlack.bold(
      `[Finished] addTemplate :: ${name}=${await Factory.templates(
        name
      )} is registered to factory=${Factory.target}\n\n`
    )
  );

  /*
      Return the key of template;
  */
  return name;
}
