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
        // Total amount deposited to date
        uint256 depositedAmount;
        // Current stock amount
        uint256 stockAmount;
    }
    struct Permit2Args {
        uint256 amount;
        uint256 nonce;
        uint256 deadline;
        bytes signature;
    }

    address public token;
    uint256 public totalClaimed;
    uint256 public vestingStart;
    uint256 public vestingDuration;
    mapping(address => uint256) public claimedAmount;

    uint256 public constant claimFee = 0.0001 ether;
    uint256 public constant registrationFee = 0.01 ether;

    mapping(uint256 => uint256) private claimedBitMap;

    constructor(
        address factory_,
        address feePool_,
        IPermit2 permit_
    ) BaseTemplate(factory_, feePool_, permit_) {}

    function initialize(
        address owner_,
        bytes32 merkleRoot_,
        address token_,
        uint256 vestingDuration_,
        uint256 depositAmount_,
        uint256 nonce_,
        uint256 deadline_,
        bytes memory signature_
    )
        external
        payable
        onlyFactory
        returns (address, uint256, uint256, uint256, bytes memory, address)
    {
        require(!initialized, "This contract has already been initialized");
        initialized = true;

        if (owner_ == address(0)) revert NotZeroRequired();
        if (token_ == address(0)) revert NotZeroRequired();
        if (msg.value != registrationFee) revert IncorrectAmount();

        vestingStart = block.timestamp;
        vestingDuration = vestingDuration_;

        // To avoid stack too deep
        Permit2Args memory _permit2Args = Permit2Args(
            depositAmount_,
            nonce_,
            deadline_,
            signature_
        );
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
            abi.encode(
                _permit2Args.amount,
                _permit2Args.nonce,
                _permit2Args.deadline,
                _permit2Args.signature
            )
        );
        return (
            token,
            _permit2Args.amount,
            _permit2Args.nonce,
            _permit2Args.deadline,
            _permit2Args.signature,
            address(this)
        );
    }

    function initializeTransfer(
        address token_,
        uint256 amount_,
        uint256 nonce_,
        uint256 deadline_,
        bytes calldata signature_,
        address to_
    ) external payable onlyDelegateFactory {
        if (amount_ == 0) return;

        Permit2.permitTransferFrom(
            // The permit message.
            IPermit2.PermitTransferFrom({
                permitted: IPermit2.TokenPermissions({
                    token: token_,
                    amount: amount_
                }),
                nonce: nonce_,
                deadline: deadline_
            }),
            // The transfer recipient and amount.
            IPermit2.SignatureTransferDetails({
                to: to_,
                requestedAmount: amount_
            }),
            // The owner of the tokens, which must also be
            // the signer of the message, otherwise this call
            // will fail.
            msg.sender,
            // The packed signature that was the result of signing
            // the EIP712 hash of `permit`.
            signature_
        );
    }

    function depositAirdropToken(
        uint256 depositAmount_,
        uint256 nonce_,
        uint256 deadline_,
        bytes calldata signature_
    ) external onlyOwner {
        Permit2.permitTransferFrom(
            // The permit message.
            IPermit2.PermitTransferFrom({
                permitted: IPermit2.TokenPermissions({
                    token: token,
                    amount: depositAmount_
                }),
                nonce: nonce_,
                deadline: deadline_
            }),
            // The transfer recipient and amount.
            IPermit2.SignatureTransferDetails({
                to: address(this),
                requestedAmount: depositAmount_
            }),
            // The owner of the tokens, which must also be
            // the signer of the message, otherwise this call
            // will fail.
            msg.sender,
            // The packed signature that was the result of signing
            // the EIP712 hash of `permit`.
            signature_
        );
    }

    function withdrawDepositedToken() external onlyOwner {
        IERC20(token).safeTransfer(
            owner,
            IERC20(token).balanceOf(address(this))
        );
    }

    function depositedAmount() public view returns (uint256) {
        return IERC20(token).balanceOf(address(this)) + totalClaimed;
    }

    function getAirdropInfo() external view returns (AirdopInfo memory) {
        return
            AirdopInfo({
                token: token,
                owner: owner,
                merkleRoot: merkleRoot,
                depositedAmount: depositedAmount(),
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
        bytes32[] calldata merkleProof
    ) external payable {
        if (claimedAmount[account_] >= amount_) revert AlreadyClaimed();
        if (claimedAmount[account_] == 0 && msg.value != claimFee * 2)
            revert IncorrectAmount();
        if (claimedAmount[account_] > 0 && msg.value > 0)
            revert IncorrectAmount();

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

        // Keep track of claimed amount.
        claimedAmount[account_] += _availableToClaim;
        totalClaimed += _availableToClaim;

        // Mark it claimed and send the token.
        if (claimedAmount[account_] >= amount_) {
            _setClaimed(index_);
        }
        IERC20(token).safeTransfer(account_, _availableToClaim);

        if (msg.value > 0) {
            (bool success, ) = payable(owner).call{value: claimFee}("");
            require(success, "transfer failed");

            (success, ) = payable(feePool).call{value: claimFee}("");
            require(success, "transfer failed");
        }

        emit Claimed(index_, account_, _availableToClaim);
    }
}
