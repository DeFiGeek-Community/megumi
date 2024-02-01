import {
  loadFixture,
  time,
  takeSnapshot,
} from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { deployMerkleAirdrop } from "../lib/scenarioHelper";
import { deployFactoryAndFeePoolFixture } from "../lib/fixtures";
import { MaxUint, sampleAddress, airdropInfo } from "../lib/constants";
import { TemplateType } from "../../scripts/types";

describe("MerkleAirdropLinearVesting contract", function () {
  const templateName = ethers.utils.formatBytes32String(
    TemplateType.LINEAR_VESTING
  );
  const vestingDuration = 3600 * 24 * 100; // 100日

  async function deployFactoryAndTemplateFixture() {
    const { factory, feePool, owner, addr1, addr2 } = await loadFixture(
      deployFactoryAndFeePoolFixture
    );

    const Template = await ethers.getContractFactory(
      TemplateType.LINEAR_VESTING
    );
    const template = await Template.deploy(factory.address, feePool.address);
    await template.deployed();

    await factory.addTemplate(
      templateName,
      template.address,
      Template.interface.getSighash("initialize"),
      Template.interface.getSighash("initializeTransfer")
    );

    const TestERC20 = await ethers.getContractFactory("TestERC20");
    const testERC20 = await TestERC20.deploy(
      "TestERC20",
      "TEST",
      ethers.utils.parseEther("100")
    );
    await testERC20.deployed();

    return {
      factory,
      feePool,
      template,
      testERC20,
      owner,
      addr1,
      addr2,
    };
  }
  async function deployAirdropFixture() {
    const data = await loadFixture(deployFactoryAndTemplateFixture);

    const merkleAirdrop = await deployMerkleAirdrop(
      TemplateType.LINEAR_VESTING,
      data.factory,
      [
        data.owner.address,
        airdropInfo.merkleRoot,
        data.testERC20.address,
        vestingDuration,
        0n,
      ],
      ethers.utils.parseEther("0.01").toBigInt(),
      airdropInfo.uuid
    );
    const merkleAirdropDeployedAt = await time.latest();

    return { ...data, merkleAirdrop, merkleAirdropDeployedAt };
  }

  describe("Deploy", function () {
    it("Should success", async function () {
      const { factory, template } = await loadFixture(
        deployFactoryAndTemplateFixture
      );

      expect(factory.address).to.be.ok;
      expect(template.address).to.be.ok;
    });
  });

  describe("Register AirdropInfo", function () {
    it("Should success initialize", async function () {
      const { factory, feePool, testERC20, owner } = await loadFixture(
        deployFactoryAndTemplateFixture
      );

      const merkleAirdrop = await deployMerkleAirdrop(
        TemplateType.LINEAR_VESTING,
        factory,
        [
          owner.address,
          airdropInfo.merkleRoot,
          testERC20.address,
          vestingDuration,
          0n,
        ],
        ethers.utils.parseEther("0.01").toBigInt()
      );

      expect(merkleAirdrop.address).to.be.ok;
      expect(await merkleAirdrop.owner()).to.be.eq(owner.address);
      expect(await merkleAirdrop.token()).to.be.eq(testERC20.address);
      expect(await merkleAirdrop.merkleRoot()).to.be.eq(airdropInfo.merkleRoot);
      expect(await merkleAirdrop.vestingStart()).to.be.eq(await time.latest());
      expect(await merkleAirdrop.vestingDuration()).to.be.eq(vestingDuration);
      // Fee poolの残高がregistrationFeeであることを確認
      expect(await ethers.provider.getBalance(feePool.address)).to.be.eq(
        ethers.utils.parseEther("0.01")
      );
    });

    it("Should revert initialize with invalid registrationFee", async function () {
      const { factory, testERC20, owner } = await loadFixture(
        deployFactoryAndTemplateFixture
      );

      await expect(
        deployMerkleAirdrop(
          TemplateType.LINEAR_VESTING,
          factory,
          [
            owner.address,
            airdropInfo.merkleRoot,
            testERC20.address,
            vestingDuration,
            0n,
          ],
          ethers.utils.parseEther("0.1").toBigInt(),
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

      await testERC20.approve(factory.address, MaxUint);

      const airdrop = await deployMerkleAirdrop(
        TemplateType.LINEAR_VESTING,
        factory,
        [
          owner.address,
          airdropInfo.merkleRoot,
          testERC20.address,
          vestingDuration,
          amount,
        ],
        ethers.utils.parseEther("0.01").toBigInt(),
        airdropInfo.uuid
      );

      expect(await testERC20.balanceOf(airdrop.address)).to.be.eq(amount);
      expect(await testERC20.balanceOf(factory.address)).to.be.eq(0);
    });

    it("Should fail to initialize with 0 vesting duration", async function () {
      const { factory, testERC20, owner } = await loadFixture(
        deployFactoryAndTemplateFixture
      );

      const claimInfo = airdropInfo.claims[sampleAddress];
      const amount = BigInt(claimInfo.amount);

      await testERC20.approve(factory.address, MaxUint);

      await expect(
        deployMerkleAirdrop(
          TemplateType.LINEAR_VESTING,
          factory,
          [owner.address, airdropInfo.merkleRoot, testERC20.address, 0, amount],
          ethers.utils.parseEther("0.01").toBigInt(),
          airdropInfo.uuid
        )
      ).to.be.reverted;
    });
  });

  describe("getAirdropInfo", function () {
    it("Should success getAirdropInfo", async function () {
      const { merkleAirdrop, owner, testERC20, merkleAirdropDeployedAt } =
        await loadFixture(deployAirdropFixture);

      expect((await merkleAirdrop.getAirdropInfo()).slice(0, 6)).to.deep.eq([
        testERC20.address,
        owner.address,
        airdropInfo.merkleRoot,
        BigNumber.from(0),
        merkleAirdropDeployedAt,
        vestingDuration,
      ]);
    });
  });

  describe("claim", function () {
    it("Should success to claim", async function () {
      const { merkleAirdrop, feePool, testERC20 } = await loadFixture(
        deployAirdropFixture
      );

      const claimInfo = airdropInfo.claims[sampleAddress];
      const amount = BigNumber.from(claimInfo.amount);
      await testERC20.transfer(merkleAirdrop.address, amount);

      await time.increase(vestingDuration);

      await expect(
        merkleAirdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof,
          { value: ethers.utils.parseEther("0.0002") }
        )
      ).to.changeTokenBalance(testERC20, sampleAddress, amount);
      // Fee poolの残高がregistrationFee + claimFeeであることを確認
      expect(await ethers.provider.getBalance(feePool.address)).to.be.eq(
        ethers.utils.parseEther("0.0101")
      );
      expect(
        merkleAirdrop.callStatic.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof
        )
      ).to.be.revertedWithCustomError(merkleAirdrop, "AlreadyClaimed");
    });

    it("Should fail to claim incorrect claimFee", async function () {
      const { merkleAirdrop, testERC20 } = await loadFixture(
        deployAirdropFixture
      );

      const claimInfo = airdropInfo.claims[sampleAddress];
      const amount = BigNumber.from(claimInfo.amount);
      await testERC20.transfer(merkleAirdrop.address, amount);
      await expect(
        merkleAirdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof,
          { value: ethers.utils.parseEther("0.0001") }
        )
      ).to.be.revertedWithCustomError(merkleAirdrop, "IncorrectAmount");
    });

    it("Should fail to claim with not enough amount", async function () {
      const { merkleAirdrop, testERC20 } = await loadFixture(
        deployAirdropFixture
      );

      const claimInfo = airdropInfo.claims[sampleAddress];
      const amount = BigNumber.from(claimInfo.amount);
      await testERC20.transfer(merkleAirdrop.address, amount.sub(1));
      await time.increase(vestingDuration);
      await expect(
        merkleAirdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof,
          { value: ethers.utils.parseEther("0.0002") }
        )
      ).to.be.revertedWithCustomError(merkleAirdrop, "AmountNotEnough");
    });

    it("Should fail to claim with incorrect address with InvalidProof error", async function () {
      const { merkleAirdrop, testERC20, addr1 } = await loadFixture(
        deployAirdropFixture
      );

      const claimInfo = airdropInfo.claims[sampleAddress];
      const amount = BigNumber.from(claimInfo.amount);
      await testERC20.transfer(merkleAirdrop.address, amount);
      await expect(
        merkleAirdrop.claim(
          claimInfo.index,
          addr1.address,
          claimInfo.amount,
          claimInfo.proof,
          { value: ethers.utils.parseEther("0.0002") }
        )
      ).to.be.revertedWithCustomError(merkleAirdrop, "InvalidProof");
    });

    it("Should fail to claim with incorrect amount with InvalidProof error", async function () {
      const { merkleAirdrop, testERC20 } = await loadFixture(
        deployAirdropFixture
      );

      const claimInfo = airdropInfo.claims[sampleAddress];
      const amount = BigNumber.from(claimInfo.amount);
      await testERC20.transfer(merkleAirdrop.address, amount);
      await expect(
        merkleAirdrop.claim(
          claimInfo.index,
          sampleAddress,
          BigNumber.from(claimInfo.amount).sub(1),
          claimInfo.proof,
          { value: ethers.utils.parseEther("0.0002") }
        )
      ).to.be.revertedWithCustomError(merkleAirdrop, "InvalidProof");
    });

    it("Should fail to claim with incorrect proof with InvalidProof error", async function () {
      const { merkleAirdrop, testERC20 } = await loadFixture(
        deployAirdropFixture
      );

      const claimInfo = airdropInfo.claims[sampleAddress];
      const amount = BigNumber.from(claimInfo.amount);
      await testERC20.transfer(merkleAirdrop.address, amount);
      await expect(
        merkleAirdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          [
            "0xe0c04daac9552fb5491797ebf760e5275d4d7f35d37a8dae3295d701be1de2b5",
            "0x70a3c131f80bc21341be1df819ba8f542b015d5e9587b45d8a30c45f400577ed",
          ],
          { value: ethers.utils.parseEther("0.0002") }
        )
      ).to.be.revertedWithCustomError(merkleAirdrop, "InvalidProof");
    });

    it("Should fail to claim when claimable token amount is 0", async function () {
      const { merkleAirdrop, testERC20 } = await loadFixture(
        deployAirdropFixture
      );

      const claimInfo = airdropInfo.claims[sampleAddress];
      const amount = BigNumber.from(claimInfo.amount);
      await testERC20.transfer(merkleAirdrop.address, amount);

      await expect(
        merkleAirdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof,
          { value: ethers.utils.parseEther("0.0002") }
        )
      ).revertedWithCustomError(merkleAirdrop, "NothingToClaim");
    });

    it("Should success to claim half and the full eligible amount after 50 days and 100 days respectively", async function () {
      const { merkleAirdrop, testERC20, feePool } = await loadFixture(
        deployAirdropFixture
      );

      const claimInfo = airdropInfo.claims[sampleAddress];
      const amount = BigNumber.from(claimInfo.amount);
      await testERC20.transfer(merkleAirdrop.address, amount);

      await time.increase(vestingDuration / 2);

      let snapshot = await takeSnapshot();

      await expect(
        merkleAirdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof,
          { value: ethers.utils.parseEther("0.0002") }
        )
      ).to.changeTokenBalances(
        testERC20,
        [merkleAirdrop, sampleAddress],
        [-amount.div(2), amount.div(2)]
      );
      expect(await merkleAirdrop.claimedAmount(sampleAddress)).to.be.eq(
        amount.div(2)
      );

      await snapshot.restore();

      // 1) FeePoolへのプラットフォームFee送信
      // 2) AirdropコントラクトへのクレームFee送信
      await expect(
        merkleAirdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof,
          { value: ethers.utils.parseEther("0.0002") }
        )
      ).to.changeEtherBalances(
        [feePool, merkleAirdrop],
        [ethers.utils.parseEther("0.0001"), ethers.utils.parseEther("0.0001")]
      );

      expect(
        merkleAirdrop.callStatic.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof,
          { value: ethers.utils.parseEther("0.0002") }
        )
      ).to.be.revertedWithCustomError(merkleAirdrop, "NothingToClaim");

      await time.increase(vestingDuration / 2);

      snapshot = await takeSnapshot();

      await expect(
        merkleAirdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof,
          { value: ethers.utils.parseEther("0.0002") }
        )
      ).to.changeTokenBalances(
        testERC20,
        [merkleAirdrop, sampleAddress],
        [-amount.div(2), amount.div(2)]
      );

      await expect(
        merkleAirdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof,
          { value: ethers.utils.parseEther("0.0002") }
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
      const amount = BigNumber.from(claimInfo.amount);
      await testERC20.transfer(merkleAirdrop.address, amount);

      await time.increase(vestingDuration);

      await merkleAirdrop.claim(
        claimInfo.index,
        sampleAddress,
        claimInfo.amount,
        claimInfo.proof,
        { value: ethers.utils.parseEther("0.0002") }
      );
      await expect(merkleAirdrop.withdrawClaimFee()).to.changeEtherBalances(
        [merkleAirdrop, owner],
        [
          `-${ethers.utils.parseEther("0.0001")}`,
          ethers.utils.parseEther("0.0001"),
        ]
      );
    });

    // オーナー以外の手数料回収
    it("withdrawClaimFee_fail_2", async function () {
      const { merkleAirdrop, addr1, testERC20 } = await loadFixture(
        deployAirdropFixture
      );
      const claimInfo = airdropInfo.claims[sampleAddress];
      const amount = BigNumber.from(claimInfo.amount);
      await testERC20.transfer(merkleAirdrop.address, amount);

      await time.increase(vestingDuration);

      await merkleAirdrop.claim(
        claimInfo.index,
        sampleAddress,
        claimInfo.amount,
        claimInfo.proof,
        { value: ethers.utils.parseEther("0.0002") }
      );
      await expect(merkleAirdrop.connect(addr1).withdrawClaimFee()).to.be
        .reverted;
    });
  });
});
