import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { deployMerkleAirdrop } from "../lib/scenarioHelper";
import { deployFactoryAndFeePoolFixture } from "../lib/fixtures";
import { MaxUint, sampleAddress, airdropInfo } from "../lib/constants";
import { TemplateType, TemplateArgs } from "../../scripts/types";

describe("MerkleAirdropStandard contract", function () {
  const templateName = ethers.encodeBytes32String(TemplateType.STANDARD);

  async function deployFactoryAndTemplateFixture() {
    const { factory, feePool, distributorReceiver, owner, addr1, addr2 } =
      await loadFixture(deployFactoryAndFeePoolFixture);

    const Template = await ethers.getContractFactory(TemplateType.STANDARD);
    const template = await Template.deploy(
      factory.target,
      feePool.target,
      distributorReceiver.target
    );
    await template.waitForDeployment();

    await factory.addTemplate(
      templateName,
      template.target,
      Template.interface.getFunction("initialize")!.selector,
      Template.interface.getFunction("initializeTransfer")!.selector
    );

    const TestERC20 = await ethers.getContractFactory("TestERC20");
    const testERC20 = await TestERC20.deploy(
      "TestERC20",
      "TEST",
      ethers.parseEther("100")
    );
    await testERC20.waitForDeployment();

    return {
      factory,
      feePool,
      distributorReceiver,
      template,
      testERC20,
      owner,
      addr1,
      addr2,
      Template,
    };
  }
  async function deployAirdropFixture() {
    const data = await loadFixture(deployFactoryAndTemplateFixture);

    const merkleAirdrop = await deployMerkleAirdrop(
      TemplateType.STANDARD,
      TemplateType.STANDARD,
      data.factory,
      [
        data.owner.address,
        airdropInfo.merkleRoot,
        data.testERC20.target.toString(),
        0n,
      ],
      ethers.parseEther("0.01"),
      airdropInfo.uuid
    );

    return { ...data, merkleAirdrop };
  }

  describe("Deploy", function () {
    it("Should success", async function () {
      const { factory, template } = await loadFixture(
        deployFactoryAndTemplateFixture
      );

      expect(factory.target).to.be.ok;
      expect(template.target).to.be.ok;
    });
  });

  describe("initialize", function () {
    it("Should success initialize", async function () {
      const { factory, testERC20, owner, feePool } = await loadFixture(
        deployFactoryAndTemplateFixture
      );

      const merkleAirdrop = await deployMerkleAirdrop(
        TemplateType.STANDARD,
        TemplateType.STANDARD,
        factory,
        [
          owner.address,
          airdropInfo.merkleRoot,
          testERC20.target.toString(),
          0n,
        ],
        ethers.parseEther("0.01")
      );

      expect(merkleAirdrop.target).to.be.ok;
      expect(await merkleAirdrop.owner()).to.be.eq(owner.address);
      expect(await merkleAirdrop.token()).to.be.eq(testERC20.target);
      expect(await merkleAirdrop.merkleRoot()).to.be.eq(airdropInfo.merkleRoot);
      // Fee poolの残高がregistrationFeeであることを確認
      expect(await ethers.provider.getBalance(feePool.target)).to.be.eq(
        ethers.parseEther("0.01")
      );
    });

    it("Should revert initialize with invalid registrationFee", async function () {
      const { factory, testERC20, owner } = await loadFixture(
        deployFactoryAndTemplateFixture
      );

      await expect(
        deployMerkleAirdrop(
          TemplateType.STANDARD,
          TemplateType.STANDARD,
          factory,
          [
            owner.address,
            airdropInfo.merkleRoot,
            testERC20.target.toString(),
            0n,
          ],
          ethers.parseEther("0.1"),
          airdropInfo.uuid
        )
      ).to.be.reverted;
    });

    it("Should success initialize with deposit", async function () {
      const { factory, testERC20, owner } = await loadFixture(
        deployFactoryAndTemplateFixture
      );

      const claimInfo = airdropInfo.claims[sampleAddress];
      const amount = BigInt(claimInfo.amount);

      await testERC20.approve(factory.target, MaxUint);

      const airdrop = await deployMerkleAirdrop(
        TemplateType.STANDARD,
        TemplateType.STANDARD,
        factory,
        [
          owner.address,
          airdropInfo.merkleRoot,
          testERC20.target.toString(),
          amount,
        ],
        ethers.parseEther("0.01"),
        airdropInfo.uuid
      );

      expect(await testERC20.balanceOf(airdrop.target)).to.be.eq(amount);
      expect(await testERC20.balanceOf(factory.target)).to.be.eq(0);
    });

    it("Should fail initialize when token balance is not enough", async function () {
      const { factory, testERC20, owner } = await loadFixture(
        deployFactoryAndTemplateFixture
      );

      const amount = ethers.parseEther("101");

      await testERC20.approve(factory.target, MaxUint);

      await expect(
        deployMerkleAirdrop(
          TemplateType.STANDARD,
          TemplateType.STANDARD,
          factory,
          [
            owner.address,
            airdropInfo.merkleRoot,
            testERC20.target.toString(),
            amount,
          ],
          ethers.parseEther("0.01"),
          airdropInfo.uuid
        )
      ).to.be.revertedWithCustomError(testERC20, "ERC20InsufficientBalance");
    });
  });

  describe("withdrawDepositedToken", function () {
    it("Should success withdrawDepositedToken by owner", async function () {
      const { merkleAirdrop, testERC20, owner } = await loadFixture(
        deployAirdropFixture
      );

      await testERC20.transfer(merkleAirdrop.target, ethers.parseEther("1"));
      await expect(
        merkleAirdrop.withdrawDepositedToken()
      ).to.changeTokenBalances(
        testERC20,
        [merkleAirdrop, owner],
        [ethers.parseEther("-1"), ethers.parseEther("1")]
      );
    });

    it("Should fail withdrawDepositedToken by other account", async function () {
      const { merkleAirdrop, addr1 } = await loadFixture(deployAirdropFixture);

      await expect(merkleAirdrop.connect(addr1).withdrawDepositedToken()).to.be
        .reverted;
    });
  });

  describe("isClaimed", function () {
    it("Should success isClaimed", async function () {
      const { merkleAirdrop } = await loadFixture(deployAirdropFixture);

      expect(await merkleAirdrop.isClaimed(0)).to.be.false;
    });
  });

  describe("claim", function () {
    it("Should success to claim", async function () {
      const { merkleAirdrop, testERC20, feePool, distributorReceiver } =
        await loadFixture(deployAirdropFixture);

      const claimInfo = airdropInfo.claims[sampleAddress];
      const amount = BigInt(claimInfo.amount);
      await testERC20.transfer(merkleAirdrop.target, amount);
      await expect(
        merkleAirdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof,
          { value: ethers.parseEther("0.0002") }
        )
      ).to.changeTokenBalance(testERC20, sampleAddress, amount);
      // Fee poolの残高がregistrationFee + claimFeeであることを確認
      expect(await ethers.provider.getBalance(feePool.target)).to.be.eq(
        ethers.parseEther("0.0101")
      );
      expect(await merkleAirdrop.isClaimed(claimInfo.index)).to.be.true;
      // 初期ユーザリワードのスコア追加を確認
      expect(await distributorReceiver.scores(sampleAddress)).to.be.eq(
        ethers.parseEther("3")
      );
    });

    it("Should fail to claim incorrect claimFee", async function () {
      const { merkleAirdrop, testERC20 } = await loadFixture(
        deployAirdropFixture
      );

      const claimInfo = airdropInfo.claims[sampleAddress];
      const amount = BigInt(claimInfo.amount);
      await testERC20.transfer(merkleAirdrop.target, amount);
      await expect(
        merkleAirdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof,
          { value: ethers.parseEther("0.0001") }
        )
      ).to.be.revertedWithCustomError(merkleAirdrop, "IncorrectAmount");
    });

    it("Should fail to claim with not enough amount", async function () {
      const { merkleAirdrop, testERC20, addr1 } = await loadFixture(
        deployAirdropFixture
      );

      const claimInfo = airdropInfo.claims[sampleAddress];
      const amount = BigInt(claimInfo.amount);
      await testERC20.transfer(merkleAirdrop.target, amount);
      await expect(
        merkleAirdrop.claim(
          claimInfo.index,
          sampleAddress,
          BigInt(claimInfo.amount) + 1n,
          claimInfo.proof,
          { value: ethers.parseEther("0.0002") }
        )
      ).to.be.revertedWithCustomError(merkleAirdrop, "AmountNotEnough");
    });

    it("Should fail to claim with incorrect address with InvalidProof error", async function () {
      const { merkleAirdrop, testERC20, addr1 } = await loadFixture(
        deployAirdropFixture
      );

      const claimInfo = airdropInfo.claims[sampleAddress];
      const amount = BigInt(claimInfo.amount);
      await testERC20.transfer(merkleAirdrop.target, amount);
      await expect(
        merkleAirdrop.claim(
          claimInfo.index,
          addr1.address,
          claimInfo.amount,
          claimInfo.proof,
          { value: ethers.parseEther("0.0002") }
        )
      ).to.be.revertedWithCustomError(merkleAirdrop, "InvalidProof");
    });

    it("Should fail to claim with incorrect amount with InvalidProof error", async function () {
      const { merkleAirdrop, testERC20 } = await loadFixture(
        deployAirdropFixture
      );

      const claimInfo = airdropInfo.claims[sampleAddress];
      const amount = BigInt(claimInfo.amount);
      await testERC20.transfer(merkleAirdrop.target, amount);
      await expect(
        merkleAirdrop.claim(
          claimInfo.index,
          sampleAddress,
          BigInt(claimInfo.amount) - 1n,
          claimInfo.proof,
          { value: ethers.parseEther("0.0002") }
        )
      ).to.be.revertedWithCustomError(merkleAirdrop, "InvalidProof");
    });

    it("Should fail to claim with incorrect proof with InvalidProof error", async function () {
      const { merkleAirdrop, testERC20 } = await loadFixture(
        deployAirdropFixture
      );

      const claimInfo = airdropInfo.claims[sampleAddress];
      const amount = BigInt(claimInfo.amount);
      await testERC20.transfer(merkleAirdrop.target, amount);
      await expect(
        merkleAirdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          [
            "0xe0c04daac9552fb5491797ebf760e5275d4d7f35d37a8dae3295d701be1de2b5",
            "0x70a3c131f80bc21341be1df819ba8f542b015d5e9587b45d8a30c45f400577ed",
          ],
          { value: ethers.parseEther("0.0002") }
        )
      ).to.be.revertedWithCustomError(merkleAirdrop, "InvalidProof");
    });

    it("Should fail to claim second time", async function () {
      const { merkleAirdrop, testERC20 } = await loadFixture(
        deployAirdropFixture
      );

      const claimInfo = airdropInfo.claims[sampleAddress];
      const amount = BigInt(claimInfo.amount);
      await testERC20.transfer(merkleAirdrop.target, amount);

      await expect(
        merkleAirdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof,
          { value: ethers.parseEther("0.0002") }
        )
      ).to.not.be.reverted;

      await expect(
        merkleAirdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof,
          { value: ethers.parseEther("0.0002") }
        )
      ).to.be.revertedWithCustomError(merkleAirdrop, "AlreadyClaimed");
    });
  });

  describe("withdrawClaimFee", function () {
    // 正常な手数料回収
    it("withdrawClaimFee_success_1", async function () {
      const { merkleAirdrop, owner, testERC20 } = await loadFixture(
        deployAirdropFixture
      );
      const claimInfo = airdropInfo.claims[sampleAddress];
      const amount = BigInt(claimInfo.amount);
      await testERC20.transfer(merkleAirdrop.target, amount);
      await merkleAirdrop.claim(
        claimInfo.index,
        sampleAddress,
        claimInfo.amount,
        claimInfo.proof,
        { value: ethers.parseEther("0.0002") }
      );
      await expect(merkleAirdrop.withdrawClaimFee()).to.changeEtherBalances(
        [merkleAirdrop, owner],
        [`-${ethers.parseEther("0.0001")}`, ethers.parseEther("0.0001")]
      );
    });

    // オーナー以外の手数料回収
    it("withdrawClaimFee_fail_2", async function () {
      const { merkleAirdrop, addr1, testERC20 } = await loadFixture(
        deployAirdropFixture
      );
      const claimInfo = airdropInfo.claims[sampleAddress];
      const amount = BigInt(claimInfo.amount);
      await testERC20.transfer(merkleAirdrop.target, amount);
      await merkleAirdrop.claim(
        claimInfo.index,
        sampleAddress,
        claimInfo.amount,
        claimInfo.proof,
        { value: ethers.parseEther("0.0002") }
      );
      await expect(merkleAirdrop.connect(addr1).withdrawClaimFee()).to.be
        .reverted;
    });
  });
});
