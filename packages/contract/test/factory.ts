import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployMerkleAirdrop } from "./lib/scenarioHelper";
import { airdropInfo } from "./lib/constants";
import { TemplateType, TemplateArgs } from "../scripts/types";
import { deployFactoryAndFeePoolFixture } from "./lib/fixtures";

describe("Factory", function () {
  const templateName = ethers.encodeBytes32String(TemplateType.STANDARD);
  const initialSupply = ethers.parseEther("1000");

  async function deployFactoryAndTemplateFixture() {
    const { factory, feePool, owner, addr1, addr2 } = await loadFixture(
      deployFactoryAndFeePoolFixture
    );

    const Template = await ethers.getContractFactory(TemplateType.STANDARD);
    const template = await Template.deploy(factory.target, feePool.target);
    await template.waitForDeployment();

    await factory.addTemplate(
      templateName,
      template.target,
      Template.interface.getFunction("initialize")!.selector,
      Template.interface.getFunction("initializeTransfer")!.selector
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
      const templateName2 = ethers.zeroPadValue(
        ethers.hexlify(ethers.toUtf8Bytes("sale2")),
        32
      );
      await expect(
        factory
          .connect(addr1)
          .addTemplate(
            templateName2,
            template.target,
            template.interface.getFunction("initialize")!.selector,
            template.interface.getFunction("initializeTransfer")!.selector
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
          template.target,
          template.interface.getFunction("initialize")!.selector,
          template.interface.getFunction("initializeTransfer")!.selector
        )
      ).to.be.reverted;
    });
  });

  describe("removeTemplate", function () {
    it("removeTemplate_success_1", async function () {
      const { factory } = await loadFixture(deployFactoryAndTemplateFixture);
      await factory.removeTemplate(templateName);
      const templateInfo = await factory.templates(templateName);
      expect(templateInfo[0]).to.equal(ethers.ZeroAddress);
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
      expect(templateInfo[0]).to.equal(template.target);
      expect(notRegisteredtemplateInfo[0]).to.equal(ethers.ZeroAddress);
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
      await token.waitForDeployment();

      const depositAmount = ethers.parseEther("1");
      await token.approve(factory.target, depositAmount);

      await expect(
        deployMerkleAirdrop(
          TemplateType.STANDARD,
          factory,
          [owner.address, airdropInfo.merkleRoot, token.target.toString(), 0n],
          ethers.parseEther("0.01")
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
      await token.waitForDeployment();

      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const args = abiCoder.encode(TemplateArgs[TemplateType.STANDARD], [
        owner.address,
        airdropInfo.merkleRoot,
        token.target,
        0n,
      ]);

      const notRegisteredTemplateName =
        "0x11116c6554656d706c6174655631000000000000000000000000000000000000";
      const nonce = ethers.encodeBytes32String(Math.random().toString());
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
      await token.waitForDeployment();

      await expect(
        deployMerkleAirdrop(
          TemplateType.STANDARD,
          factory,
          [owner.address, airdropInfo.merkleRoot, token.target.toString(), 0n],
          ethers.parseEther("0.01"),
          airdropInfo.uuid
        )
      ).to.not.be.reverted;
      await expect(
        deployMerkleAirdrop(
          TemplateType.STANDARD,
          factory,
          [owner.address, airdropInfo.merkleRoot, token.target.toString(), 0n],
          ethers.parseEther("0.01"),
          airdropInfo.uuid
        )
      ).to.be.reverted;
    });
  });
});
