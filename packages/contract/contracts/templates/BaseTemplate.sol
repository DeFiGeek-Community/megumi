// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.18;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract BaseTemplate is ReentrancyGuard {
    using SafeERC20 for IERC20;

    error AlreadyClaimed();
    error InvalidProof();
    error NotZeroRequired();
    error IncorrectAmount();
    error AmountNotEnough();

    /// Flags that manage instance initialization
    bool initialized;
    address public immutable feePool;
    address public immutable factory;

    address public owner;
    bytes32 public merkleRoot;
    /// @notice Record deployed parameters
    /// @dev
    /// @param deployedAddress Deployed address of merkle distributor
    /// @param owner Merkle distributor Owner address
    /// @param merkleRoot Target merkle root
    /// @param airdropTokens Airdrop token addresses
    /// @param args Concatenate template-specific parameters to bytes
    event Deployed(
        address deployedAddress,
        address owner,
        bytes32 merkleRoot,
        bytes airdropTokens,
        bytes args
    );

    event Claimed(
        uint256 indexed index,
        address indexed account,
        uint256 amount
    );

    constructor(address factory_, address feePool_) {
        factory = factory_;
        feePool = feePool_;
    }

    /// @dev Allow only owner of auction instance
    modifier onlyOwner() {
        require(msg.sender == owner, "You are not the owner.");
        _;
    }
    /// @dev Allow only delegatecall from factory
    modifier onlyDelegateFactory() {
        require(address(this) == factory, "You are not the factory.");
        _;
    }
    /// @dev Allow only call from factory
    modifier onlyFactory() {
        require(msg.sender == factory, "You are not the factory.");
        _;
    }
}
