// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";


/// @title  ActivityEmitter
/// @notice Emits normalized on-chain activity logs using raw LOG4 assembly.
///
///         LOG4 topic layout (overrides Solidity's keccak256 sig hash):
///         ┌──────────┬─────────────────────────────────────────────────────┐
///         │ topic[0] │ activityType enum (0x01–0x05) — NOT a sig hash      │
///         │ topic[1] │ user address — always the actor                     │
///         │ topic[2] │ tokenId     — links log to passport NFT             │
///         │ topic[3] │ partnerId   — source protocol                       │
///         │ data     │ abi.encode(value, extra)                            │
///         └──────────┴─────────────────────────────────────────────────────┘
///
///         Because topic[0] is our own enum, standard block explorers cannot
///         decode these events. Your private off-chain indexer filters by
///         topic[0] type and topic[1] user for O(1) single-call history.
contract ActivityEmitter is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant EMITTER_ROLE = keccak256("EMITTER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // topic[0] activity type enum values (override keccak256 sig hash via LOG4)
    uint8 constant ACTIVITY_TRADE = 0x01;
    uint8 constant ACTIVITY_LEND = 0x02;
    uint8 constant ACTIVITY_NFT = 0x03;
    uint8 constant ACTIVITY_VOTE = 0x04;
    uint8 constant ACTIVITY_CUSTOM = 0x05;

    uint256[49] private __gap;

    // ============ Errors ============
    error InvalidActivityType(uint8 activityType);
    error ZeroAddress();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin) external initializer {
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }

    // ========== External Functions ============

    /// @notice Emit a normalized activity log via LOG4.
    /// @param activityType  0x01=TRADE 0x02=LEND 0x03=NFT 0x04=VOTE 0x05=CUSTOM
    /// @param user          Wallet that performed the action  → topic[1]
    /// @param tokenId       Passport NFT id                   → topic[2]
    /// @param partnerId     Source protocol id                → topic[3]
    /// @param value         Primary value (amount, token id…)
    /// @param extra         ABI-encoded extra payload
    function emitActivity(
        uint8 activityType,
        address user,
        uint256 tokenId,
        uint32 partnerId,
        uint256 value,
        bytes calldata extra
    ) external onlyRole(EMITTER_ROLE) {
        if (user == address(0)) revert ZeroAddress();
        if (activityType < ACTIVITY_TRADE || activityType > ACTIVITY_CUSTOM)
            revert InvalidActivityType(activityType);
        _emit(activityType, user, tokenId, partnerId, value, extra);
    }

    // ============ Helper Functions ============

    function emitTrade(
        address user,
        uint256 tokenId,
        uint32 partnerId,
        uint256 amountOut,
        bytes calldata extra
    ) external onlyRole(EMITTER_ROLE) {
        _emit(ACTIVITY_TRADE, user, tokenId, partnerId, amountOut, extra);
    }

    function emitLend(
        address user,
        uint256 tokenId,
        uint32 partnerId,
        uint256 amount,
        bytes calldata extra
    ) external onlyRole(EMITTER_ROLE) {
        _emit(ACTIVITY_LEND, user, tokenId, partnerId, amount, extra);
    }

    function emitNFT(
        address user,
        uint256 tokenId,
        uint32 partnerId,
        uint256 nftTokenId,
        bytes calldata extra
    ) external onlyRole(EMITTER_ROLE) {
        _emit(ACTIVITY_NFT, user, tokenId, partnerId, nftTokenId, extra);
    }

    function emitVote(
        address user,
        uint256 tokenId,
        uint32 partnerId,
        uint256 proposalId,
        bytes calldata extra
    ) external onlyRole(EMITTER_ROLE) {
        _emit(ACTIVITY_VOTE, user, tokenId, partnerId, proposalId, extra);
    }

    // =========== Internal Functions ============

    function _emit(
        uint8 activityType,
        address user,
        uint256 tokenId,
        uint32 partnerId,
        uint256 value,
        bytes calldata extra
    ) internal {
        bytes memory data = abi.encode(value, extra);
        assembly {
            // LOG4(dataOffset, dataLength, t0, t1, t2, t3)
            // topic[0]: our activity enum — overwrites the sig hash slot
            // topic[1]: user address
            // topic[2]: tokenId (passport NFT)
            // topic[3]: partnerId
            log4(
                add(data, 32), // data starts after length prefix
                mload(data), // data length
                activityType, // topic[0]: enum, NOT keccak256(sig)
                user, // topic[1]: actor address
                tokenId, // topic[2]: passport NFT id
                partnerId // topic[3]: source protocol id
            )
        }
    }

    function _authorizeUpgrade(
        address
    ) internal override onlyRole(UPGRADER_ROLE) {}
}
