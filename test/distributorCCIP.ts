import { expect } from "chai";
import { ethers, network } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import {
  sendEther,
  deployMerkleAirdrop,
  deployCCIPRouter,
  getImpersonateSigner,
} from "./lib/scenarioHelper";
import { deployFactoryAndFeePoolFixture } from "./lib/fixtures";
import { MaxUint, sampleAddress, airdropInfo } from "./lib/constants";
import { TemplateType } from "../scripts/types";

describe("DistributorCCIP", function () {
  const initialSupply = ethers.parseEther("1000");
  const templateName = ethers.encodeBytes32String(TemplateType.STANDARD);
  const templateNameSender = `${TemplateType.STANDARD}Sender`;
  const templateNameReceiver = `${TemplateType.STANDARD}Receiver`;
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();

  async function deployFactoryAndTemplateFixture() {
    const {
      factory,
      feePool,
      chainSelector,
      distributorSender,
      distributorReceiver,
      wrappedNative,
      linkToken,
      mgm,
      owner,
      addr1,
      addr2,
    } = await loadFixture(deployFactoryAndFeePoolFixture);

    const Template = await ethers.getContractFactory(TemplateType.STANDARD);
    const templateSender = await Template.deploy(
      factory.target,
      feePool.target,
      distributorSender.target
    );
    await templateSender.waitForDeployment();

    await factory.addTemplate(
      ethers.encodeBytes32String(templateNameSender),
      templateSender.target,
      Template.interface.getFunction("initialize")!.selector,
      Template.interface.getFunction("initializeTransfer")!.selector
    );

    const templateReceiver = await Template.deploy(
      factory.target,
      feePool.target,
      distributorReceiver.target
    );
    await templateReceiver.waitForDeployment();

    await factory.addTemplate(
      ethers.encodeBytes32String(templateNameReceiver),
      templateReceiver.target,
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
      chainSelector,
      distributorSender,
      distributorReceiver,
      wrappedNative,
      linkToken,
      mgm,
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

  async function deployTokenFixture() {
    const Token = await ethers.getContractFactory("TestERC20");
    const token = await Token.deploy("Test", "TST", initialSupply);
    await token.waitForDeployment();

    return { token };
  }

  describe("Sender", function () {
    describe("constructor", function () {
      // 正常な初期化
      it("constructor_success_1", async function () {
        const { factory, distributorSender } = await loadFixture(
          deployFactoryAndFeePoolFixture
        );

        expect(await distributorSender.factory()).to.be.equal(factory.target);
      });

      // 権限のない初期化
      it("constructor_fail_1", async function () {
        const { chainSelector, distributorSender, distributorReceiver, addr1 } =
          await loadFixture(deployFactoryAndFeePoolFixture);

        await expect(
          distributorSender
            .connect(addr1)
            .setAllowlistDestinationChainSender(
              chainSelector,
              distributorReceiver.target,
              true
            )
        ).to.be.reverted;
      });
    });

    describe("addScore", function () {
      // 正常なスコアの追加
      it("addScore_success_1", async function () {
        const { factory, distributorSender, testERC20, owner, addr1 } =
          await loadFixture(deployFactoryAndTemplateFixture);

        const airdrop = await deployMerkleAirdrop(
          templateNameSender,
          TemplateType.STANDARD,
          factory,
          [
            owner.address,
            airdropInfo.merkleRoot,
            testERC20.target.toString(),
            0n,
          ],
          ethers.parseEther("0.01"),
          airdropInfo.uuid
        );

        const claimInfo = airdropInfo.claims[sampleAddress];
        const amount = BigInt(claimInfo.amount);
        await testERC20.transfer(airdrop.target, amount);
        await airdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof,
          { value: ethers.parseEther("0.0002") }
        );

        expect(await distributorSender.scores(sampleAddress)).to.be.equal(
          ethers.parseEther("3")
        );
        expect(await distributorSender.scores(owner.address)).to.be.equal(0);
      });
    });

    describe("claim", function () {
      // 正常なクレーム（ネイティブ）
      it("claim_success_1", async function () {
        const {
          factory,
          chainSelector,
          distributorSender,
          distributorReceiver,
          testERC20,
          owner,
        } = await loadFixture(deployFactoryAndTemplateFixture);
        await distributorSender.setAllowlistDestinationChainSender(
          chainSelector,
          distributorReceiver.target,
          true
        );
        await distributorReceiver.setAllowlistSourceChainSender(
          chainSelector,
          distributorSender.target,
          true
        );
        const airdrop = await deployMerkleAirdrop(
          templateNameSender,
          TemplateType.STANDARD,
          factory,
          [
            owner.address,
            airdropInfo.merkleRoot,
            testERC20.target.toString(),
            0n,
          ],
          ethers.parseEther("0.01"),
          airdropInfo.uuid
        );

        const claimInfo = airdropInfo.claims[sampleAddress];
        const amount = BigInt(claimInfo.amount);
        await testERC20.transfer(airdrop.target, amount);
        await airdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof,
          { value: ethers.parseEther("0.0002") }
        );

        const sampleSigner = await getImpersonateSigner(
          sampleAddress,
          network.provider
        );

        const message = {
          receiver: abiCoder.encode(["bytes"], [distributorReceiver.target]),
          data: abiCoder.encode(
            ["address", "uint256", "bool"],
            [sampleAddress, ethers.parseEther("3"), false]
          ),
          tokenAmounts: [],
          extraArgs: "0x",
          feeToken: ethers.ZeroAddress,
        };
        const router = await ethers.getContractAt(
          "IRouterClient",
          await distributorSender.router()
        );
        const feeAmount = await router.getFee(chainSelector, message);
        expect(await distributorSender.scores(sampleAddress)).to.be.equal(
          ethers.parseEther("3")
        );
        expect(await distributorReceiver.scores(sampleAddress)).to.be.equal(
          "0"
        );
        await expect(
          distributorSender
            .connect(sampleSigner)
            .sendScorePayNative(
              chainSelector,
              distributorReceiver.target,
              sampleAddress,
              false,
              { value: feeAmount }
            )
        ).to.not.be.reverted;
        expect(await distributorSender.scores(sampleAddress)).to.be.equal("0");
        expect(await distributorReceiver.scores(sampleAddress)).to.be.equal(
          ethers.parseEther("3")
        );
      });
      // 正常なクレーム（ERC20）
      it("claim_success_2", async function () {
        const {
          factory,
          chainSelector,
          distributorSender,
          distributorReceiver,
          testERC20,
          linkToken,
          owner,
          addr1,
        } = await loadFixture(deployFactoryAndTemplateFixture);
        await distributorSender.setAllowlistDestinationChainSender(
          chainSelector,
          distributorReceiver.target,
          true
        );
        await distributorReceiver.setAllowlistSourceChainSender(
          chainSelector,
          distributorSender.target,
          true
        );
        const airdrop = await deployMerkleAirdrop(
          templateNameSender,
          TemplateType.STANDARD,
          factory,
          [
            owner.address,
            airdropInfo.merkleRoot,
            testERC20.target.toString(),
            0n,
          ],
          ethers.parseEther("0.01"),
          airdropInfo.uuid
        );

        const claimInfo = airdropInfo.claims[sampleAddress];
        const amount = BigInt(claimInfo.amount);
        await testERC20.transfer(airdrop.target, amount);
        await airdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof,
          { value: ethers.parseEther("0.0002") }
        );

        const message = {
          receiver: abiCoder.encode(["bytes"], [distributorReceiver.target]),
          data: abiCoder.encode(
            ["address", "uint256", "bool"],
            [sampleAddress, ethers.parseEther("3"), false]
          ),
          tokenAmounts: [],
          extraArgs: "0x",
          feeToken: linkToken.target,
        };
        const router = await ethers.getContractAt(
          "IRouterClient",
          await distributorSender.router()
        );
        const feeAmount = await router.getFee(chainSelector, message);
        linkToken.transfer(addr1.address, feeAmount);
        await linkToken
          .connect(addr1)
          .approve(distributorSender.target, feeAmount);
        expect(await distributorSender.scores(sampleAddress)).to.be.equal(
          ethers.parseEther("3")
        );
        expect(await distributorReceiver.scores(sampleAddress)).to.be.equal(
          "0"
        );
        await expect(
          distributorSender
            .connect(addr1)
            .sendScorePayToken(
              chainSelector,
              distributorReceiver.target,
              sampleAddress,
              false,
              linkToken
            )
        ).to.not.be.reverted;
        expect(await distributorSender.scores(sampleAddress)).to.be.equal("0");
        expect(await distributorReceiver.scores(sampleAddress)).to.be.equal(
          ethers.parseEther("3")
        );
      });
      // 正常なクレーム（L1でのクレーム）
      it("claim_success_3", async function () {
        const {
          factory,
          chainSelector,
          distributorSender,
          distributorReceiver,
          testERC20,
          mgm,
          owner,
        } = await loadFixture(deployFactoryAndTemplateFixture);
        await distributorSender.setAllowlistDestinationChainSender(
          chainSelector,
          distributorReceiver.target,
          true
        );
        await distributorReceiver.setAllowlistSourceChainSender(
          chainSelector,
          distributorSender.target,
          true
        );
        const airdrop = await deployMerkleAirdrop(
          templateNameSender,
          TemplateType.STANDARD,
          factory,
          [
            owner.address,
            airdropInfo.merkleRoot,
            testERC20.target.toString(),
            0n,
          ],
          ethers.parseEther("0.01"),
          airdropInfo.uuid
        );

        const claimInfo = airdropInfo.claims[sampleAddress];
        const amount = BigInt(claimInfo.amount);
        await testERC20.transfer(airdrop.target, amount);
        await airdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof,
          { value: ethers.parseEther("0.0002") }
        );

        const sampleSigner = await getImpersonateSigner(
          sampleAddress,
          network.provider
        );

        const message = {
          receiver: abiCoder.encode(["bytes"], [distributorReceiver.target]),
          data: abiCoder.encode(
            ["address", "uint256", "bool"],
            [sampleAddress, ethers.parseEther("3"), true]
          ),
          tokenAmounts: [],
          extraArgs: "0x",
          feeToken: ethers.ZeroAddress,
        };
        const router = await ethers.getContractAt(
          "IRouterClient",
          await distributorSender.router()
        );
        const feeAmount = await router.getFee(chainSelector, message);
        mgm.transfer(distributorReceiver.target, ethers.parseEther("1000"));
        expect(await distributorSender.scores(sampleAddress)).to.be.equal(
          ethers.parseEther("3")
        );
        expect(await distributorReceiver.scores(sampleAddress)).to.be.equal(
          "0"
        );

        await distributorReceiver.setToken(mgm.target);

        await expect(
          distributorSender
            .connect(sampleSigner)
            .sendScorePayNative(
              chainSelector,
              distributorReceiver.target,
              sampleAddress,
              true,
              { value: feeAmount }
            )
        ).to.not.be.reverted;
        expect(await distributorSender.scores(sampleAddress)).to.be.equal("0");
        expect(await distributorReceiver.scores(sampleAddress)).to.be.equal(
          ethers.parseEther("0")
        );
        expect(await mgm.balanceOf(sampleAddress)).to.be.equal(
          ethers.parseEther("3")
        );
      });
      // 別アドレス宛のクレーム
      it("claim_success_4", async function () {
        const {
          factory,
          chainSelector,
          distributorSender,
          distributorReceiver,
          testERC20,
          mgm,
          owner,
        } = await loadFixture(deployFactoryAndTemplateFixture);
        await distributorSender.setAllowlistDestinationChainSender(
          chainSelector,
          distributorReceiver.target,
          true
        );
        await distributorReceiver.setAllowlistSourceChainSender(
          chainSelector,
          distributorSender.target,
          true
        );
        const airdrop = await deployMerkleAirdrop(
          templateNameSender,
          TemplateType.STANDARD,
          factory,
          [
            owner.address,
            airdropInfo.merkleRoot,
            testERC20.target.toString(),
            0n,
          ],
          ethers.parseEther("0.01"),
          airdropInfo.uuid
        );

        const claimInfo = airdropInfo.claims[sampleAddress];
        const amount = BigInt(claimInfo.amount);
        await testERC20.transfer(airdrop.target, amount);
        await airdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof,
          { value: ethers.parseEther("0.0002") }
        );

        const message = {
          receiver: abiCoder.encode(["bytes"], [distributorReceiver.target]),
          data: abiCoder.encode(
            ["address", "uint256", "bool"],
            [sampleAddress, ethers.parseEther("3"), true]
          ),
          tokenAmounts: [],
          extraArgs: "0x",
          feeToken: ethers.ZeroAddress,
        };
        const router = await ethers.getContractAt(
          "IRouterClient",
          await distributorSender.router()
        );
        const feeAmount = await router.getFee(chainSelector, message);
        mgm.transfer(distributorReceiver.target, ethers.parseEther("1000"));
        expect(await distributorSender.scores(sampleAddress)).to.be.equal(
          ethers.parseEther("3")
        );
        expect(await distributorReceiver.scores(sampleAddress)).to.be.equal(
          "0"
        );

        await distributorReceiver.setToken(mgm.target);

        await expect(
          distributorSender.sendScorePayNative(
            chainSelector,
            distributorReceiver.target,
            sampleAddress,
            true,
            { value: feeAmount }
          )
        ).to.not.be.reverted;
        expect(await distributorSender.scores(sampleAddress)).to.be.equal("0");
        expect(await distributorReceiver.scores(sampleAddress)).to.be.equal(
          ethers.parseEther("0")
        );
        expect(await mgm.balanceOf(sampleAddress)).to.be.equal(
          ethers.parseEther("3")
        );
      });
      // sender,receiverの設定不足エラー
      it("claim_fail_1", async function () {
        const {
          factory,
          chainSelector,
          distributorSender,
          distributorReceiver,
          testERC20,
          owner,
        } = await loadFixture(deployFactoryAndTemplateFixture);
        const airdrop = await deployMerkleAirdrop(
          templateNameSender,
          TemplateType.STANDARD,
          factory,
          [
            owner.address,
            airdropInfo.merkleRoot,
            testERC20.target.toString(),
            0n,
          ],
          ethers.parseEther("0.01"),
          airdropInfo.uuid
        );

        const claimInfo = airdropInfo.claims[sampleAddress];
        const amount = BigInt(claimInfo.amount);
        await testERC20.transfer(airdrop.target, amount);
        await airdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof,
          { value: ethers.parseEther("0.0002") }
        );

        const sampleSigner = await getImpersonateSigner(
          sampleAddress,
          network.provider
        );

        const message = {
          receiver: abiCoder.encode(["bytes"], [distributorReceiver.target]),
          data: abiCoder.encode(
            ["address", "uint256", "bool"],
            [sampleAddress, ethers.parseEther("3"), false]
          ),
          tokenAmounts: [],
          extraArgs: "0x",
          feeToken: ethers.ZeroAddress,
        };
        const router = await ethers.getContractAt(
          "IRouterClient",
          await distributorSender.router()
        );
        const feeAmount = await router.getFee(chainSelector, message);
        expect(await distributorSender.scores(sampleAddress)).to.be.equal(
          ethers.parseEther("3")
        );
        expect(await distributorReceiver.scores(sampleAddress)).to.be.equal(
          "0"
        );
        await expect(
          distributorSender
            .connect(sampleSigner)
            .sendScorePayNative(
              chainSelector,
              distributorReceiver.target,
              sampleAddress,
              false,
              { value: feeAmount }
            )
        ).to.be.revertedWithCustomError(
          distributorSender,
          `DestinationChainSenderNotAllowlisted`
        );
      });
      // スコアがないユーザのクレーム
      it("claim_fail_2", async function () {
        const { chainSelector, distributorSender, distributorReceiver } =
          await loadFixture(deployFactoryAndTemplateFixture);
        await distributorSender.setAllowlistDestinationChainSender(
          chainSelector,
          distributorReceiver.target,
          true
        );
        await distributorReceiver.setAllowlistSourceChainSender(
          chainSelector,
          distributorSender.target,
          true
        );

        const message = {
          receiver: abiCoder.encode(["bytes"], [distributorReceiver.target]),
          data: abiCoder.encode(
            ["address", "uint256", "bool"],
            [sampleAddress, ethers.parseEther("3"), false]
          ),
          tokenAmounts: [],
          extraArgs: "0x",
          feeToken: ethers.ZeroAddress,
        };
        const router = await ethers.getContractAt(
          "IRouterClient",
          await distributorSender.router()
        );
        const feeAmount = await router.getFee(chainSelector, message);
        expect(await distributorSender.scores(sampleAddress)).to.be.equal(
          ethers.parseEther("0")
        );
        expect(await distributorReceiver.scores(sampleAddress)).to.be.equal(
          "0"
        );

        await expect(
          distributorSender.sendScorePayNative(
            chainSelector,
            distributorReceiver.target,
            sampleAddress,
            false,
            { value: feeAmount }
          )
        ).to.be.revertedWith("Not eligible to get rewarded");
      });
    });
  });

  describe("Receiver", function () {
    describe("constructor", function () {
      // 正常な初期化
      it("constructor_success_1", async function () {
        const {
          factory,
          feePool,
          chainSelector,
          distributorSender,
          distributorReceiver,
          mgm,
          owner,
          addr1,
          addr2,
        } = await loadFixture(deployFactoryAndFeePoolFixture);

        expect(await distributorReceiver.factory()).to.be.equal(factory.target);

        expect(await distributorReceiver.token()).to.be.equal(
          ethers.ZeroAddress
        );
      });

      // 権限のない初期化
      it("constructor_fail_1", async function () {
        const { chainSelector, distributorSender, distributorReceiver, addr1 } =
          await loadFixture(deployFactoryAndFeePoolFixture);

        await expect(
          distributorReceiver
            .connect(addr1)
            .setAllowlistSourceChainSender(
              chainSelector,
              distributorSender.target,
              true
            )
        ).to.be.reverted;
      });
    });

    describe("addScore", function () {
      // 正常なスコアの追加
      it("addScore_success_1", async function () {
        const { factory, distributorReceiver, testERC20, owner, addr1 } =
          await loadFixture(deployFactoryAndTemplateFixture);

        const airdrop = await deployMerkleAirdrop(
          templateNameReceiver,
          TemplateType.STANDARD,
          factory,
          [
            owner.address,
            airdropInfo.merkleRoot,
            testERC20.target.toString(),
            0n,
          ],
          ethers.parseEther("0.01"),
          airdropInfo.uuid
        );

        const claimInfo = airdropInfo.claims[sampleAddress];
        const amount = BigInt(claimInfo.amount);
        await testERC20.transfer(airdrop.target, amount);
        await airdrop.claim(
          claimInfo.index,
          sampleAddress,
          claimInfo.amount,
          claimInfo.proof,
          { value: ethers.parseEther("0.0002") }
        );

        expect(await distributorReceiver.scores(sampleAddress)).to.be.equal(
          ethers.parseEther("3")
        );
        expect(await distributorReceiver.scores(owner.address)).to.be.equal(0);
      });
    });

    // describe("rescueScore", function () {
    //   // 正常なスコアの追加
    //   it("rescueScore_success_1", async function () {
    //     const { distributorReceiver, addr1 } = await loadFixture(
    //       deployFactoryAndTemplateFixture
    //     );

    //     await distributorReceiver.rescueScore(
    //       addr1.address,
    //       ethers.parseEther("100")
    //     );

    //     expect(await distributorReceiver.scores(addr1.address)).to.be.equal(
    //       ethers.parseEther("100")
    //     );
    //   });

    //   // 権限がないスコアの追加
    //   it("rescueScore_fail_1", async function () {
    //     const { distributorReceiver, addr1 } = await loadFixture(
    //       deployFactoryAndTemplateFixture
    //     );

    //     await expect(
    //       distributorReceiver
    //         .connect(addr1)
    //         .rescueScore(addr1.address, ethers.parseEther("100"))
    //     ).to.be.reverted;
    //   });
    // });

    describe("setToken", function () {
      // TODO
    });

    // describe("claim", function () {
    //   // 正常なクレーム
    //   it("claim_success_1", async function () {
    //     const { factory, distributorReceiver, ymwk, owner, addr1 } =
    //       await loadFixture(deployFactoryAndTemplateFixture);

    //     const { token } = await loadFixture(deployTokenFixture);
    //     const allocatedAmount = ethers.parseEther("100");
    //     await token.approve(factory.target, allocatedAmount);
    //     const now = await time.latest();

    //     const sale = await deploySaleTemplate(
    //       factory,
    //       await token.getAddress(),
    //       owner.address,
    //       allocatedAmount,
    //       now + DAY,
    //       DAY,
    //       "0",
    //       undefined,
    //       templateNameReceiver
    //     );

    //     await time.increase(DAY);

    //     await sendEther(sale.target, "1", addr1);

    //     await time.increase(DAY);

    //     await sale.connect(addr1).claim(addr1.address, addr1.address);

    //     await ymwk.transfer(
    //       distributorReceiver.target,
    //       ethers.parseEther("500")
    //     );

    //     await expect(
    //       distributorReceiver.connect(addr1).claim(addr1.address)
    //     ).to.changeTokenBalances(
    //       ymwk,
    //       [distributorReceiver, addr1],
    //       [ethers.parseEther("-100"), ethers.parseEther("100")]
    //     );

    //     expect(await distributorReceiver.scores(addr1.address)).to.be.equal(
    //       "0"
    //     );
    //   });

    //   // スコアがないユーザのクレーム
    //   it("claim_fail_1", async function () {
    //     const { distributorReceiver, ymwk, addr1 } = await loadFixture(
    //       deployFactoryAndTemplateFixture
    //     );

    //     await ymwk.transfer(
    //       distributorReceiver.target,
    //       ethers.parseEther("500")
    //     );

    //     await expect(distributorReceiver.connect(addr1).claim(addr1.address)).to
    //       .be.reverted;
    //   });

    //   // Distributorに十分なトークン残高がない場合のクレーム
    //   it("claim_success_2", async function () {
    //     const { factory, distributorReceiver, ymwk, owner, addr1 } =
    //       await loadFixture(deployFactoryAndTemplateFixture);

    //     const { token } = await loadFixture(deployTokenFixture);
    //     const allocatedAmount = ethers.parseEther("100");
    //     await token.approve(factory.target, allocatedAmount);
    //     const now = await time.latest();

    //     const sale = await deploySaleTemplate(
    //       factory,
    //       await token.getAddress(),
    //       owner.address,
    //       allocatedAmount,
    //       now + DAY,
    //       DAY,
    //       "0",
    //       undefined,
    //       templateNameReceiver
    //     );

    //     await time.increase(DAY);

    //     await sendEther(sale.target, "1", addr1);

    //     await time.increase(DAY);

    //     await sale.connect(addr1).claim(addr1.address, addr1.address);

    //     await ymwk.transfer(
    //       distributorReceiver.target,
    //       ethers.parseEther("50")
    //     );

    //     await expect(
    //       distributorReceiver.connect(addr1).claim(addr1.address)
    //     ).to.changeTokenBalances(
    //       ymwk,
    //       [distributorReceiver, addr1],
    //       [ethers.parseEther("-50"), ethers.parseEther("50")]
    //     );

    //     expect(await distributorReceiver.scores(addr1.address)).to.be.equal(
    //       ethers.parseEther("50")
    //     );
    //   });

    //   // Distributorのトークン残高が0の場合のクレーム
    //   it("claim_success_3", async function () {
    //     const { factory, distributorReceiver, owner, addr1 } =
    //       await loadFixture(deployFactoryAndTemplateFixture);

    //     const { token } = await loadFixture(deployTokenFixture);
    //     const allocatedAmount = ethers.parseEther("100");
    //     await token.approve(factory.target, allocatedAmount);
    //     const now = await time.latest();

    //     const sale = await deploySaleTemplate(
    //       factory,
    //       await token.getAddress(),
    //       owner.address,
    //       allocatedAmount,
    //       now + DAY,
    //       DAY,
    //       "0",
    //       undefined,
    //       templateNameReceiver
    //     );

    //     await time.increase(DAY);

    //     await sendEther(sale.target, "1", addr1);

    //     await time.increase(DAY);

    //     await sale.connect(addr1).claim(addr1.address, addr1.address);

    //     const befScore = await distributorReceiver.scores(addr1.address);

    //     distributorReceiver.connect(addr1).claim(addr1.address);

    //     expect(await distributorReceiver.scores(addr1.address)).to.be.equal(
    //       befScore
    //     );
    //   });

    //   // 別アドレス宛のクレーム
    //   it("claim_success_4", async function () {
    //     const { factory, distributorReceiver, ymwk, owner, addr1, addr2 } =
    //       await loadFixture(deployFactoryAndTemplateFixture);

    //     const { token } = await loadFixture(deployTokenFixture);
    //     const allocatedAmount = ethers.parseEther("100");
    //     await token.approve(factory.target, allocatedAmount);
    //     const now = await time.latest();

    //     const sale = await deploySaleTemplate(
    //       factory,
    //       await token.getAddress(),
    //       owner.address,
    //       allocatedAmount,
    //       now + DAY,
    //       DAY,
    //       "0",
    //       undefined,
    //       templateNameReceiver
    //     );

    //     await time.increase(DAY);

    //     await sendEther(sale.target, "1", addr1);

    //     await time.increase(DAY);

    //     await sale.connect(addr1).claim(addr1.address, addr1.address);

    //     await ymwk.transfer(
    //       distributorReceiver.target,
    //       ethers.parseEther("50")
    //     );

    //     await expect(
    //       distributorReceiver.connect(addr2).claim(addr1.address)
    //     ).to.changeTokenBalances(
    //       ymwk,
    //       [distributorReceiver, addr1, addr2],
    //       [
    //         ethers.parseEther("-50"),
    //         ethers.parseEther("50"),
    //         ethers.parseEther("0"),
    //       ]
    //     );

    //     expect(await distributorReceiver.scores(addr1.address)).to.be.equal(
    //       ethers.parseEther("50")
    //     );
    //   });
    // });

    describe("withdrawToken", function () {
      // TODO
    });
  });
});
