// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IChildFactory
 * @notice Factory interface responsible for instantiating concrete child protocol instances.
 */
interface IChildFactory {
    /// @notice Unique protocol type identifier handled by this factory
    function childType() external view returns (bytes32);

    /**
     * @notice Deploys a new child contract instance.
     * @param garden The address of the GardenCore contract.
     * @param initParams ABI-encoded initialization parameters specific to the child type.
     * @return child The address of the newly deployed child contract.
     */
    function deployChild(address garden, bytes calldata initParams) external returns (address child);
}
