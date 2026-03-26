// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {PassportRegistry} from "./PassportRegistry.sol";
import {ScoreEngine} from "./ScoreEngine.sol";
import {ScoreLib} from "../lib/ScoreLib.sol";

/// @title  Verifier
/// @notice Public read-only contract for third parties (DAOs, employers, protocols)
///         to verify a wallet's passport score, tier, and subscription status.
///         No state mutations — pure verification surface.
///
///         V2 additions:
///         - Gating helpers: meetsScoreRequirement, meetsTierRequirement
///         - Bulk verification for DAO snapshot tools
///         - On-chain attestation events (opt-in, for audit trail)
contract Verifier is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    PassportRegistry public registry;
    ScoreEngine public scoreEngine;

    uint256[48] private __gap;

    struct VerificationResult {
        bool exists;
        bool subscriptionActive;
        uint256 tokenId;
        uint256 score;
        ScoreLib.Tier tier;
        uint256 activityCount;
        uint48 mintedAt;
        uint48 expiresAt;
    }

    // =========== Events ============

    event PassportVerified(
        address indexed verifier,
        address indexed subject,
        uint256 tokenId,
        uint256 score,
        ScoreLib.Tier tier,
        bool subscriptionActive
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address admin,
        address registry_,
        address scoreEngine_
    ) external initializer {
        __AccessControl_init();

        registry = PassportRegistry(registry_);
        scoreEngine = ScoreEngine(scoreEngine_);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }

    // ================ External Functions ================

    /// @notice Full verification result for a wallet.
    function verify(
        address user
    ) external view returns (VerificationResult memory result) {
        uint256 tokenId = registry.passportOf(user);
        if (tokenId == 0) {
            result.exists = false;
            return result;
        }

        PassportRegistry.PassportData memory pd = registry.passportData(user);
        uint256 score = scoreEngine.currentScore(tokenId);

        result = VerificationResult({
            exists: true,
            subscriptionActive: registry.isSubscriptionActive(user),
            tokenId: tokenId,
            score: score,
            tier: ScoreLib.tierOf(score),
            activityCount: scoreEngine.activityCount(tokenId),
            mintedAt: pd.mintedAt,
            expiresAt: pd.expiresAt
        });
    }

    /// @notice Emits an on-chain attestation for audit trail. Costs gas — opt-in.
    function verifyAndAttest(address subject) external {
        uint256 tokenId = registry.passportOf(subject);
        bool subActive = tokenId != 0 && registry.isSubscriptionActive(subject);
        uint256 score = tokenId != 0 ? scoreEngine.currentScore(tokenId) : 0;
        ScoreLib.Tier tier = ScoreLib.tierOf(score);

        emit PassportVerified(
            msg.sender,
            subject,
            tokenId,
            score,
            tier,
            subActive
        );
    }

    // ================ Gating helpers ================

    /// @notice Returns true if user has an active passport with score ≥ minScore.
    function meetsScoreRequirement(
        address user,
        uint256 minScore
    ) external view returns (bool) {
        uint256 tokenId = registry.passportOf(user);
        if (tokenId == 0) return false;
        if (!registry.isSubscriptionActive(user)) return false;
        return scoreEngine.currentScore(tokenId) >= minScore;
    }

    /// @notice Returns true if user's tier is ≥ requiredTier.
    function meetsTierRequirement(
        address user,
        ScoreLib.Tier requiredTier
    ) external view returns (bool) {
        uint256 tokenId = registry.passportOf(user);
        if (tokenId == 0) return false;
        if (!registry.isSubscriptionActive(user)) return false;
        uint256 score = scoreEngine.currentScore(tokenId);
        return uint8(ScoreLib.tierOf(score)) >= uint8(requiredTier);
    }

    /// @notice Bulk verify for DAO snapshot tools.
    function verifyBatch(
        address[] calldata users
    ) external view returns (VerificationResult[] memory results) {
        results = new VerificationResult[](users.length);
        for (uint i; i < users.length; ++i) {
            uint256 tokenId = registry.passportOf(users[i]);
            if (tokenId == 0) continue;
            PassportRegistry.PassportData memory pd = registry.passportData(
                users[i]
            );
            uint256 score = scoreEngine.currentScore(tokenId);
            results[i] = VerificationResult({
                exists: true,
                subscriptionActive: registry.isSubscriptionActive(users[i]),
                tokenId: tokenId,
                score: score,
                tier: ScoreLib.tierOf(score),
                activityCount: scoreEngine.activityCount(tokenId),
                mintedAt: pd.mintedAt,
                expiresAt: pd.expiresAt
            });
        }
    }

    function _authorizeUpgrade(
        address
    ) internal override onlyRole(UPGRADER_ROLE) {}
}
