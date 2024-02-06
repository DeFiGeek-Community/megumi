// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract FeePool is Ownable {
    using SafeERC20 for IERC20;
    event WithdrawnEther(address indexed receiver, uint256 amount);

    constructor(address initialOwner_) Ownable(initialOwner_) {}

    function withdrawEther(address to_) external onlyOwner {
        require(to_ != address(0), "Don't discard treasury!");
        uint256 amount = address(this).balance;

        (bool success, ) = payable(to_).call{value: amount}("");
        require(success, "transfer failed");

        emit WithdrawnEther(to_, amount);
    }

    receive() external payable {}
}
