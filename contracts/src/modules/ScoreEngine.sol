// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {ScoreLib} from "../lib/ScoreLib.sol";
import {PassportRegistry} from "./PassportRegistry.sol";
import {PassportNFT} from "./PassportNFT.sol";

/// @title  ScoreEngine  (V2-compatible)
/// @notice Stores and computes passport scores with configurable exponential decay.
///
///         Flow:
///         1. Off-chain indexer reads LOG4 events from ActivityEmitter.
///         2. Indexer calls writeScore() with cumulative points for a tokenId.
///         3. currentScore() applies decay in real time (pure view, no gas for users).
///         4. PassportNFT.updateMeta() is called to refresh on-chain SVG tier.
///
///         V2 additions over V1:
///         - Per-user decay rate override (for premium users)
///         - Score history snapshots (monthly)
///         - Batch writeScore for indexer efficiency
///         - configurable global decay + floor BPS
contract ScoreEngine is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant WRITER_ROLE = keccak256("WRITER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    uint256 public decayRateBps; // global default, e.g. 200 = 2%/month
    uint256 public floorBps; // global floor, e.g. 2000 = 20% of peak

    struct ScoreRecord {
        uint256 storedScore; // cumulative score at last write
        uint256 peakScore; // highest score ever reached (floor anchor)
        uint48 lastPayment; // mirrors registry.subscriptionExpiresAt for decay
        uint48 lastUpdated; // block.timestamp of last writeScore call
        uint256 activityCount;
        uint256 decayRateOverride; // 0 = use global; else per-user rate in BPS
    }

    mapping(uint256 => ScoreRecord) private _scores; // tokenId → ScoreRecord

    // Monthly snapshots: tokenId → month index → score
    mapping(uint256 => mapping(uint256 => uint256)) public snapshots;

    PassportRegistry public registry;
    PassportNFT public nft;

    uint256[43] private __gap;

    // ========= Events =========

    event ScoreWritten(
        uint256 indexed tokenId,
        uint256 newScore,
        uint256 activityCount
    );
    event ScoreDecayed(uint256 indexed tokenId, uint256 from, uint256 to);
    event DecayConfigUpdated(uint256 rateBps, uint256 floorBps_);
    event SnapshotTaken(uint256 indexed tokenId, uint256 month, uint256 score);

    // ========= Errors =========

    error TokenDoesNotExist();
    error InvalidConfig();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin) external initializer {
        __AccessControl_init();

        decayRateBps = 200; // 2% per month default
        floorBps = 2000; // 20% floor default

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(WRITER_ROLE, admin);
    }

    function setRegistry(address registry_) external onlyRole(ADMIN_ROLE) {
        registry = PassportRegistry(registry_);
    }

    function setNFT(address nft_) external onlyRole(ADMIN_ROLE) {
        nft = PassportNFT(nft_);
    }

    /// @notice Write cumulative score for a single passport.
    function writeScore(
        uint256 tokenId,
        uint256 cumulativeScore,
        uint256 activityCount_
    ) external onlyRole(WRITER_ROLE) {
        ScoreRecord storage r = _scores[tokenId];
        uint256 capped = ScoreLib.cap(cumulativeScore);

        r.storedScore = capped;
        r.activityCount = activityCount_;
        r.lastUpdated = uint48(block.timestamp);

        // Update peak
        if (capped > r.peakScore) r.peakScore = capped;

        // Sync lastPayment from registry (for decay)
        if (address(registry) != address(0)) {
            address owner = registry.passportDataByToken(tokenId);
            if (owner != address(0)) {
                r.lastPayment = registry.subscriptionExpiresAt(owner);
            }
        }

        // Monthly snapshot
        uint256 month = block.timestamp / 30 days;
        if (snapshots[tokenId][month] == 0) {
            snapshots[tokenId][month] = capped;
            emit SnapshotTaken(tokenId, month, capped);
        }

        // Refresh NFT metadata
        _refreshNFT(tokenId, capped, activityCount_);

        emit ScoreWritten(tokenId, capped, activityCount_);
    }

    /// @notice Batch write for indexer efficiency.
    function writeScoreBatch(
        uint256[] calldata tokenIds,
        uint256[] calldata cumulativeScores,
        uint256[] calldata activityCounts_
    ) external onlyRole(WRITER_ROLE) {
        require(
            tokenIds.length == cumulativeScores.length &&
                tokenIds.length == activityCounts_.length,
            "length"
        );
        for (uint i; i < tokenIds.length; ++i) {
            ScoreRecord storage r = _scores[tokenIds[i]];
            uint256 capped = ScoreLib.cap(cumulativeScores[i]);
            r.storedScore = capped;
            r.activityCount = activityCounts_[i];
            r.lastUpdated = uint48(block.timestamp);
            if (capped > r.peakScore) r.peakScore = capped;
            _refreshNFT(tokenIds[i], capped, activityCounts_[i]);
            emit ScoreWritten(tokenIds[i], capped, activityCounts_[i]);
        }
    }

    /// @notice Real-time score with decay applied. Pure view — no gas for users.
    function currentScore(uint256 tokenId) public view returns (uint256) {
        ScoreRecord storage r = _scores[tokenId];
        if (r.lastPayment == 0) return r.storedScore; // no subscription data yet

        uint256 rate = r.decayRateOverride != 0
            ? r.decayRateOverride
            : decayRateBps;
        uint256 decayed = ScoreLib.decayedScore(
            r.storedScore,
            r.lastPayment,
            rate
        );

        // Floor is based on peak score (not stored score)
        uint256 floor = (r.peakScore * floorBps) / 10_000;
        return decayed < floor ? floor : decayed;
    }

    /// @notice Tier based on current (decayed) score.
    function currentTier(uint256 tokenId) public view returns (ScoreLib.Tier) {
        return ScoreLib.tierOf(currentScore(tokenId));
    }

    /// @notice Preview score after N months of lapse. Used by frontend decay chart.
    function previewDecay(
        uint256 tokenId,
        uint256 monthsLapsed
    ) external view returns (uint256) {
        ScoreRecord storage r = _scores[tokenId];
        if (monthsLapsed == 0) return r.storedScore;

        uint256 rate = r.decayRateOverride != 0
            ? r.decayRateOverride
            : decayRateBps;
        uint256 result = r.storedScore;
        uint256 factor = 10_000 - rate;
        for (uint i; i < monthsLapsed; ++i) {
            result = (result * factor) / 10_000;
        }
        uint256 floor = (r.peakScore * floorBps) / 10_000;
        return result < floor ? floor : result;
    }

    function scoreRecord(
        uint256 tokenId
    ) external view returns (ScoreRecord memory) {
        return _scores[tokenId];
    }

    function activityCount(uint256 tokenId) external view returns (uint256) {
        return _scores[tokenId].activityCount;
    }

    // ========= Admin =========

    function setDecayConfig(
        uint256 rateBps_,
        uint256 floorBps_
    ) external onlyRole(ADMIN_ROLE) {
        if (rateBps_ > 5000 || floorBps_ > 9000) revert InvalidConfig();
        decayRateBps = rateBps_;
        floorBps = floorBps_;
        emit DecayConfigUpdated(rateBps_, floorBps_);
    }

    function setDecayOverride(
        uint256 tokenId,
        uint256 rateBps_
    ) external onlyRole(ADMIN_ROLE) {
        _scores[tokenId].decayRateOverride = rateBps_;
    }

    // ======== Internal =========

    function _refreshNFT(
        uint256 tokenId,
        uint256 score,
        uint256 count
    ) internal {
        if (address(nft) == address(0)) return;
        ScoreLib.Tier tier = ScoreLib.tierOf(score);
        try nft.updateMeta(tokenId, score, count, tier) {} catch {}
    }

    function _authorizeUpgrade(
        address
    ) internal override onlyRole(UPGRADER_ROLE) {}
}
