const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber, constants } = require("ethers");
const { SignatureTransfer, PERMIT2_ADDRESS } = require("@uniswap/permit2-sdk");

const MaxUint = constants.MaxUint256;
const sampleAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const airdropInfo = {
  name: ethers.utils.hexZeroPad(
    ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test")),
    32
  ),
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
  async function deployFixture() {
    const [owner, addr1] = await ethers.getSigners();

    const MerkleAirdrop = await ethers.getContractFactory("MerkleAirdrop");
    const merkleAirdrop = await MerkleAirdrop.deploy(PERMIT2_ADDRESS);
    await merkleAirdrop.deployed();

    const TestERC20 = await ethers.getContractFactory("TestERC20");
    const testERC20 = await TestERC20.deploy(
      "TestERC20",
      "TEST",
      ethers.utils.parseEther("100")
    );
    await testERC20.deployed();

    return { merkleAirdrop, testERC20, owner, addr1 };
  }

  async function deployAndRegistFixture() {
    const [owner, addr1] = await ethers.getSigners();

    const MerkleAirdrop = await ethers.getContractFactory("MerkleAirdrop");
    const merkleAirdrop = await MerkleAirdrop.deploy(PERMIT2_ADDRESS);
    await merkleAirdrop.deployed();

    const TestERC20 = await ethers.getContractFactory("TestERC20");
    const testERC20 = await TestERC20.deploy(
      "TestERC20",
      "TEST",
      ethers.utils.parseEther("100")
    );
    await testERC20.deployed();

    await merkleAirdrop.registAirdropInfo(
      airdropInfo.name,
      testERC20.address,
      airdropInfo.merkleRoot
    );

    return { merkleAirdrop, testERC20, owner, addr1 };
  }

  describe("Deploy", function () {
    it("Should success", async function () {
      const { merkleAirdrop } = await loadFixture(deployFixture);

      expect(merkleAirdrop.address).to.be.ok;
    });
  });

  describe("Regist AirdropInfo", function () {
    it("Should success registAirdropInfo", async function () {
      const { merkleAirdrop, testERC20 } = await loadFixture(deployFixture);

      await expect(
        merkleAirdrop.registAirdropInfo(
          airdropInfo.name,
          testERC20.address,
          airdropInfo.merkleRoot
        )
      ).to.not.be.reverted;
    });

    it("Should fail registAirdropInfo with same name", async function () {
      const { merkleAirdrop, testERC20 } = await loadFixture(deployFixture);

      const name = airdropInfo.name;

      await expect(
        merkleAirdrop.registAirdropInfo(
          name,
          testERC20.address,
          airdropInfo.merkleRoot
        )
      ).to.not.be.reverted;
      await expect(
        merkleAirdrop.registAirdropInfo(
          name,
          testERC20.address,
          airdropInfo.merkleRoot
        )
      ).to.be.reverted;
    });

    it("Should success registAirdropInfoWithDeposit", async function () {
      const { owner, merkleAirdrop, testERC20 } = await loadFixture(
        deployFixture
      );

      const claimInfo = airdropInfo.claims[sampleAddress];
      const amount = BigNumber.from(claimInfo.amount);
      const permit = {
        permitted: {
          token: testERC20.address,
          amount: amount,
        },
        spender: merkleAirdrop.address,
        nonce: 0,
        deadline: MaxUint,
      };
      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        PERMIT2_ADDRESS,
        31337
      );
      const signature = await owner._signTypedData(domain, types, values);

      await testERC20.approve(PERMIT2_ADDRESS, MaxUint);
      await expect(
        merkleAirdrop.registAirdropInfoWithDeposit(
          airdropInfo.name,
          testERC20.address,
          airdropInfo.merkleRoot,
          amount,
          0,
          MaxUint,
          signature
        )
      ).to.not.be.reverted;
    });

    it("Should success depositAirdropToken", async function () {
      const { owner, merkleAirdrop, testERC20 } = await loadFixture(
        deployAndRegistFixture
      );

      const claimInfo = airdropInfo.claims[sampleAddress];
      const amount = BigNumber.from(claimInfo.amount);
      const permit = {
        permitted: {
          token: testERC20.address,
          amount: amount,
        },
        spender: merkleAirdrop.address,
        nonce: 1,
        deadline: MaxUint,
      };
      const { domain, types, values } = SignatureTransfer.getPermitData(
        permit,
        PERMIT2_ADDRESS,
        31337
      );
      const signature = await owner._signTypedData(domain, types, values);

      await testERC20.approve(PERMIT2_ADDRESS, MaxUint);
      await expect(
        merkleAirdrop.depositAirdropToken(
          airdropInfo.name,
          amount,
          1,
          MaxUint,
          signature
        )
      ).to.not.be.reverted;
    });

    it("Should success withdrawDepositedToken by owner", async function () {
      const { merkleAirdrop } = await loadFixture(deployAndRegistFixture);

      await expect(merkleAirdrop.withdrawDepositedToken(airdropInfo.name)).to
        .not.be.reverted;
    });

    it("Should fail withdrawDepositedToken by other account", async function () {
      const { merkleAirdrop, addr1 } = await loadFixture(
        deployAndRegistFixture
      );

      await expect(
        merkleAirdrop.connect(addr1).withdrawDepositedToken(airdropInfo.name)
      ).to.be.reverted;
    });
  });

  describe("Watch AirdropInfo", function () {
    it("Should success isAirdropInfoExist", async function () {
      const { merkleAirdrop } = await loadFixture(deployAndRegistFixture);

      expect(await merkleAirdrop.isAirdropInfoExist(airdropInfo.name)).to.not.be
        .reverted;
    });

    it("Should success getAirdropInfo", async function () {
      const { merkleAirdrop } = await loadFixture(deployAndRegistFixture);

      expect(await merkleAirdrop.getAirdropInfo(airdropInfo.name)).to.not.be
        .reverted;
    });

    it("Should success isClaimed", async function () {
      const { merkleAirdrop } = await loadFixture(deployAndRegistFixture);

      expect(await merkleAirdrop.isClaimed(airdropInfo.name, 0)).to.not.be
        .reverted;
    });
  });

  describe("Claim AirdropInfo", function () {
    it("Should success claim", async function () {
      const { merkleAirdrop, testERC20, owner } = await loadFixture(
        deployAndRegistFixture
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
      await merkleAirdrop.depositAirdropToken(
        airdropInfo.name,
        amount,
        2,
        MaxUint,
        signature
      );
      await expect(
        merkleAirdrop.claim(
          airdropInfo.name,
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof
        )
      ).to.not.be.reverted;
    });

    it("Should fail claim second time", async function () {
      const { merkleAirdrop, testERC20, owner } = await loadFixture(
        deployAndRegistFixture
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
      await merkleAirdrop.depositAirdropToken(
        airdropInfo.name,
        amount,
        3,
        MaxUint,
        signature
      );
      await expect(
        merkleAirdrop.claim(
          airdropInfo.name,
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof
        )
      ).to.not.be.reverted;

      await expect(
        merkleAirdrop.claim(
          airdropInfo.name,
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof
        )
      ).to.be.reverted;
    });
  });
});
