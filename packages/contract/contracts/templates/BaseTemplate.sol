// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IPermit2.sol";

contract BaseTemplate {
    error AlreadyClaimed();
    error InvalidProof();
    error NotZeroRequired();
    error IncorrectAmount();
    error AmountNotEnough();
    error NotOwner();
    /// Flags that manage instance initialization
    bool initialized;
    IPermit2 public immutable Permit2;
    address public immutable feePool;
    address public immutable factory;

    address public owner;
    bytes32 public merkleRoot;
    address public token;
    /// @notice Record deployed parameters
    /// @dev
    /// @param deployedAddress Deployed address of merkle distributor
    /// @param owner Merkle distributor Owner address
    /// @param merkleRoot Target merkle root
    /// @param token Airdrop token address
    /// @param args Concatenate template-specific parameters to bytes
    event Deployed(
        address deployedAddress,
        address owner,
        bytes32 merkleRoot,
        address token,
        bytes args
    );

    event Claimed(
        uint256 indexed index,
        address indexed account,
        uint256 amount
    );

    constructor(address factory_, address feePool_, IPermit2 permit_) {
        factory = factory_;
        feePool = feePool_;
        Permit2 = permit_;
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
