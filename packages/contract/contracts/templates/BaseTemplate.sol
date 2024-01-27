// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.18;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract BaseTemplate {
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
    /// @dev Emit Deployed event at the end of the initialization function which is called from Factory
    /// @param deployedAddress Deployed address of merkle distributor
    /// @param owner Merkle distributor Owner address
    /// @param merkleRoot Target merkle root
    /// @param airdropTokens Airdrop token addresses concatenated with abi.encodePacked to bytes
    /// @param args Template-specific parameters concatenated with abi.encode to bytes
    event Deployed(
        address deployedAddress,
        address owner,
        bytes32 merkleRoot,
        bytes airdropTokens,
        bytes args
    );

    /// @notice Record claimed event
    /// @dev Emit Claimed event at the end of the claim function
    /// @param index Index of the leaf
    /// @param account Claimer address
    /// @param amount Claimed amount
    event Claimed(
        uint256 indexed index,
        address indexed account,
        uint256 amount
    );

    /// @notice Record claimed event
    /// @dev Emit WithdrawnDepositedTokens event at the end of the withdrawal of airdtop token(s)
    /// @param tokens Withdrawn token addresses concatenated with abi.encodePacked to bytes
    /// @param amounts Withdrawn token amounts concatenated with abi.encode to bytes
    event WithdrawnDepositedTokens(bytes tokens, bytes amounts);

    /// @notice Record claimed event
    /// @dev Emit WithdrawnClaimFee event at the end of the withdrawal of fee)
    /// @param amount Withdrawn fee amount
    event WithdrawnClaimFee(uint256 amount);

    constructor(address factory_, address feePool_) {
        factory = factory_;
        feePool = feePool_;
    }

    /// @dev Allow only owner of airdrop instance
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
