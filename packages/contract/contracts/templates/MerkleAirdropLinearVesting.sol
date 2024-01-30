// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.18;

import "./BaseTemplate.sol";

contract MerkleAirdropLinearVesting is BaseTemplate {
    using SafeERC20 for IERC20;

    error NothingToClaim();

    struct AirdopInfo {
        address token;
        address owner;
        bytes32 merkleRoot;
        // Current stock amount
        uint256 stockAmount;
        uint256 vestingStart;
        uint256 vestingDuration;
    }

    address public token;
    uint256 public vestingStart;
    uint256 public vestingDuration;
    mapping(address => uint256) public claimedAmount;

    uint256 public constant claimFee = 0.0001 ether;
    uint256 public constant registrationFee = 0.01 ether;

    mapping(uint256 => uint256) private claimedBitMap;

    constructor(
        address factory_,
        address feePool_
    ) BaseTemplate(factory_, feePool_) {}

    function initialize(
        address owner_,
        bytes32 merkleRoot_,
        address token_,
        uint256 vestingDuration_,
        uint256 depositAmount_
    ) external payable onlyFactory returns (address, uint256, address) {
        require(!initialized, "This contract has already been initialized");
        initialized = true;

        if (owner_ == address(0)) revert NotZeroRequired();
        if (token_ == address(0)) revert NotZeroRequired();
        if (msg.value != registrationFee) revert IncorrectAmount();

        vestingStart = block.timestamp;
        vestingDuration = vestingDuration_;
        owner = owner_;
        token = token_;
        merkleRoot = merkleRoot_;

        (bool success, ) = payable(feePool).call{value: msg.value}("");
        require(success, "transfer failed");

        emit Deployed(
            address(this),
            owner,
            merkleRoot,
            abi.encodePacked(token),
            abi.encode(depositAmount_)
        );
        return (token, depositAmount_, address(this));
    }

    function initializeTransfer(
        address token_,
        uint256 amount_,
        address to_
    ) external payable onlyDelegateFactory {
        if (amount_ == 0) return;
        IERC20(token_).safeTransferFrom(msg.sender, to_, amount_);
    }

    function withdrawClaimFee() external onlyOwner {
        uint256 _amount = address(this).balance;

        (bool success, ) = payable(owner).call{value: _amount}("");
        require(success, "transfer failed");

        emit WithdrawnClaimFee(_amount);
    }

    function getAirdropInfo() external view returns (AirdopInfo memory) {
        return
            AirdopInfo({
                token: token,
                owner: owner,
                merkleRoot: merkleRoot,
                stockAmount: IERC20(token).balanceOf(address(this)),
                vestingStart: vestingStart,
                vestingDuration: vestingDuration
            });
    }

    function claim(
        uint256 index_,
        address account_,
        uint256 amount_,
        bytes32[] calldata merkleProof
    ) external payable {
        if (msg.value != claimFee * 2) revert IncorrectAmount();
        if (claimedAmount[account_] >= amount_) revert AlreadyClaimed();

        // Verify the merkle proof.
        bytes32 _node = keccak256(abi.encodePacked(index_, account_, amount_));
        if (!MerkleProof.verify(merkleProof, merkleRoot, _node))
            revert InvalidProof();

        uint256 _claimableAmount = 0;
        if (block.timestamp >= vestingStart + vestingDuration) {
            _claimableAmount = amount_;
        } else {
            _claimableAmount =
                ((block.timestamp - vestingStart) * amount_) /
                vestingDuration;
        }
        uint256 _availableToClaim = _claimableAmount - claimedAmount[account_];

        if (_availableToClaim == 0) revert NothingToClaim();
        if (IERC20(token).balanceOf(address(this)) < _availableToClaim)
            revert AmountNotEnough();

        claimedAmount[account_] += _availableToClaim;

        IERC20(token).safeTransfer(account_, _availableToClaim);

        (bool success, ) = payable(feePool).call{value: claimFee}("");
        require(success, "transfer failed");

        emit Claimed(index_, account_, _availableToClaim);
    }
}
