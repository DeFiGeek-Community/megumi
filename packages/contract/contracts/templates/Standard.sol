// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.18;

import "./MerkleAirdropBase.sol";

contract Standard is MerkleAirdropBase {
    using SafeERC20 for IERC20;

    struct AirdopInfo {
        address token;
        address owner;
        bytes32 merkleRoot;
        // Current stock amount
        uint256 stockAmount;
    }

    uint256 public constant claimFee = 0.0001 ether;
    uint256 public constant registrationFee = 0.01 ether;

    address public token;
    mapping(uint256 => uint256) private claimedBitMap;

    constructor(
        address factory_,
        address feePool_
    ) MerkleAirdropBase(factory_, feePool_) {}

    function initialize(
        address owner_,
        bytes32 merkleRoot_,
        address token_,
        uint256 depositAmount_
    ) external payable onlyFactory returns (address, uint256, address) {
        require(!initialized, "This contract has already been initialized");
        initialized = true;

        if (owner_ == address(0)) revert NotZeroRequired();
        if (token_ == address(0)) revert NotZeroRequired();
        if (msg.value != registrationFee) revert IncorrectAmount();

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

    function withdrawDepositedToken() external onlyOwner {
        uint256 _amount = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransfer(owner, _amount);

        emit WithdrawnDepositedTokens(
            abi.encodePacked(token),
            abi.encode(_amount)
        );
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
                stockAmount: IERC20(token).balanceOf(address(this))
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
        bytes32[] calldata merkleProof_
    ) external payable {
        if (isClaimed(index_)) revert AlreadyClaimed();
        if (IERC20(token).balanceOf(address(this)) < amount_)
            revert AmountNotEnough();
        if (msg.value != claimFee * 2) revert IncorrectAmount();
        // Verify the merkle proof.
        bytes32 _node = keccak256(abi.encodePacked(index_, account_, amount_));
        if (!MerkleProof.verify(merkleProof_, merkleRoot, _node))
            revert InvalidProof();
        // Mark it claimed and send the token.
        _setClaimed(index_);
        IERC20(token).safeTransfer(account_, amount_);

        (bool success, ) = payable(feePool).call{value: claimFee}("");
        require(success, "transfer failed");

        emit Claimed(index_, account_, amount_);
    }
}