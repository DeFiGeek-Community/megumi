// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.20;

import "./MerkleAirdropBase.sol";

contract LinearVesting is MerkleAirdropBase {
    using SafeERC20 for IERC20;

    error NothingToClaim();

    struct AirdopInfo {
        address token;
        uint256 vestingStart;
        uint256 vestingDuration;
    }

    uint256 public constant claimFee = 0.0001 ether;
    uint256 public constant registrationFee = 0.01 ether;
    uint256 public constant REWARD_SCORE_PER_CLAIM = 3 ether;

    address public token;
    uint256 public vestingStart;
    uint256 public vestingDuration;
    mapping(uint256 => uint256) public claimedAmount;

    constructor(
        address factory_,
        address feePool_,
        address distributor_
    ) MerkleAirdropBase(factory_, feePool_, distributor_) {}

    function initialize(
        address owner_,
        bytes32 merkleRoot_,
        address token_,
        uint256 vestingDuration_,
        uint256 depositAmount_
    ) external payable onlyFactory returns (address, uint256, address) {
        if (initialized) revert AlreadyInitialized();
        initialized = true;

        if (owner_ == address(0)) revert NotZeroRequired();
        if (token_ == address(0)) revert NotZeroRequired();
        if (msg.value != registrationFee) revert IncorrectAmount();
        if (vestingDuration_ == 0) revert NotZeroRequired();

        vestingStart = block.timestamp;
        vestingDuration = vestingDuration_;
        owner = owner_;
        token = token_;
        merkleRoot = merkleRoot_;

        (bool success, ) = payable(feePool).call{value: msg.value}("");
        if (!success) revert TransferFailed();

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
        if (!success) revert TransferFailed();

        emit WithdrawnClaimFee(_amount);
    }

    function getAirdropInfo() external view returns (AirdopInfo memory) {
        return
            AirdopInfo({
                token: token,
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

        uint256 _claimedAmount = claimedAmount[index_];
        if (claimedAmount[index_] >= amount_) revert AlreadyClaimed();

        // Verify the merkle proof.
        bytes32 _node = keccak256(abi.encodePacked(index_, account_, amount_));
        if (!MerkleProof.verify(merkleProof, merkleRoot, _node))
            revert InvalidProof();

        uint256 _claimableAmount;
        if (block.timestamp >= vestingStart + vestingDuration) {
            _claimableAmount = amount_;
        } else {
            _claimableAmount =
                ((block.timestamp - vestingStart) * amount_) /
                vestingDuration;
        }
        uint256 _availableToClaim = _claimableAmount - _claimedAmount;

        if (_availableToClaim == 0) revert NothingToClaim();
        if (IERC20(token).balanceOf(address(this)) < _availableToClaim)
            revert AmountNotEnough();

        claimedAmount[index_] += _availableToClaim;

        IERC20(token).safeTransfer(account_, _availableToClaim);

        (bool success, ) = payable(feePool).call{value: claimFee}("");
        if (!success) revert TransferFailed();

        if (_claimedAmount == 0) {
            // Add score for the first claim
            IDistributor(distributor).addScore(
                account_,
                REWARD_SCORE_PER_CLAIM
            );
        }

        emit Claimed(index_, account_, _availableToClaim);
    }
}
