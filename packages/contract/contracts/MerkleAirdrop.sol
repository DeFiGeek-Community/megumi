// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./interfaces/IMerkleAirdrop.sol";

contract MerkleAirdrop is IMerkleAirdrop, Ownable {
    struct airdopInfo {
        address token;
        uint256 amount;
        bytes32 merkleRoot;
        address[] owners;
    }

    mapping(string => airdopInfo) airdopInfos;
    mapping(string => mapping(uint256 => uint256)) claimedBitMap;

    modifier airdropInfoExists(string memory name) {
        require(airdopInfos[name].token != address(0), "name does not exists");
        _;
    }

    function registMerkleRoot(
        string memory name,
        address token,
        uint256 amount,
        bytes32 merkleRoot,
        address[] calldata owners
    ) external {
        require(airdopInfos[name].token == address(0), "name already exists");
        require(token != address(0), "token should not be zero");
        require(owners.length > 0, "owners should not be zero");
        if (amount != 0) {
            IERC20(token).approve(address(this), amount);
            IERC20(token).transferFrom(msg.sender, address(this), amount);
        }
        airdopInfos[name] = airdopInfo(token, amount, merkleRoot, owners);
    }

    function addAirdropTokenAmount(string memory name, uint256 amount)
        external
        airdropInfoExists(name)
    {
        address token = airdopInfos[name].token;
        IERC20(token).approve(address(this), amount);
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        airdopInfos[name].amount += amount;
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
        override
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
    ) external override airdropInfoExists(name) {
        require(!isClaimed(name, index), "Drop already claimed.");
        require(
            airdopInfos[name].amount > amount,
            "token amount is not enough"
        );

        // Verify the merkle proof.
        bytes32 node = keccak256(abi.encodePacked(index, account, amount));
        require(
            MerkleProof.verify(merkleProof, airdopInfos[name].merkleRoot, node),
            "Invalid proof."
        );

        // Mark it claimed and send the token.
        _setClaimed(name, index);
        airdopInfos[name].amount -= amount;
        require(
            IERC20(airdopInfos[name].token).transfer(account, amount),
            "Transfer failed."
        );

        emit Claimed(name, index, account, amount);
    }

    function withdrawUnclaimedToken(string memory name)
        external
        airdropInfoExists(name)
    {
        require(
            IERC20(airdopInfos[name].token).transfer(
                owner(),
                IERC20(airdopInfos[name].token).balanceOf(address(this))
            ),
            "withdrawUnclaimedYMT: Transfer failed."
        );
    }
}
