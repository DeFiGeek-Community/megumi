import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, constants } from "ethers";
import { SignatureTransfer, PERMIT2_ADDRESS } from "@uniswap/permit2-sdk";
import { TemplateType, deployMerkleAirdrop } from "./scenarioHelper";

const MaxUint = constants.MaxUint256;
const sampleAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const airdropInfo = {
  uuid: "0x550e8400e29b41d4a71644665544000000000000000000000000000000000000",
  merkleRoot:
    "0xdefa96435aec82d201dbd2e5f050fb4e1fef5edac90ce1e03953f916a5e1132d",
  tokenTotal: "0x64",
  claims: {
    "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f": {
      index: 0,
      amount: "0x64",
      proof: [],
    },
  },
};

describe("MerkleAirdrop contract", function () {
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
      TemplateType.STANDARD,
      data.factory,
      [
        data.owner.address,
        airdropInfo.merkleRoot,
        data.testERC20.address,
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
        TemplateType.STANDARD,
        factory,
        [
          owner.address,
          airdropInfo.merkleRoot,
          testERC20.address,
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
          TemplateType.STANDARD,
          factory,
          [
            owner.address,
            airdropInfo.merkleRoot,
            testERC20.address,
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
          TemplateType.STANDARD,
          factory,
          [
            owner.address,
            airdropInfo.merkleRoot,
            testERC20.address,
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
          TemplateType.STANDARD,
          factory,
          [
            owner.address,
            airdropInfo.merkleRoot,
            testERC20.address,
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
        TemplateType.STANDARD,
        factory,
        [
          owner.address,
          airdropInfo.merkleRoot,
          testERC20.address,
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
        TemplateType.STANDARD,
        factory,
        [
          owner.address,
          airdropInfo.merkleRoot,
          testERC20.address,
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
      const { merkleAirdrop, addr1 } = await loadFixture(deployAirdropFixture);

      expect(await merkleAirdrop.getAirdropInfo()).to.not.be.reverted;
    });

    it("Should success isClaimed", async function () {
      const { merkleAirdrop, addr1 } = await loadFixture(deployAirdropFixture);

      expect(await merkleAirdrop.isClaimed(0)).to.not.be.reverted;
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
      await expect(
        merkleAirdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof,
          { value: ethers.utils.parseEther("0.0002") }
        )
      ).to.not.be.reverted;
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
      ).to.be.reverted;
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
      ).to.not.be.reverted;

      await expect(
        merkleAirdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof
        )
      ).to.be.reverted;
    });
  });
});
