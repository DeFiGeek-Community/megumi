import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployMerkleAirdrop } from "./lib/scenarioHelper";
import { airdropInfo } from "./lib/constants";
import { TemplateType, TemplateArgs } from "./lib/types";

describe("Factory", function () {
  const templateName = ethers.utils.formatBytes32String(TemplateType.STANDARD);
  const initialSupply = ethers.utils.parseEther("1000");

  async function deployFactoryAndFeePoolFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("Factory");
    const factory = await Factory.deploy();
    await factory.deployed();
    const FeePool = await ethers.getContractFactory("FeePool");
    const feePool = await FeePool.deploy();
    await feePool.deployed();

    return { factory, feePool, owner, addr1, addr2 };
  }

  async function deployFactoryAndTemplateFixture() {
    const { factory, feePool, owner, addr1, addr2 } = await loadFixture(
      deployFactoryAndFeePoolFixture
    );

    const Template = await ethers.getContractFactory(
      `MerkleAirdrop${TemplateType.STANDARD}`
    );
    const template = await Template.deploy(factory.address, feePool.address);
    await template.deployed();

    await factory.addTemplate(
      templateName,
      template.address,
      Template.interface.getSighash("initialize"),
      Template.interface.getSighash("initializeTransfer")
    );

    return {
      factory,
      feePool,
      template,
      owner,
      addr1,
      addr2,
    };
  }

  describe("deploy", function () {
    it("constructor_success_1", async function () {
      await loadFixture(deployFactoryAndFeePoolFixture);
    });
  });

  describe("addTemplate", function () {
    it("addTemplate_success_1", async function () {
      await loadFixture(deployFactoryAndTemplateFixture);
    });

    it("addTemplate_fail_1", async function () {
      const { factory, template, addr1 } = await loadFixture(
        deployFactoryAndTemplateFixture
      );
      const templateName2 = ethers.utils.hexZeroPad(
        ethers.utils.hexlify(ethers.utils.toUtf8Bytes("sale2")),
        32
      );
      await expect(
        factory
          .connect(addr1)
          .addTemplate(
            templateName2,
            template.address,
            template.interface.getSighash("initialize"),
            template.interface.getSighash("initializeTransfer")
          )
      ).to.be.reverted;
    });

    it("addTemplate_fail_2", async function () {
      const { factory, template } = await loadFixture(
        deployFactoryAndTemplateFixture
      );
      await expect(
        factory.addTemplate(
          templateName,
          template.address,
          template.interface.getSighash("initialize"),
          template.interface.getSighash("initializeTransfer")
        )
      ).to.be.reverted;
    });
  });

  describe("removeTemplate", function () {
    it("removeTemplate_success_1", async function () {
      const { factory } = await loadFixture(deployFactoryAndTemplateFixture);
      await factory.removeTemplate(templateName);
      const templateInfo = await factory.templates(templateName);
      expect(templateInfo[0]).to.equal(ethers.constants.AddressZero);
    });

    it("removeTemplate_success_2", async function () {
      const { factory, template, addr1 } = await loadFixture(
        deployFactoryAndTemplateFixture
      );
      const notRegisteredTemplateName =
        "0x11116c6554656d706c6174655631000000000000000000000000000000000000";
      await factory.removeTemplate(notRegisteredTemplateName);
      const templateInfo = await factory.templates(templateName);
      const notRegisteredtemplateInfo = await factory.templates(
        notRegisteredTemplateName
      );
      expect(templateInfo[0]).to.equal(template.address);
      expect(notRegisteredtemplateInfo[0]).to.equal(
        ethers.constants.AddressZero
      );
    });

    it("removeTemplate_fail_1", async function () {
      const { factory, template, addr1 } = await loadFixture(
        deployFactoryAndTemplateFixture
      );
      await expect(factory.connect(addr1).removeTemplate(templateName)).to.be
        .reverted;
    });
  });

  describe("deployMerkleAirdrop", function () {
    it("deployMerkleAirdrop_success_1", async function () {
      const { factory, owner } = await loadFixture(
        deployFactoryAndTemplateFixture
      );
      const Token = await ethers.getContractFactory("TestERC20");
      const token = await Token.deploy("", "", initialSupply);
      await token.deployed();

      const depositAmount = ethers.utils.parseEther("1");
      await token.approve(factory.address, depositAmount);

      await expect(
        deployMerkleAirdrop(
          TemplateType.STANDARD,
          factory,
          [owner.address, airdropInfo.merkleRoot, token.address, 0n],
          ethers.utils.parseEther("0.01").toBigInt()
        )
      ).to.not.be.reverted;
    });

    // 登録されていないテンプレートでのセール立ち上げ
    it("deployMerkleAirdrop_fail_1", async function () {
      const { factory, owner } = await loadFixture(
        deployFactoryAndTemplateFixture
      );
      const Token = await ethers.getContractFactory("TestERC20");
      const token = await Token.deploy("", "", initialSupply);
      await token.deployed();

      const abiCoder = ethers.utils.defaultAbiCoder;
      const args = abiCoder.encode(TemplateArgs[TemplateType.STANDARD], [
        owner.address,
        airdropInfo.merkleRoot,
        token.address,
        0n,
      ]);

      const notRegisteredTemplateName =
        "0x11116c6554656d706c6174655631000000000000000000000000000000000000";
      const nonce = ethers.utils.formatBytes32String(Math.random().toString());
      await expect(
        factory.deployMerkleAirdrop(notRegisteredTemplateName, nonce, args)
      ).to.be.revertedWith("No such template in the list.");
    });

    it("Should fail deploy with the same salt", async function () {
      const { factory, owner } = await loadFixture(
        deployFactoryAndTemplateFixture
      );
      const Token = await ethers.getContractFactory("TestERC20");
      const token = await Token.deploy("", "", initialSupply);
      await token.deployed();

      await expect(
        deployMerkleAirdrop(
          TemplateType.STANDARD,
          factory,
          [owner.address, airdropInfo.merkleRoot, token.address, 0n],
          ethers.utils.parseEther("0.01").toBigInt(),
          airdropInfo.uuid
        )
      ).to.not.be.reverted;
      await expect(
        deployMerkleAirdrop(
          TemplateType.STANDARD,
          factory,
          [owner.address, airdropInfo.merkleRoot, token.address, 0n],
          ethers.utils.parseEther("0.01").toBigInt(),
          airdropInfo.uuid
        )
      ).to.be.reverted;
    });
  });
});
