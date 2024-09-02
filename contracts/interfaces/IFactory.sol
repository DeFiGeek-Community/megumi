// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.20;

interface IFactory {
    function airdrops(address _address) external view returns (bool);
}
