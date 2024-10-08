// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.20;

interface IDistributor {
    function addScore(address targetAddress, uint256 amount) external;
}
