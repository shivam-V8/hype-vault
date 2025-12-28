// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Vault is Ownable {
    IERC20 public immutable asset;

    uint256 public totalAssets;
    uint256 public totalShares;

    mapping (address => uint256) public shares;

    event Deposit(address indexed user, uint256 assets, uint256 shares);
    event Withdraw(address indexed user, uint256 assets, uint256 shares);

    constructor(address _asset) Ownable(msg.sender) {
        asset = IERC20(_asset);
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "amount = 0");

        uint256 mintedShares = totalShares == 0 ? amount : (amount * totalShares) / totalAssets;

        asset.transferFrom(msg.sender, address(this), amount);

        shares[msg.sender] += mintedShares;
        totalShares += mintedShares;
        totalAssets += amount;

        emit Deposit(msg.sender, amount, mintedShares);
    }

    function withdraw(uint256 shareAmount) external {
        require(shareAmount > 0, "shares = 0");
        require(shares[msg.sender] >= shareAmount, "insufficient shares");

        uint256 assetsOut = (shareAmount * totalAssets) / totalShares;

        shares[msg.sender] -= shareAmount;
        totalShares -= shareAmount;
        totalAssets -= assetsOut;

        asset.transfer(msg.sender, assetsOut);

        emit Withdraw(msg.sender, assetsOut, shareAmount);
    }
}