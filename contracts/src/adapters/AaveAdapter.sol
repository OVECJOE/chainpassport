// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IActivityAdapter} from "../interfaces/IActivityAdapter.sol";

/// @title  AaveAdapter
/// @notice Decodes Aave V3 supply/borrow activity.
///         data = abi.encode(asset, amount, isBorrow)
contract AaveAdapter is IActivityAdapter {
    function decode(address /* user */, bytes calldata data)
        external
        pure
        override
        returns (uint8 activityType, uint256 value, bytes memory extra)
    {
        activityType = 0x02; // LEND

        if (data.length == 0) return (activityType, 0, "");

        (address asset, uint256 amount, bool isBorrow)
            = abi.decode(data, (address, uint256, bool));

        value = amount;
        extra = abi.encode(asset, isBorrow);
    }
}
