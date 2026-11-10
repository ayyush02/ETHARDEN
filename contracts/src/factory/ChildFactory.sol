// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IChildFactory.sol";
import "../interfaces/IGardenChild.sol";
import "../children/SimpleAMMChild.sol";
import "../children/YieldVaultChild.sol";

/**
 * @title ChildFactory
 * @notice Factory capable of deploying diverse parameterized child protocols for the Garden.
 */
contract ChildFactory is IChildFactory {
    bytes32 public constant SIMPLE_AMM_TYPE = keccak256("SIMPLE_AMM");
    bytes32 public constant YIELD_VAULT_TYPE = keccak256("YIELD_VAULT");

    bytes32 public immutable override childType;

    event ChildCreated(address indexed child, bytes32 indexed protocolType, address indexed garden);

    constructor(bytes32 _childType) {
        childType = _childType;
    }

    /**
     * @notice Deploys a new child contract based on protocol type and encoded parameters.
     * @param garden Address of the GardenCore treasury and orchestrator.
     * @param initParams ABI encoded initialization parameters.
     */
    function deployChild(
        address garden,
        bytes calldata initParams
    ) external override returns (address child) {
        require(garden != address(0), "INVALID_GARDEN");

        if (childType == SIMPLE_AMM_TYPE) {
            (
                address token0,
                address token1,
                uint16 swapFeeBps,
                uint16 gardenFeeShareBps
            ) = abi.decode(initParams, (address, address, uint16, uint16));

            SimpleAMMChild amm = new SimpleAMMChild(
                garden,
                token0,
                token1,
                swapFeeBps,
                gardenFeeShareBps
            );
            child = address(amm);
        } else if (childType == YIELD_VAULT_TYPE) {
            (
                address asset,
                uint16 depositFeeBps,
                uint16 performanceFeeBps,
                uint16 gardenFeeShareBps
            ) = abi.decode(initParams, (address, uint16, uint16, uint16));

            YieldVaultChild vault = new YieldVaultChild(
                garden,
                asset,
                depositFeeBps,
                performanceFeeBps,
                gardenFeeShareBps
            );
            child = address(vault);
        } else {
            revert("UNSUPPORTED_CHILD_TYPE");
        }

        // Integrity verification
        require(IGardenChild(child).garden() == garden, "FACTORY_GARDEN_MISMATCH");
        emit ChildCreated(child, childType, garden);
    }
}
