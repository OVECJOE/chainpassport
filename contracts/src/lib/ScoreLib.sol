// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

/// @title  ScoreLib
/// @notice Pure functions for score calculation, decay, and tier resolution.
///         No storage reads — all inputs passed by caller so logic is reusable
///         across upgrades without re-deploying the library.
library ScoreLib {
    uint256 constant SCALE = 1e18;
    uint256 constant GRACE_SECS = 7 days;
    uint256 constant MONTH_SECS = 30 days;
    uint256 constant FLOOR_BPS = 2000; // 20% of stored score
    uint256 constant BPS_DENOM = 10_000;

    // ============ Activity point weights ============
    uint256 constant PTS_TRADE = 18;
    uint256 constant PTS_LEND = 12;
    uint256 constant PTS_NFT = 8;
    uint256 constant PTS_VOTE = 6;
    uint256 constant PTS_CUSTOM = 4;

    // ============ Tier thresholds (out of 1000) ============
    uint256 constant TIER_GOLD = 850;
    uint256 constant TIER_SILVER = 550;
    uint256 constant TIER_BRONZE = 250;

    enum Tier { Unranked, Bronze, Silver, Gold }

    /// @dev Returns points awarded for a given activity type byte.
    ///      0x01=TRADE, 0x02=LEND, 0x03=NFT, 0x04=VOTE, 0x05+=CUSTOM
    function pointsFor(uint8 activityType) internal pure returns (uint256) {
        if (activityType == 0x01) return PTS_TRADE;
        if (activityType == 0x02) return PTS_LEND;
        if (activityType == 0x03) return PTS_NFT;
        if (activityType == 0x04) return PTS_VOTE;
        return PTS_CUSTOM;
    }

    /// @dev Applies exponential decay based on lapse duration.
    ///     decayRateBps: e.g. 200 = 2% decay per month
    function decayedScore(uint256 storedScore, uint48 lastPayment, uint256 decayRateBps) internal view returns (uint256) {
        if (block.timestamp <= uint256(lastPayment) + GRACE_SECS) return storedScore;
        uint256 elapsed = block.timestamp - uint256(lastPayment);

        uint256 months = (elapsed - GRACE_SECS) / MONTH_SECS;
        if (months == 0) return storedScore;

        // compound: score * ((BPS_DENOM - rate) / BPS_DENOM) ** months
        uint256 result = storedScore;
        uint256 decayFactor = BPS_DENOM - decayRateBps; // e.g. 9800 for 2% decay
        for (uint256 i; i < months; i++) {
            result = result * decayFactor / BPS_DENOM;
        }

        uint256 floor = storedScore * FLOOR_BPS / BPS_DENOM;
        return result > floor ? result : floor;
    }

    /// @dev Returns the capped score (max 1000)
    function cap(uint256 score) internal pure returns (uint256) {
        return score > 1000 ? 1000 : score;
    }

    /// @dev Resolves tier from a score.
    function tierOf(uint256 score) internal pure returns (Tier) {
        if (score >= TIER_GOLD) return Tier.Gold;
        if (score >= TIER_SILVER) return Tier.Silver;
        if (score >= TIER_BRONZE) return Tier.Bronze;
        return Tier.Unranked;
    }

    /// @dev Returns a human-readable tier string
    function tierName(Tier tier) internal pure returns (string memory) {
        if (tier == Tier.Gold) return "Gold";
        if (tier == Tier.Silver) return "Silver";
        if (tier == Tier.Bronze) return "Bronze";
        return "Unranked";
    }
}
