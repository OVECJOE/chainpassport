// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

interface IActivityEmitter {
    function emitActivity(
        uint8 activityType, // topic[0]: replaces sig hash
        address user, // topic[1]: always the actor
        uint256 tokenId, // topic[2]: passport NFT id
        uint32 partnerId, // topic[3]: protocol source
        uint256 value, // data: primary value (amount / tokenId)
        bytes calldata extra // data: abi-encoded extra payload
    ) external;

    function EMITTER_ROLE() external view returns (bytes32);

    function grantRole(bytes32 role, address account) external;
}
