// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

error AlreadyClaimed();
error InvalidProof();
error AirDropInfoExist();
error AirDropInfoNotExist();
error NotZeroRequired();
error AmountNotEnough();
error NotOwner();

contract MerkleAirdrop {
    using SafeERC20 for IERC20;

    // This event is triggered whenever a call to #claim succeeds.
    event Claimed(
        bytes32 indexed name,
        uint256 index,
        address indexed account,
        uint256 amount
    );

    struct airdopInfo {
        address token;
        // Total amount deposited to date
        uint256 depositedAmount;
        // Current stock amount
        uint256 stockAmount;
        bytes32 merkleRoot;
        address owner;
    }

    mapping(bytes32 => airdopInfo) airdopInfos;
    mapping(bytes32 => mapping(uint256 => uint256)) claimedBitMap;

    function registAirdropInfo(
        bytes32 name,
        address token,
        uint256 depositedAmount,
        bytes32 merkleRoot,
        address owner
    ) external {
        if (isAirdropInfoExist(name)) revert AirDropInfoExist();
        if (token == address(0)) revert NotZeroRequired();
        if (owner == address(0)) revert NotZeroRequired();

        IERC20(token).safeTransferFrom(
            msg.sender,
            address(this),
            depositedAmount
        );

        airdopInfos[name] = airdopInfo(
            token,
            depositedAmount,
            depositedAmount,
            merkleRoot,
            owner
        );
    }

    function addAirdropTokenAmount(bytes32 name, uint256 amount)
        external
        airdropInfoExist(name)
    {
        address token = airdopInfos[name].token;
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        airdopInfos[name].depositedAmount += amount;
        airdopInfos[name].stockAmount += amount;
    }

    function getAirdropInfo(bytes32 name)
        external
        view
        airdropInfoExist(name)
        returns (airdopInfo memory)
    {
        return airdopInfos[name];
    }

    function isClaimed(bytes32 name, uint256 index)
        public
        view
        airdropInfoExist(name)
        returns (bool)
    {
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

    function withdrawUnclaimedToken(bytes32 name)
        external
        airdropInfoExist(name)
    {
        airdopInfo memory namedAirdopInfo = airdopInfos[name];
        if (msg.sender != namedAirdopInfo.owner) revert NotOwner();
        airdopInfos[name].depositedAmount -= namedAirdopInfo.stockAmount;
        airdopInfos[name].stockAmount = 0;
        IERC20(namedAirdopInfo.token).safeTransfer(
            namedAirdopInfo.owner,
            namedAirdopInfo.stockAmount
        );
    }

    function isAirdropInfoExist(bytes32 name) public view returns (bool) {
        return airdopInfos[name].token != address(0);
    }

    modifier airdropInfoExist(bytes32 name) {
        if (!isAirdropInfoExist(name)) revert AirDropInfoNotExist();
        _;
    }
}
