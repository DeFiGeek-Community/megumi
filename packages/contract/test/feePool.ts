import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { sendEther } from "./lib/scenarioHelper";
import { deployFactoryAndFeePoolFixture } from "./lib/fixtures";

describe("FeePool", function () {
  describe("withdrawEther", function () {
    // 正常な手数料回収
    it("withdrawEther_success_1", async function () {
      const { feePool, owner } = await loadFixture(
        deployFactoryAndFeePoolFixture
      );
      await sendEther(feePool.address, "1", owner);
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
      await sendEther(feePool.address, "1", owner);
      await expect(
        feePool.connect(owner).withdrawEther(ethers.constants.AddressZero)
      ).to.be.revertedWith("Don't discard treasury!");
    });

    // オーナー以外の手数料回収
    it("withdrawEther_fail_2", async function () {
      const { feePool, owner, addr1 } = await loadFixture(
        deployFactoryAndFeePoolFixture
      );
      await sendEther(feePool.address, "1", owner);
      await expect(feePool.connect(addr1).withdrawEther(addr1.address)).to.be
        .reverted;
    });
  });
});
