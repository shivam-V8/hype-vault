// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IHyperliquidAdapter {
    function executePerpTrade(
        address market,
        bool isLong,
        uint256 sizeUsd,
        uint256 maxSlippageBps
    ) external returns (bool success, uint256 executedSizeUsd);
}

