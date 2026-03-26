// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IActivityAdapter} from "../interfaces/IActivityAdapter.sol";

/// @title  UniswapV3Adapter
/// @notice Decodes Uniswap V3 swap data submitted by the backend operator.
///         The operator backend listens to Uniswap's Swap events off-chain,
///         then calls ActivityRouter.route() with the encoded swap data.
///
///         data = abi.encode(tokenIn, tokenOut, amountIn, amountOut)
contract UniswapV3Adapter is IActivityAdapter {
    function decode(address /* user */, bytes calldata data)
        external
        pure
        override
        returns (uint8 activityType, uint256 value, bytes memory extra)
    {
        activityType = 0x01; // TRADE

        if (data.length == 0) return (activityType, 0, "");

        (address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut)
            = abi.decode(data, (address, address, uint256, uint256));

        value = amountOut; // primary value is what the user received
        extra = abi.encode(tokenIn, tokenOut, amountIn); // secondary payload
    }
}
