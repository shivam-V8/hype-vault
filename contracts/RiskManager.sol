// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract RiskManager is Ownable {
    uint256 public maxLeverage;
    uint256 public maxDrawdownBPS;
    uint256 public maxPositionBPS;

    bool public tradingPaused;
    address public executor;
    address public vault;

    uint256 public peakAssets;
    uint256 public currentAssets;

    event TradingPaused(bool paused);
    event ExecutorUpdated(address executor);
    event AssetsUpdated(uint256 newAssets);

    constructor(address _vault) Ownable(msg.sender) {
        vault = _vault;
        maxLeverage = 5e18;
        maxDrawdownBPS = 2000;
        maxPositionBPS = 3000;

        tradingPaused = false;
    }

    modifier onlyExecutor() {
        require(msg.sender == executor, "not executor");
        _;
    }

    function setExecutor(address _executor) external onlyOwner {
        executor = _executor;
        emit ExecutorUpdated(_executor);
    }

    function updatedAssets(uint256 newAssets) external onlyExecutor {
        require(!tradingPaused, "trading paused");

        currentAssets = newAssets;
        if(newAssets > peakAssets) {
            peakAssets = newAssets;
        } else {
            uint256 drawdownBPS = ((peakAssets - newAssets) * 10_000) / peakAssets;

            if(drawdownBPS > maxDrawdownBPS) {
                tradingPaused = true;
                emit TradingPaused(true);
            }
        }
        emit AssetsUpdated(newAssets);
    }

    function pauseTrading(bool pause) external onlyOwner {
        tradingPaused = pause;
        emit TradingPaused(pause);
    }
}