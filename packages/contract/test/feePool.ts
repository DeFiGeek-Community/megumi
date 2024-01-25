import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { sendEther } from "./lib/scenarioHelper";

describe("FeePool", function () {
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

  describe("withdrawEther", function () {
    // 正常な手数料回収
    it("withdrawEther_success_1", async function () {
      const { feePool, owner } = await loadFixture(
        deployFactoryAndFeePoolFixture
      );
      sendEther(feePool.address, "1", owner);
      await expect(
        feePool.connect(owner).withdrawEther(owner.address)
      ).to.changeEtherBalances(
        [feePool, owner],
        [`-${ethers.utils.parseEther("1")}`, ethers.utils.parseEther("1")]
      );
    });

    // Nullアドレスへの手数料回収
    it("withdrawEther_fail_1", async function () {
      const { feePool, owner } = await loadFixture(
        deployFactoryAndFeePoolFixture
      );
      sendEther(feePool.address, "1", owner);
      await expect(
        feePool.connect(owner).withdrawEther(ethers.constants.AddressZero)
      ).to.be.revertedWith("Don't discard treasury!");
    });

    // オーナー以外の手数料回収
    it("withdrawEther_fail_2", async function () {
      const { feePool, owner, addr1 } = await loadFixture(
        deployFactoryAndFeePoolFixture
      );
      sendEther(feePool.address, "1", owner);
      await expect(feePool.connect(addr1).withdrawEther(addr1.address)).to.be
        .reverted;
    });
  });
});
