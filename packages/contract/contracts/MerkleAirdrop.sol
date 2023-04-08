// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./interfaces/IPermit2.sol";

error AlreadyClaimed();
error InvalidProof();
error AirDropInfoExist();
error AirDropInfoNotExist();
error NotZeroRequired();
error AmountNotEnough();
error NotOwner();

contract MerkleAirdrop {
    using SafeERC20 for IERC20;

    IPermit2 public immutable Permit2;

    // This event is triggered whenever a call to #claim succeeds.
    event Claimed(
        bytes32 indexed name,
        uint256 indexed index,
        address indexed account,
        uint256 amount
    );

    struct airdopInfo {
        address token;
        address owner;
        bytes32 merkleRoot;
        // Total amount deposited to date
        uint256 depositedAmount;
        // Current stock amount
        uint256 stockAmount;
    }

    mapping(bytes32 => airdopInfo) airdopInfos;
    mapping(bytes32 => mapping(uint256 => uint256)) claimedBitMap;

    constructor(IPermit2 permit_) {
        Permit2 = permit_;
    }

    function registAirdropInfo(
        bytes32 name,
        address token,
        bytes32 merkleRoot
    ) external {
        if (isAirdropInfoExist(name)) revert AirDropInfoExist();
        if (token == address(0)) revert NotZeroRequired();

        airdopInfos[name] = airdopInfo(token, msg.sender, merkleRoot, 0, 0);
    }

    function registAirdropInfoWithDeposit(
        bytes32 name,
        address token,
        bytes32 merkleRoot,
        uint256 depositAmount,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        if (isAirdropInfoExist(name)) revert AirDropInfoExist();
        if (token == address(0)) revert NotZeroRequired();

        Permit2.permitTransferFrom(
            // The permit message.
            IPermit2.PermitTransferFrom({
                permitted: IPermit2.TokenPermissions({
                    token: token,
                    amount: depositAmount
                }),
                nonce: nonce,
                deadline: deadline
            }),
            // The transfer recipient and amount.
            IPermit2.SignatureTransferDetails({
                to: address(this),
                requestedAmount: depositAmount
            }),
            // The owner of the tokens, which must also be
            // the signer of the message, otherwise this call
            // will fail.
            msg.sender,
            // The packed signature that was the result of signing
            // the EIP712 hash of `permit`.
            signature
        );

        airdopInfos[name] = airdopInfo(
            token,
            msg.sender,
            merkleRoot,
            depositAmount,
            depositAmount
        );
    }

    function depositAirdropToken(
        bytes32 name,
        uint256 depositAmount,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external airdropInfoExist(name) {
        Permit2.permitTransferFrom(
            // The permit message.
            IPermit2.PermitTransferFrom({
                permitted: IPermit2.TokenPermissions({
                    token: airdopInfos[name].token,
                    amount: depositAmount
                }),
                nonce: nonce,
                deadline: deadline
            }),
            // The transfer recipient and amount.
            IPermit2.SignatureTransferDetails({
                to: address(this),
                requestedAmount: depositAmount
            }),
            // The owner of the tokens, which must also be
            // the signer of the message, otherwise this call
            // will fail.
            msg.sender,
            // The packed signature that was the result of signing
            // the EIP712 hash of `permit`.
            signature
        );

        airdopInfos[name].depositedAmount += depositAmount;
        airdopInfos[name].stockAmount += depositAmount;
    }

    function withdrawDepositedToken(
        bytes32 name
    ) external airdropInfoExist(name) {
        airdopInfo memory namedAirdopInfo = airdopInfos[name];
        if (msg.sender != namedAirdopInfo.owner) revert NotOwner();
        airdopInfos[name].depositedAmount -= namedAirdopInfo.stockAmount;
        airdopInfos[name].stockAmount = 0;
        IERC20(namedAirdopInfo.token).safeTransfer(
            namedAirdopInfo.owner,
            namedAirdopInfo.stockAmount
        );
    }

    function getAirdropInfo(
        bytes32 name
    ) external view returns (airdopInfo memory) {
        return airdopInfos[name];
    }

    function isClaimed(bytes32 name, uint256 index) public view returns (bool) {
        uint256 claimedWordIndex = index >> 8;
        uint256 claimedBitIndex = index % 256;
        uint256 claimedWord = claimedBitMap[name][claimedWordIndex];
        uint256 mask = (1 << claimedBitIndex);
        return claimedWord & mask == mask;
    }

    function _setClaimed(bytes32 name, uint256 index) private {
        uint256 claimedWordIndex = index >> 8;
        uint256 claimedBitIndex = index % 256;
        claimedBitMap[name][claimedWordIndex] =
            claimedBitMap[name][claimedWordIndex] |
            (1 << claimedBitIndex);
    }

    function claim(
        bytes32 name,
        uint256 index,
        address account,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) external airdropInfoExist(name) {
        airdopInfo memory namedAirdopInfo = airdopInfos[name];
        if (isClaimed(name, index)) revert AlreadyClaimed();
        if (namedAirdopInfo.stockAmount < amount) revert AmountNotEnough();

        // Verify the merkle proof.
        bytes32 node = keccak256(abi.encodePacked(index, account, amount));
        if (
            !MerkleProof.verify(merkleProof, namedAirdopInfo.merkleRoot, node)
        ) {
            revert InvalidProof();
        }

        // Mark it claimed and send the token.
        _setClaimed(name, index);
        airdopInfos[name].stockAmount -= amount;
        IERC20(namedAirdopInfo.token).safeTransfer(account, amount);

        emit Claimed(name, index, account, amount);
    }

    function isAirdropInfoExist(bytes32 name) public view returns (bool) {
        return airdopInfos[name].token != address(0);
    }

    modifier airdropInfoExist(bytes32 name) {
        if (!isAirdropInfoExist(name)) revert AirDropInfoNotExist();
        _;
    }
}
