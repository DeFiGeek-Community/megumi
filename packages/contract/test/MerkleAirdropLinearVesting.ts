import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { SignatureTransfer, PERMIT2_ADDRESS } from "@uniswap/permit2-sdk";
import { deployMerkleAirdrop } from "./lib/scenarioHelper";
import { MaxUint, sampleAddress, airdropInfo } from "./lib/constants";
import { TemplateType } from "./lib/types";

describe("MerkleAirdropLinearVesting contract", function () {
  const templateName = ethers.utils.formatBytes32String(
    TemplateType.LINEAR_VESTING
  );
  const vestingDuration = 3600 * 24 * 100; // 100日

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
      `MerkleAirdrop${TemplateType.LINEAR_VESTING}`
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
    it("Should success deployMerkleAirdrop", async function () {
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
      // Fee poolの残高がregistrationFeeであることを確認
      expect(await ethers.provider.getBalance(feePool.address)).to.be.eq(
        ethers.utils.parseEther("0.01")
      );
    });

    it("Should fail registAirdropInfo with same salt", async function () {
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
          ethers.utils.parseEther("0.01").toBigInt(),
          airdropInfo.uuid
        )
      ).to.not.be.reverted;
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
          ethers.utils.parseEther("0.01").toBigInt(),
          airdropInfo.uuid
        )
      ).to.be.reverted;
    });

    it("Should fail registAirdropInfo with invalid registFee", async function () {
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

    it("Should success registAirdropInfoWithDeposit", async function () {
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

    it("Should success withdrawDepositedToken by owner", async function () {
      const { merkleAirdrop } = await loadFixture(deployAirdropFixture);

      await expect(merkleAirdrop.withdrawDepositedToken()).to.not.be.reverted;
    });

    it("Should fail withdrawDepositedToken by other account", async function () {
      const { merkleAirdrop, addr1 } = await loadFixture(deployAirdropFixture);

      await expect(merkleAirdrop.connect(addr1).withdrawDepositedToken()).to.be
        .reverted;
    });
  });

  describe("Watch AirdropInfo", function () {
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

    it("Should success isClaimed", async function () {
      const { merkleAirdrop } = await loadFixture(deployAirdropFixture);

      expect(await merkleAirdrop.isClaimed(0)).to.be.false;
    });
  });

  describe("Claim AirdropInfo", function () {
    it("Should success claim", async function () {
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
      expect(await merkleAirdrop.isClaimed(claimInfo.index)).to.be.true;
    });

    it("Should fail claim incorrect claimFee", async function () {
      const { merkleAirdrop, testERC20, owner } = await loadFixture(
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

    it("Should fail claim second time", async function () {
      const { merkleAirdrop, testERC20, owner } = await loadFixture(
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

      await time.increase(vestingDuration / 2);

      await expect(
        merkleAirdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof,
          { value: ethers.utils.parseEther("0.0002") }
        )
      ).to.not.be.reverted;
      expect(await testERC20.balanceOf(sampleAddress)).to.be.eq(50);

      await time.increase(vestingDuration / 2);

      await expect(
        merkleAirdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof,
          { value: ethers.utils.parseEther("0.0002") }
        )
      ).to.be.revertedWithCustomError(merkleAirdrop, "IncorrectAmount");

      await expect(
        merkleAirdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof
        )
      ).to.not.be.reverted;
      expect(await testERC20.balanceOf(sampleAddress)).to.be.eq(100);

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
