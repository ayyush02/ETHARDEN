// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IEvolutionStrategy.sol";
import "../interfaces/IGardenCore.sol";
import "../interfaces/IGardenChild.sol";

/**
 * @title EvolutionaryStrategy
 * @notice On-chain genetic evolutionary strategy engine for the Autonomous Protocol Garden.
 * @dev Evaluates child performance, identifies underperformers for sunsetting, and mutates deployment
 *      parameters biased toward top-yielding parameter regimes across successive generations.
 */
contract EvolutionaryStrategy is IEvolutionStrategy {
    // ==========================================
    // Governance & Strategy Configuration
    // ==========================================

    address public owner;
    address public pendingOwner;

    /// @notice Minimum active duration (in seconds) before a child can be sunset for low performance
    uint256 public minGracePeriod = 1 days;

    /// @notice Minimum return on seed capital in basis points required to avoid sunsetting (e.g. 50 = 0.5%)
    uint256 public minRoiThresholdBps = 20;

    /// @notice Default seed capital per newly spawned child
    uint256 public defaultSeedCapital = 100 ether;

    /// @notice Mutation variance percentage (e.g. 20 = +/- 20% exploration around top performer traits)
    uint16 public mutationVariancePercent = 20;

    // Events
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event StrategyConfigUpdated(uint256 minGracePeriod, uint256 minRoiThresholdBps, uint16 mutationVariancePercent);

    modifier onlyOwner() {
        require(msg.sender == owner, "ONLY_OWNER");
        _;
    }

    constructor(address _initialOwner) {
        require(_initialOwner != address(0), "INVALID_OWNER");
        owner = _initialOwner;
    }

    // ==========================================
    // Governance Controls
    // ==========================================

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "INVALID_NEW_OWNER");
        pendingOwner = newOwner;
    }

    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "NOT_PENDING_OWNER");
        emit OwnershipTransferred(owner, pendingOwner);
        owner = pendingOwner;
        pendingOwner = address(0);
    }

    function updateConfig(
        uint256 _minGracePeriod,
        uint256 _minRoiThresholdBps,
        uint256 _defaultSeedCapital,
        uint16 _mutationVariancePercent
    ) external onlyOwner {
        require(_mutationVariancePercent <= 50, "VARIANCE_TOO_HIGH");
        minGracePeriod = _minGracePeriod;
        minRoiThresholdBps = _minRoiThresholdBps;
        defaultSeedCapital = _defaultSeedCapital;
        mutationVariancePercent = _mutationVariancePercent;
        emit StrategyConfigUpdated(_minGracePeriod, _minRoiThresholdBps, _mutationVariancePercent);
    }

    // ==========================================
    // Performance Evaluation & Sunset Logic
    // ==========================================

    /**
     * @inheritdoc IEvolutionStrategy
     */
    function evaluateChildren(
        address garden,
        address[] calldata children,
        uint256 epochDuration
    ) external view override returns (PerformanceScore[] memory scores) {
        scores = new PerformanceScore[](children.length);
        IGardenCore gardenCore = IGardenCore(garden);

        for (uint256 i = 0; i < children.length; i++) {
            address child = children[i];
            IGardenCore.ChildRecord memory record = gardenCore.getChildRecord(child);

            // Compute score based on ROI: (totalRevenueReturned * 10,000) / (seedCapital + 1)
            uint256 score = 0;
            if (record.seedCapital > 0) {
                score = (record.totalRevenueReturned * 10000) / record.seedCapital;
            } else {
                score = record.totalRevenueReturned;
            }

            uint256 age = block.timestamp - record.deployedAt;
            bool shouldSunset = false;

            // Only evaluate sunsetting if beyond grace period
            if (age >= minGracePeriod && record.status == IGardenCore.ChildStatus.Active) {
                // If child failed to meet minimum ROI threshold
                if (score < minRoiThresholdBps) {
                    shouldSunset = true;
                }
            }

            scores[i] = PerformanceScore({
                childAddress: child,
                score: score,
                shouldSunset: shouldSunset
            });
        }
    }

    // ==========================================
    // Parameter Evolution & Next Generation
    // ==========================================

    /**
     * @inheritdoc IEvolutionStrategy
     */
    function planNextGeneration(
        address garden,
        uint256 availableTreasury,
        uint256 maxDeployments
    ) external view override returns (DeploymentProposal[] memory proposals) {
        IGardenCore gardenCore = IGardenCore(garden);
        address[] memory activeChildren = gardenCore.getActiveChildren();

        // Target deployment count bounded by treasury and maxDeployments
        uint256 plannedCount = maxDeployments;
        if (plannedCount == 0) plannedCount = 2;
        if (plannedCount > 4) plannedCount = 4;

        proposals = new DeploymentProposal[](plannedCount);

        // Find top performing AMM child (if any exists)
        uint16 bestSwapFeeBps = 30; // default 0.30%
        uint16 bestGardenFeeShareBps = 2000; // default 20%
        address bestToken0 = address(0);
        address bestToken1 = address(0);
        uint256 highestScore = 0;

        for (uint256 i = 0; i < activeChildren.length; i++) {
            IGardenCore.ChildRecord memory record = gardenCore.getChildRecord(activeChildren[i]);
            if (record.childType == keccak256("SIMPLE_AMM") && record.initParams.length >= 128) {
                uint256 score = record.seedCapital > 0
                    ? (record.totalRevenueReturned * 10000) / record.seedCapital
                    : 0;

                if (score >= highestScore) {
                    highestScore = score;
                    (
                        address t0,
                        address t1,
                        uint16 fee,
                        uint16 share
                    ) = abi.decode(record.initParams, (address, address, uint16, uint16));
                    bestSwapFeeBps = fee;
                    bestGardenFeeShareBps = share;
                    bestToken0 = t0;
                    bestToken1 = t1;
                }
            }
        }

        // Genetic mutation loop: spawn children with mutated parameters biased toward best performer
        for (uint256 i = 0; i < plannedCount; i++) {
            // Seed pseudo-random entropy from block headers and index
            uint256 entropy = uint256(
                keccak256(abi.encodePacked(block.prevrandao, block.timestamp, i, activeChildren.length))
            );

            // Mutate swapFeeBps: +/- mutationVariancePercent
            int256 deltaPercent = int256((entropy % (mutationVariancePercent * 2 + 1))) - int256(uint256(mutationVariancePercent));
            int256 mutatedFee = int256(uint256(bestSwapFeeBps)) + (int256(uint256(bestSwapFeeBps)) * deltaPercent) / 100;

            // Clamp swap fee between 5 bps (0.05%) and 200 bps (2.00%)
            if (mutatedFee < 5) mutatedFee = 5;
            if (mutatedFee > 200) mutatedFee = 200;

            // Mutate Garden revenue share between 1500 (15%) and 3500 (35%)
            uint16 mutatedShare = bestGardenFeeShareBps;
            if ((entropy >> 8) % 2 == 0) {
                mutatedShare = mutatedShare > 1500 ? mutatedShare - 100 : 1500;
            } else {
                mutatedShare = mutatedShare < 3500 ? mutatedShare + 100 : 3500;
            }

            bytes memory initParams = abi.encode(
                bestToken0,
                bestToken1,
                uint16(uint256(mutatedFee)),
                mutatedShare
            );

            uint256 seed = defaultSeedCapital;
            if (seed * plannedCount > availableTreasury && availableTreasury > 0) {
                seed = availableTreasury / plannedCount;
            }

            proposals[i] = DeploymentProposal({
                childType: keccak256("SIMPLE_AMM"),
                initParams: initParams,
                seedCapital: seed,
                seedToken: bestToken0
            });
        }
    }
}
