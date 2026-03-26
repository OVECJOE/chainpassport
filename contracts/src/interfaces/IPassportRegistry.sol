// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

interface IPassportRegistry {
    struct PassportData {
        uint256 tokenId;
        uint48 mintedAt;
        uint48 lastPayment;
        uint48 expiresAt;
        bool active;
    }

    // ============ Errors ============
    error TransferFailed();

    function mint() external payable returns (uint256 tokenId);
    function renewSubscription() external payable;
    function cancelSubscription(uint256 tokenId) external;
    function passportOf(address user) external view returns (uint256 tokenId);
    function passportData(address user) external view returns (PassportData memory);
    function passportDataByToken(uint256 tokenId) external view returns (address owner);
    function isSubscriptionActive(address user) external view returns (bool);
    function subscriptionExpiresAt(address user) external view returns (uint48);
    function ROUTER_ROLE() external view returns (bytes32);
}
