// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IHyperliquidAdapter {

    /// @notice Called after off-chain Hyperliquid execution
    function settleTrade(
        uint256 nonce,
        int256 pnlUsd,
        uint256 newAssets,
        uint256 newExposureUsd
    ) external;

}
