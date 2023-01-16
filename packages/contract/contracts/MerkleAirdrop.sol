// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

error AlreadyClaimed();
error InvalidProof();

contract MerkleAirdrop {
    using SafeERC20 for IERC20;

    // This event is triggered whenever a call to #claim succeeds.
    event Claimed(string name, uint256 index, address account, uint256 amount);

    struct airdopInfo {
        address token;
        uint256 depositedAmount;
        uint256 stockAmount;
        bytes32 merkleRoot;
        address owner;
    }

    mapping(string => airdopInfo) airdopInfos;
    mapping(string => mapping(uint256 => uint256)) claimedBitMap;

    function registAirdropInfo(
        string memory name,
        address token,
        uint256 depositedAmount,
        bytes32 merkleRoot,
        address owner
    ) external {
        require(airdopInfos[name].token == address(0), "name already exists");
        require(token != address(0), "token should not be zero");
        require(owner != address(0), "owner should not be zero");
        if (depositedAmount != 0) {
            IERC20(token).approve(address(this), depositedAmount);
            IERC20(token).safeTransferFrom(
                msg.sender,
                address(this),
                depositedAmount
            );
        }
        airdopInfos[name] = airdopInfo(
            token,
            depositedAmount,
            depositedAmount,
            merkleRoot,
            owner
        );
    }

    function addAirdropTokenAmount(string memory name, uint256 amount)
        external
        airdropInfoExists(name)
    {
        address token = airdopInfos[name].token;
        IERC20(token).approve(address(this), amount);
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        airdopInfos[name].depositedAmount += amount;
        airdopInfos[name].stockAmount += amount;
    }

    function getAirdropInfo(string memory name)
        external
        view
        airdropInfoExists(name)
        returns (airdopInfo memory)
    {
        return airdopInfos[name];
    }

    function isClaimed(string memory name, uint256 index)
        public
        view
        airdropInfoExists(name)
        returns (bool)
    {
        uint256 claimedWordIndex = index / 256;
        uint256 claimedBitIndex = index % 256;
        uint256 claimedWord = claimedBitMap[name][claimedWordIndex];
        uint256 mask = (1 << claimedBitIndex);
        return claimedWord & mask == mask;
    }

    function _setClaimed(string memory name, uint256 index)
        private
        airdropInfoExists(name)
    {
        uint256 claimedWordIndex = index / 256;
        uint256 claimedBitIndex = index % 256;
        claimedBitMap[name][claimedWordIndex] =
            claimedBitMap[name][claimedWordIndex] |
            (1 << claimedBitIndex);
    }

    function claim(
        string memory name,
        uint256 index,
        address account,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) external airdropInfoExists(name) {
        airdopInfo memory namedAirdopInfo = airdopInfos[name];
        if (isClaimed(name, index)) revert AlreadyClaimed();
        require(
            namedAirdopInfo.stockAmount > amount,
            "Token amount is not enough."
        );

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

    function withdrawUnclaimedToken(string memory name)
        external
        airdropInfoExists(name)
    {
        airdopInfo memory namedAirdopInfo = airdopInfos[name];
        require(
            msg.sender == namedAirdopInfo.owner,
            "Only owner of AirdropInfo can withdraw."
        );
        airdopInfos[name].stockAmount = 0;
        IERC20(namedAirdopInfo.token).safeTransfer(
            namedAirdopInfo.owner,
            namedAirdopInfo.stockAmount
        );
    }

    function isAirdropInfoExists(string memory name)
        public
        view
        returns (bool)
    {
        return airdopInfos[name].token != address(0);
    }

    modifier airdropInfoExists(string memory name) {
        require(isAirdropInfoExists(name), "name does not exists");
        _;
    }
}
