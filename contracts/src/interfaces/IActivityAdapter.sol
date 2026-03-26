// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

interface IActivityAdapter {
    /// @notice Decode raw calldata from the source protocol and return
    ///         normalised activity fields for ActivityRouter to forward.
    /// @param user      The wallet that performed the action.
    /// @param data      Arbitrary bytes forwarded from the router (e.g. raw
    ///                  calldata from a hook or a manual submission).
    /// @return activityType  One of the ACTIVITY_* constants in IActivityEmitter.
    /// @return value         Primary numeric value (trade amount, NFT tokenId…).
    /// @return extra         ABI-encoded extra payload stored in LOG4 data field.
    function decode(address user, bytes calldata data) external view returns (uint8 activityType, uint256 value, bytes memory extra);
}
