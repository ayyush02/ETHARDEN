// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IGardenCore.sol";

/**
 * @title IEvolutionStrategy
 * @notice Strategy interface that evaluates child performance and generates mutated parameters for next generation deployments.
 */
interface IEvolutionStrategy {
    struct PerformanceScore {
        address childAddress;
        uint256 score; // Normalized score based on ROI, fee yield velocity, and volume
        bool shouldSunset;
    }

    struct DeploymentProposal {
        bytes32 childType;
        bytes initParams;
        uint256 seedCapital;
        address seedToken;
    }

    /**
     * @notice Evaluates a batch of active children and returns scoring and sunset candidates.
     * @param garden The GardenCore address.
     * @param children Array of active child addresses.
     * @param epochDuration Seconds elapsed in the epoch.
     * @return scores Performance scores and sunset flags for each child.
     */
    function evaluateChildren(
        address garden,
        address[] calldata children,
        uint256 epochDuration
    ) external view returns (PerformanceScore[] memory scores);

    /**
     * @notice Generates deployment proposals for the next epoch, mutating parameters based on top performers.
     * @param garden The GardenCore address.
     * @param availableTreasury Capital available for reinvestment in new experiments.
     * @param maxDeployments Maximum number of children to deploy in this cycle.
     * @return proposals Array of new child deployment proposals.
     */
    function planNextGeneration(
        address garden,
        uint256 availableTreasury,
        uint256 maxDeployments
    ) external view returns (DeploymentProposal[] memory proposals);
}
