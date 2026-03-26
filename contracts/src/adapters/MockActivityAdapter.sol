// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IActivityAdapter} from "../interfaces/IActivityAdapter.sol";

/// @title  MockActivityAdapter
/// @notice Test adapter that decodes a simple (activityType, value) tuple.
///         Used in DeployPassport.s.sol for local/testnet deployments.
///         Replace with real adapters (UniswapAdapter, AaveAdapter, etc.) for prod.
contract MockActivityAdapter is IActivityAdapter {
    uint8 public immutable defaultActivityType;

    constructor(uint8 activityType_) {
        defaultActivityType = activityType_;
    }

    /// @dev Expects data = abi.encode(value, extraBytes)
    ///      If data is empty, returns defaultActivityType with value=0.
    function decode(address /* user */, bytes calldata data)
        external
        view
        override
        returns (uint8 activityType, uint256 value, bytes memory extra)
    {
        activityType = defaultActivityType;
        if (data.length == 0) {
            return (activityType, 0, "");
        }
        (value, extra) = abi.decode(data, (uint256, bytes));
    }
}
