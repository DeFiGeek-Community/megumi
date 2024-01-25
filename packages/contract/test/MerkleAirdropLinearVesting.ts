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
      `MerkleAirdrop${TemplateType.LINEAR_VESTING}`
    );
    const template = await Template.deploy(
      factory.address,
      feePool.address,
      PERMIT2_ADDRESS
    );
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
        3600 * 24 * 100, // 100 day
        0n,
        0,
        0,
        "0x00",
      ],
      ethers.utils.parseEther("0.01").toBigInt(),
      airdropInfo.uuid
    );

    return { ...data, merkleAirdrop };
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
      const { factory, testERC20, owner } = await loadFixture(
        deployFactoryAndTemplateFixture
      );

      const merkleAirdrop = await deployMerkleAirdrop(
        TemplateType.LINEAR_VESTING,
        factory,
        [
          owner.address,
          airdropInfo.merkleRoot,
          testERC20.address,
          3600 * 24 * 100, // 100 day
          0n,
          0,
          0,
          "0x00",
        ],
        ethers.utils.parseEther("0.01").toBigInt()
      );

      expect(merkleAirdrop.address).to.be.ok;
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
            3600 * 24 * 100, // 100 day
            0n,
            0,
            0,
            "0x00",
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
            3600 * 24 * 100, // 100 day
            0n,
            0,
            0,
            "0x00",
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
            3600 * 24 * 100, // 100 day
            0n,
            0,
            0,
            "0x00",
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
      const deadline =
        Math.floor(new Date().getTime() / 1000) + 3600 * 24 * 365;
      const amount = BigInt(claimInfo.amount);
      const permit = {
        permitted: {
          token: testERC20.address,
          amount: amount,
        },
        spender: factory.address,
        nonce: 0,
        deadline: deadline,
      };
      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        PERMIT2_ADDRESS,
        31337
      );
      const signature = await owner._signTypedData(domain, types, values);

      await testERC20.approve(PERMIT2_ADDRESS, MaxUint);

      const airdrop = await deployMerkleAirdrop(
        TemplateType.LINEAR_VESTING,
        factory,
        [
          owner.address,
          airdropInfo.merkleRoot,
          testERC20.address,
          3600 * 24 * 100, // 100 day
          amount,
          0, // nonce for permit
          deadline, // deadline
          signature, // signature
        ],
        ethers.utils.parseEther("0.01").toBigInt(),
        airdropInfo.uuid
      );

      expect(await testERC20.balanceOf(airdrop.address)).to.be.eq(amount);
      expect(await testERC20.balanceOf(factory.address)).to.be.eq(0);
    });

    it("Should success depositAirdropToken", async function () {
      const { factory, testERC20, owner } = await loadFixture(
        deployFactoryAndTemplateFixture
      );

      const claimInfo = airdropInfo.claims[sampleAddress];

      const airdrop = await deployMerkleAirdrop(
        TemplateType.LINEAR_VESTING,
        factory,
        [
          owner.address,
          airdropInfo.merkleRoot,
          testERC20.address,
          3600 * 24 * 100, // 100 day
          0n,
          0,
          0,
          "0x00",
        ],
        ethers.utils.parseEther("0.01").toBigInt(),
        airdropInfo.uuid
      );

      const amount = BigNumber.from(claimInfo.amount);
      const deadline =
        Math.floor(new Date().getTime() / 1000) + 3600 * 24 * 365;
      const permit = {
        permitted: {
          token: testERC20.address,
          amount: amount,
        },
        spender: airdrop.address,
        nonce: 1,
        deadline: deadline,
      };
      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        PERMIT2_ADDRESS,
        31337
      );
      const signature = await owner._signTypedData(domain, types, values);

      await testERC20.approve(PERMIT2_ADDRESS, MaxUint);
      await expect(airdrop.depositAirdropToken(amount, 1, deadline, signature))
        .to.not.be.reverted;
      expect(await testERC20.balanceOf(airdrop.address)).to.be.eq(amount);
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
      const { merkleAirdrop, owner, testERC20 } = await loadFixture(
        deployAirdropFixture
      );

      expect((await merkleAirdrop.getAirdropInfo()).slice(0, 5)).to.deep.eq([
        testERC20.address,
        owner.address,
        airdropInfo.merkleRoot,
        BigNumber.from(0),
        BigNumber.from(0),
      ]);
    });

    it("Should success isClaimed", async function () {
      const { merkleAirdrop, addr1 } = await loadFixture(deployAirdropFixture);

      expect(await merkleAirdrop.isClaimed(0)).to.be.eq(false);
    });
  });

  describe("Claim AirdropInfo", function () {
    it("Should success claim", async function () {
      const { merkleAirdrop, testERC20, owner } = await loadFixture(
        deployAirdropFixture
      );

      const claimInfo = airdropInfo.claims[sampleAddress];
      const amount = BigNumber.from(claimInfo.amount);
      const permit = {
        permitted: {
          token: testERC20.address,
          amount: amount,
        },
        spender: merkleAirdrop.address,
        nonce: 2,
        deadline: MaxUint,
      };
      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        PERMIT2_ADDRESS,
        31337
      );
      const signature = await owner._signTypedData(domain, types, values);

      await testERC20.approve(PERMIT2_ADDRESS, MaxUint);
      await merkleAirdrop.depositAirdropToken(amount, 2, MaxUint, signature);

      await time.increase(3600 * 24 * 100);

      await expect(
        merkleAirdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof,
          { value: ethers.utils.parseEther("0.0002") }
        )
      ).to.changeTokenBalance(testERC20, sampleAddress, amount);
    });

    it("Should fail claim incorrect claimFee", async function () {
      const { merkleAirdrop, testERC20, owner } = await loadFixture(
        deployAirdropFixture
      );

      const claimInfo = airdropInfo.claims[sampleAddress];
      const amount = BigNumber.from(claimInfo.amount);
      const permit = {
        permitted: {
          token: testERC20.address,
          amount: amount,
        },
        spender: merkleAirdrop.address,
        nonce: 2,
        deadline: MaxUint,
      };
      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        PERMIT2_ADDRESS,
        31337
      );
      const signature = await owner._signTypedData(domain, types, values);

      await testERC20.approve(PERMIT2_ADDRESS, MaxUint);
      await merkleAirdrop.depositAirdropToken(amount, 2, MaxUint, signature);
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
      const permit = {
        permitted: {
          token: testERC20.address,
          amount: amount,
        },
        spender: merkleAirdrop.address,
        nonce: 3,
        deadline: MaxUint,
      };
      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        PERMIT2_ADDRESS,
        31337
      );
      const signature = await owner._signTypedData(domain, types, values);

      await testERC20.approve(PERMIT2_ADDRESS, MaxUint);
      await merkleAirdrop.depositAirdropToken(amount, 3, MaxUint, signature);

      await expect(
        merkleAirdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof,
          { value: ethers.utils.parseEther("0.0002") }
        )
      ).revertedWithCustomError(merkleAirdrop, "NothingToClaim");

      await time.increase(3600 * 24 * 50);

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

      await time.increase(3600 * 24 * 50);

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
});
