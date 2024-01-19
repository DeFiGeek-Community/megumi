// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./BaseTemplate.sol";

// error AlreadyClaimed();
// error InvalidProof();
// error AirDropInfoExist();
// error AirDropInfoNotExist();
// error NotZeroRequired();
// error IncorrectAmount();
// error AmountNotEnough();
// error NotOwner();

contract TemplateV1 is BaseTemplate {
    using SafeERC20 for IERC20;
    uint256 public depositedAmount;
    // Current stock amount
    uint256 public stockAmount;
    uint256 public constant claimFee = 0.0001 ether;
    uint256 public constant registrationFee = 0.01 ether;
    struct airdopInfo {
        address token;
        address owner;
        bytes32 merkleRoot;
        // Total amount deposited to date
        uint256 depositedAmount;
        // Current stock amount
        uint256 stockAmount;
    }
    mapping(uint256 => uint256) private claimedBitMap;

    constructor(
        address factory_,
        address feePool_,
        IPermit2 permit_
    ) BaseTemplate(factory_, feePool_, permit_) {}

    function initialize(
        address owner_,
        bytes32 merkleRoot_,
        address token_,
        uint32 depositAmount_
    ) external payable onlyFactory returns (address, uint256) {
        if (owner_ == address(0)) revert NotZeroRequired();
        if (token_ == address(0)) revert NotZeroRequired();
        if (msg.value != registrationFee) revert IncorrectAmount();
        owner = owner_;
        token = token_;
        merkleRoot = merkleRoot_;
        emit Deployed(
            address(this),
            owner_,
            merkleRoot_,
            token_,
            abi.encode(depositAmount_)
        );
        return (token_, depositAmount_);
    }

    function deposit(
        uint256 depositAmount_,
        uint256 nonce_,
        uint256 deadline_,
        bytes calldata signature_
    ) external onlyOwner {
        Permit2.permitTransferFrom(
            // The permit message.
            IPermit2.PermitTransferFrom({
                permitted: IPermit2.TokenPermissions({
                    token: token,
                    amount: depositAmount_
                }),
                nonce: nonce_,
                deadline: deadline_
            }),
            // The transfer recipient and amount.
            IPermit2.SignatureTransferDetails({
                to: address(this),
                requestedAmount: depositAmount_
            }),
            // The owner of the tokens, which must also be
            // the signer of the message, otherwise this call
            // will fail.
            msg.sender,
            // The packed signature that was the result of signing
            // the EIP712 hash of `permit`.
            signature_
        );
        depositedAmount += depositAmount_;
        // TODO token balanceでOK
        stockAmount += depositAmount_;
    }

    function withdrawDepositedToken() external onlyOwner {
        // uint256 _stockAmount = IERC20(token).balanceOf(address(this));
        // depositedAmount -= _stockAmount; // TODO underflowになる
        // IERC20(token).safeTransfer(owner, _stockAmount);
        uint256 _stockAmount = stockAmount;
        depositedAmount -= _stockAmount;
        stockAmount = 0;
        IERC20(token).safeTransfer(owner, _stockAmount);
    }

    function getAirdropInfo() external view returns (airdopInfo memory) {
        return
            airdopInfo({
                token: token,
                owner: owner,
                merkleRoot: merkleRoot,
                depositedAmount: depositedAmount,
                stockAmount: stockAmount
            });
    }

    function isClaimed(uint256 index_) public view returns (bool) {
        uint256 claimedWordIndex = index_ / 256;
        uint256 claimedBitIndex = index_ % 256;
        uint256 claimedWord = claimedBitMap[claimedWordIndex];
        uint256 mask = (1 << claimedBitIndex);
        return claimedWord & mask == mask;
    }

    function _setClaimed(uint256 index_) private {
        uint256 claimedWordIndex = index_ / 256;
        uint256 claimedBitIndex = index_ % 256;
        claimedBitMap[claimedWordIndex] =
            claimedBitMap[claimedWordIndex] |
            (1 << claimedBitIndex);
    }

    function claim(
        uint256 index_,
        address account_,
        uint256 amount_,
        bytes32[] calldata merkleProof
    ) external payable {
        if (isClaimed(index_)) revert AlreadyClaimed();
        if (stockAmount < amount_) revert AmountNotEnough();
        if (msg.value != claimFee * 2) revert IncorrectAmount();
        // Verify the merkle proof.
        bytes32 _node = keccak256(abi.encodePacked(index_, account_, amount_));
        if (!MerkleProof.verify(merkleProof, merkleRoot, _node))
            revert InvalidProof();
        // Mark it claimed and send the token.
        _setClaimed(index_);
        stockAmount -= amount_;
        IERC20(token).safeTransfer(account_, amount_);
        payable(owner).transfer(claimFee);
        emit Claimed(index_, account_, amount_);
    }

    function withdrawCollectedEther() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }

    function initializeTransfer(
        address token_,
        uint256 amount_,
        address to_,
        // Permit2 --->
        uint256 nonce_,
        uint256 deadline_,
        bytes calldata signature_ // <---
    ) external onlyDelegateFactory {
        // IERC20(token_).safeTransferFrom(msg.sender, to_, amount_);
        Permit2.permitTransferFrom(
            // The permit message.
            IPermit2.PermitTransferFrom({
                permitted: IPermit2.TokenPermissions({
                    token: token_,
                    amount: amount_
                }),
                nonce: nonce_,
                deadline: deadline_
            }),
            // The transfer recipient and amount.
            IPermit2.SignatureTransferDetails({
                to: to_,
                requestedAmount: amount_
            }),
            // The owner of the tokens, which must also be
            // the signer of the message, otherwise this call
            // will fail.
            msg.sender,
            // The packed signature that was the result of signing
            // the EIP712 hash of `permit`.
            signature_
        );
    }
}
