// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IHyperliquidAdapter.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract HyperliquidAdapter is IHyperliquidAdapter, Ownable {

    constructor() Ownable(msg.sender) {}

    event TradeSubmitted(
        address market,
        bool isLong,
        uint256 requestedSize,
        uint256 executedSize
    );

    function executePerpTrade(
        address market,
        bool isLong,
        uint256 sizeUsd,
        uint256 maxSlippageBps
    ) external override returns (bool success, uint256 executedSizeUsd) {

        // --- PSEUDOCODE ---
        // 1. Submit order to Hyperliquid
        // 2. Receive execution result
        // 3. Validate slippage
        // 4. Return execution outcome

        // MVP: assume full fill
        success = true;
        executedSizeUsd = sizeUsd;

        emit TradeSubmitted(
            market,
            isLong,
            sizeUsd,
            executedSizeUsd
        );
    }
}
