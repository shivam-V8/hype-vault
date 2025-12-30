// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./RiskManager.sol";
import "./IHyperliquidAdapter.sol";

contract Executor is Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    /// @notice Risk control contract
    RiskManager public riskManager;

    /// @notice Authorized bot signer
    address public signer;

    /// @notice Hyperliquid execution adapter
    IHyperliquidAdapter public adapter;

    /// @notice Used nonces for replay protection
    mapping(uint256 => bool) public usedNonces;

    event IntentExecuted(uint256 indexed nonce);
    event SignerUpdated(address indexed newSigner);
    event AdapterUpdated(address indexed newAdapter);

    constructor(
        address _riskManager,
        address _signer,
        address _adapter
    ) Ownable(msg.sender) {
        require(_riskManager != address(0), "invalid risk manager");
        require(_signer != address(0), "invalid signer");
        require(_adapter != address(0), "invalid adapter");

        riskManager = RiskManager(_riskManager);
        signer = _signer;
        adapter = IHyperliquidAdapter(_adapter);
    }


    function setSigner(address _signer) external onlyOwner {
        require(_signer != address(0), "invalid signer");
        signer = _signer;
        emit SignerUpdated(_signer);
    }

    function setAdapter(address _adapter) external onlyOwner {
        require(_adapter != address(0), "invalid adapter");
        adapter = IHyperliquidAdapter(_adapter);
        emit AdapterUpdated(_adapter);
    }

    function _hashIntent(
        address market,
        bool isLong,
        uint256 sizeUsd,
        uint256 maxSlippageBps,
        uint256 nonce,
        uint256 expiry
    ) internal view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                address(this),
                market,
                isLong,
                sizeUsd,
                maxSlippageBps,
                nonce,
                expiry,
                block.chainid
            )
        );
    }

    function executeTrade(
        address market,
        bool isLong,
        uint256 sizeUsd,
        uint256 maxSlippageBps,
        uint256 nonce,
        uint256 expiry,
        bytes calldata signature
    ) external {
        require(!riskManager.tradingPaused(), "trading paused");
        require(block.timestamp <= expiry, "intent expired");
        require(!usedNonces[nonce], "nonce already used");

        bytes32 digest =
            _hashIntent(
                market,
                isLong,
                sizeUsd,
                maxSlippageBps,
                nonce,
                expiry
            ).toEthSignedMessageHash();

        address recoveredSigner = digest.recover(signature);
        require(recoveredSigner == signer, "invalid signature");

        // burn nonce BEFORE execution (reentrancy safe)
        usedNonces[nonce] = true;

        riskManager.validateTrade(sizeUsd);

        (bool success, uint256 filledSize) =
            adapter.executePerpTrade(
                market,
                isLong,
                sizeUsd,
                maxSlippageBps
            );

        require(success, "execution failed");

        emit IntentExecuted(nonce);
    }
}
