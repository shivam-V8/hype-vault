// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IHyperliquidAdapter.sol";
import "./RiskManager.sol";

contract HyperliquidAdapter is IHyperliquidAdapter, Ownable {

    RiskManager public riskManager;
    address public executor;

    event TradeSettled(
        uint256 indexed nonce,
        int256 pnlUsd,
        uint256 newAssets,
        uint256 newExposureUsd
    );

    modifier onlyExecutor() {
        require(msg.sender == executor, "not executor");
        _;
    }

    constructor(address _riskManager) Ownable(msg.sender) {
        require(_riskManager != address(0), "invalid risk manager");
        riskManager = RiskManager(_riskManager);
    }

    function setExecutor(address _executor) external onlyOwner {
        require(_executor != address(0), "invalid executor");
        executor = _executor;
    }

    /// @notice Settle a real Hyperliquid trade (called by executor/bot)
    function settleTrade(
        uint256 nonce,
        int256 pnlUsd,
        uint256 newAssets,
        uint256 newExposureUsd
    ) external override onlyExecutor {

        // Update risk state (drawdown enforced here)
        riskManager.updatedAssets(
            newAssets,
            newExposureUsd
        );

        emit TradeSettled(
            nonce,
            pnlUsd,
            newAssets,
            newExposureUsd
        );
    }
}
