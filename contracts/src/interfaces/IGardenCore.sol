// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IGardenChild.sol";

/**
 * @title IGardenCore
 * @notice Interface for the central treasury, deployment orchestrator, and lifecycle manager of the Protocol Garden.
 */
interface IGardenCore {
    enum ChildStatus {
        Inactive,
        Active,
        Paused,
        Sunset
    }

    struct ChildRecord {
        address childAddress;
        bytes32 childType;
        uint256 deployedAt;
        uint256 seedCapital;
        address seedToken;
        uint256 totalRevenueReturned;
        uint256 lastHarvestTimestamp;
        ChildStatus status;
        bytes initParams;
    }

    struct EpochReport {
        uint256 epochNumber;
        uint256 timestamp;
        uint256 activeChildrenCount;
        uint256 totalRevenueHarvested;
        uint256 childrenSunsetCount;
        uint256 childrenSpawnedCount;
    }

    // Events
    event ChildDeployed(address indexed childAddress, bytes32 indexed childType, uint256 seedCapital, address seedToken);
    event RevenueReceived(address indexed childAddress, address indexed token, uint256 amount);
    event ChildStateChanged(address indexed childAddress, ChildStatus previousStatus, ChildStatus newStatus);
    event FactoryRegistered(bytes32 indexed childType, address indexed factory);
    event StrategyUpdated(address indexed oldStrategy, address indexed newStrategy);
    event EpochEvaluated(uint256 indexed epochNumber, uint256 harvestedRevenue, uint256 sunsetCount, uint256 spawnedCount);
    event SeedFunded(address indexed funder, address indexed token, uint256 amount);

    // View Functions
    function treasuryBalance(address token) external view returns (uint256);
    function getChildRecord(address childAddress) external view returns (ChildRecord memory);
    function getActiveChildren() external view returns (address[] memory);
    function getAllChildren() external view returns (address[] memory);
    function currentEpoch() external view returns (uint256);

    // State Changing Functions
    function deployChild(
        bytes32 childType,
        bytes calldata initParams,
        uint256 seedEthAmount,
        address seedToken,
        uint256 seedTokenAmount
    ) external returns (address newChild);

    function harvestChildRevenue(address childAddress, address token) external returns (uint256 harvested);
    function harvestAllChildren(address token) external returns (uint256 totalHarvested);
    function pauseChild(address childAddress) external;
    function unpauseChild(address childAddress) external;
    function sunsetChild(address childAddress) external returns (uint256 reclaimedCapital);
    function evaluateEpoch() external;
}
