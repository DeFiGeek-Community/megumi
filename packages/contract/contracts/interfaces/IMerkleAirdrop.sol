// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

// Allows anyone to claim a token if they exist in a merkle root.
interface IMerkleAirdrop {
    // Returns true if the index has been marked claimed.
    function isClaimed(string memory name, uint256 index)
        external
        view
        returns (bool);

    // Claim the given amount of the token to the given address. Reverts if the inputs are invalid.
    function claim(
        string memory name,
        uint256 index,
        address account,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) external;

    // This event is triggered whenever a call to #claim succeeds.
    event Claimed(string name, uint256 index, address account, uint256 amount);
}
