// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IGardenCore.sol";
import "../interfaces/IGardenChild.sol";
import "../interfaces/IChildFactory.sol";
import "../interfaces/IEvolutionStrategy.sol";

/**
 * @title GardenCore
 * @notice Central orchestrator and treasury of the Autonomous Protocol Garden.
 * @dev Manages capital allocation, autonomous deployment via factories, revenue collection,
 *      lifecycle transitions (pause, sunset, capital reclamation), and on-chain evolutionary epochs.
 */
contract GardenCore is IGardenCore {
    // ==========================================
    // Governance & Security State
    // ==========================================

    address public owner;
    address public pendingOwner;
    bool public paused;

    // Mutex
    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    // Strategy contract
    IEvolutionStrategy public strategy;

    // Epoch tracking
    uint256 public override currentEpoch;
    uint256 public lastEpochEvaluationTimestamp;
    uint256 public epochInterval = 7 days;

    // Reinvestment policy
    uint16 public reinvestmentRatioBps = 7000; // 70% of treasury reinvested into new experiments, 30% reserve
    uint256 public maxChildrenPerEpoch = 3;

    // ==========================================
    // Registry & Accounting State
    // ==========================================

    /// @notice Child type => Registered Factory address
    mapping(bytes32 => address) public registeredFactories;

    /// @notice Child address => Child performance record
    mapping(address => ChildRecord) public override getChildRecord;

    /// @notice Array of all historically deployed children
    address[] private _allChildren;

    /// @notice Array of currently active children
    address[] private _activeChildren;

    /// @notice Token => Treasury reserve balance (address(0) = ETH)
    mapping(address => uint256) public override treasuryBalance;

    /// @notice Epoch reports history
    mapping(uint256 => EpochReport) public epochReports;

    // ==========================================
    // Modifiers
    // ==========================================

    modifier onlyOwner() {
        require(msg.sender == owner, "ONLY_OWNER");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "GARDEN_PAUSED");
        _;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "REENTRANCY_GUARD");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    // ==========================================
    // Constructor
    // ==========================================

    /**
     * @param _initialOwner DAO or initial administrator address
     * @param _strategy Evolutionary strategy engine address
     */
    constructor(address _initialOwner, address _strategy) {
        require(_initialOwner != address(0), "INVALID_OWNER");
        owner = _initialOwner;
        if (_strategy != address(0)) {
            strategy = IEvolutionStrategy(_strategy);
        }
        currentEpoch = 1;
        lastEpochEvaluationTimestamp = block.timestamp;
        _status = _NOT_ENTERED;
    }

    // ==========================================
    // Governance & Configuration
    // ==========================================

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "INVALID_NEW_OWNER");
        pendingOwner = newOwner;
    }

    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "NOT_PENDING_OWNER");
        owner = pendingOwner;
        pendingOwner = address(0);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    function setStrategy(address newStrategy) external onlyOwner {
        require(newStrategy != address(0), "INVALID_STRATEGY");
        address old = address(strategy);
        strategy = IEvolutionStrategy(newStrategy);
        emit StrategyUpdated(old, newStrategy);
    }

    function registerFactory(bytes32 childType, address factory) external onlyOwner {
        require(factory != address(0), "INVALID_FACTORY");
        registeredFactories[childType] = factory;
        emit FactoryRegistered(childType, factory);
    }

    function setReinvestmentParameters(
        uint16 _reinvestmentRatioBps,
        uint256 _epochInterval,
        uint256 _maxChildrenPerEpoch
    ) external onlyOwner {
        require(_reinvestmentRatioBps <= 10000, "INVALID_RATIO");
        require(_epochInterval >= 1 hours, "INTERVAL_TOO_SHORT");
        reinvestmentRatioBps = _reinvestmentRatioBps;
        epochInterval = _epochInterval;
        maxChildrenPerEpoch = _maxChildrenPerEpoch;
    }

    // ==========================================
    // Treasury Management
    // ==========================================

    /**
     * @notice Deposits ERC20 tokens into the Garden treasury reserve.
     */
    function depositTreasury(address token, uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "ZERO_DEPOSIT");
        require(token != address(0), "USE_NATIVE_ETH_FOR_ADDRESS_ZERO");

        _safeTransferFrom(token, msg.sender, address(this), amount);
        treasuryBalance[token] += amount;

        emit SeedFunded(msg.sender, token, amount);
    }

    /**
     * @notice Deposits native ETH into the Garden treasury.
     */
    function depositTreasuryETH() external payable nonReentrant whenNotPaused {
        require(msg.value > 0, "ZERO_ETH");
        treasuryBalance[address(0)] += msg.value;
        emit SeedFunded(msg.sender, address(0), msg.value);
    }

    // ==========================================
    // Child Deployment
    // ==========================================

    /**
     * @notice Deploys a new child protocol via its registered factory and seeds it with capital.
     */
    function deployChild(
        bytes32 childType,
        bytes calldata initParams,
        uint256 seedEthAmount,
        address seedToken,
        uint256 seedTokenAmount
    ) external override nonReentrant whenNotPaused returns (address newChild) {
        address factory = registeredFactories[childType];
        require(factory != address(0), "FACTORY_NOT_REGISTERED");

        // Deploy child instance
        newChild = IChildFactory(factory).deployChild(address(this), initParams);
        require(newChild != address(0), "DEPLOYMENT_FAILED");

        // Seed with ETH if specified
        if (seedEthAmount > 0) {
            require(treasuryBalance[address(0)] >= seedEthAmount, "INSUFFICIENT_ETH_TREASURY");
            treasuryBalance[address(0)] -= seedEthAmount;
            (bool success, ) = payable(newChild).call{value: seedEthAmount}("");
            require(success, "SEED_ETH_TRANSFER_FAILED");
        }

        // Seed with Token if specified
        if (seedTokenAmount > 0 && seedToken != address(0)) {
            require(treasuryBalance[seedToken] >= seedTokenAmount, "INSUFFICIENT_TOKEN_TREASURY");
            treasuryBalance[seedToken] -= seedTokenAmount;
            _safeTransfer(seedToken, newChild, seedTokenAmount);
        }

        uint256 seedTotal = (seedEthAmount > 0) ? seedEthAmount : seedTokenAmount;
        address primarySeed = (seedEthAmount > 0) ? address(0) : seedToken;

        // Register record
        getChildRecord[newChild] = ChildRecord({
            childAddress: newChild,
            childType: childType,
            deployedAt: block.timestamp,
            seedCapital: seedTotal,
            seedToken: primarySeed,
            totalRevenueReturned: 0,
            lastHarvestTimestamp: block.timestamp,
            status: ChildStatus.Active,
            initParams: initParams
        });

        _allChildren.push(newChild);
        _activeChildren.push(newChild);

        emit ChildDeployed(newChild, childType, seedTotal, primarySeed);
    }

    // ==========================================
    // Revenue Collection & Tracking
    // ==========================================

    /**
     * @notice Pulls accrued revenue share from a specific child into the Garden treasury.
     */
    function harvestChildRevenue(
        address childAddress,
        address token
    ) public override nonReentrant returns (uint256 harvested) {
        ChildRecord storage record = getChildRecord[childAddress];
        require(record.status != ChildStatus.Inactive, "CHILD_NOT_FOUND");

        harvested = IGardenChild(childAddress).harvestRevenue(token);
        if (harvested > 0) {
            treasuryBalance[token] += harvested;
            record.totalRevenueReturned += harvested;
            record.lastHarvestTimestamp = block.timestamp;
            emit RevenueReceived(childAddress, token, harvested);
        }
    }

    /**
     * @notice Harvests accrued revenue across all active children for a given token.
     */
    function harvestAllChildren(address token) external override returns (uint256 totalHarvested) {
        for (uint256 i = 0; i < _activeChildren.length; i++) {
            address child = _activeChildren[i];
            try this.harvestChildRevenue(child, token) returns (uint256 amount) {
                totalHarvested += amount;
            } catch {
                // Keep harvesting other children if one reverts
            }
        }
    }

    // ==========================================
    // Lifecycle Controls
    // ==========================================

    /**
     * @notice Emergency pauses an underperforming or anomalous child protocol.
     */
    function pauseChild(address childAddress) external override onlyOwner {
        ChildRecord storage record = getChildRecord[childAddress];
        require(record.status == ChildStatus.Active, "NOT_ACTIVE");

        record.status = ChildStatus.Paused;
        IGardenChild(childAddress).emergencyPause();
        emit ChildStateChanged(childAddress, ChildStatus.Active, ChildStatus.Paused);
    }

    /**
     * @notice Unpauses a previously paused child protocol.
     */
    function unpauseChild(address childAddress) external override onlyOwner {
        ChildRecord storage record = getChildRecord[childAddress];
        require(record.status == ChildStatus.Paused, "NOT_PAUSED");

        record.status = ChildStatus.Active;
        IGardenChild(childAddress).emergencyUnpause();
        emit ChildStateChanged(childAddress, ChildStatus.Paused, ChildStatus.Active);
    }

    /**
     * @notice Permanently sunsets an underperforming child, liquidating its assets and reclaiming capital.
     */
    function sunsetChild(address childAddress) public override nonReentrant returns (uint256 reclaimedCapital) {
        // Can be called by owner OR automatically during evaluateEpoch
        require(msg.sender == owner || msg.sender == address(this), "UNAUTHORIZED");

        ChildRecord storage record = getChildRecord[childAddress];
        require(record.status == ChildStatus.Active || record.status == ChildStatus.Paused, "ALREADY_SUNSET_OR_INACTIVE");

        ChildStatus oldStatus = record.status;
        record.status = ChildStatus.Sunset;

        // Sunset child protocol and pull all underlying funds
        reclaimedCapital = IGardenChild(childAddress).sunset(record.seedToken);
        treasuryBalance[record.seedToken] += reclaimedCapital;

        // Remove from active children list
        _removeFromActiveChildren(childAddress);

        emit ChildStateChanged(childAddress, oldStatus, ChildStatus.Sunset);
    }

    // ==========================================
    // Autonomous Evolutionary Epoch Evaluation
    // ==========================================

    /**
     * @notice Evaluates the current epoch, sunsets bottom performers, and deploys next generation experiments.
     * @dev Can be executed periodically by automated keepers or governance.
     */
    function evaluateEpoch() external override nonReentrant whenNotPaused {
        require(block.timestamp >= lastEpochEvaluationTimestamp + epochInterval, "EPOCH_INTERVAL_NOT_MET");
        require(address(strategy) != address(0), "STRATEGY_NOT_CONFIGURED");

        uint256 epochDuration = block.timestamp - lastEpochEvaluationTimestamp;
        lastEpochEvaluationTimestamp = block.timestamp;

        // 1. Harvest all accrued revenue first
        uint256 epochHarvested = 0;
        for (uint256 i = 0; i < _activeChildren.length; i++) {
            address child = _activeChildren[i];
            address seedTok = getChildRecord[child].seedToken;
            try IGardenChild(child).harvestRevenue(seedTok) returns (uint256 amount) {
                treasuryBalance[seedTok] += amount;
                getChildRecord[child].totalRevenueReturned += amount;
                epochHarvested += amount;
                emit RevenueReceived(child, seedTok, amount);
            } catch {}
        }

        // 2. Query strategy for scoring and sunset candidates
        IEvolutionStrategy.PerformanceScore[] memory scores = strategy.evaluateChildren(
            address(this),
            _activeChildren,
            epochDuration
        );

        uint256 sunsetCount = 0;
        for (uint256 i = 0; i < scores.length; i++) {
            if (scores[i].shouldSunset) {
                // Sunset underperforming child
                try this.sunsetChild(scores[i].childAddress) {
                    sunsetCount++;
                } catch {}
            }
        }

        // 3. Plan and deploy next generation
        uint256 spawnedCount = 0;
        // Determine available treasury for primary asset (token or ETH)
        address primaryToken = address(0);
        if (_activeChildren.length > 0) {
            primaryToken = getChildRecord[_activeChildren[0]].seedToken;
        }

        uint256 totalPrimaryTreasury = treasuryBalance[primaryToken];
        uint256 allocatableTreasury = (totalPrimaryTreasury * reinvestmentRatioBps) / 10000;

        IEvolutionStrategy.DeploymentProposal[] memory proposals = strategy.planNextGeneration(
            address(this),
            allocatableTreasury,
            maxChildrenPerEpoch
        );

        for (uint256 i = 0; i < proposals.length; i++) {
            bytes32 pType = proposals[i].childType;
            if (registeredFactories[pType] != address(0) && proposals[i].seedCapital > 0) {
                if (treasuryBalance[proposals[i].seedToken] >= proposals[i].seedCapital) {
                    address factory = registeredFactories[pType];
                    address deployed = IChildFactory(factory).deployChild(address(this), proposals[i].initParams);

                    if (deployed != address(0)) {
                        treasuryBalance[proposals[i].seedToken] -= proposals[i].seedCapital;
                        _safeTransfer(proposals[i].seedToken, deployed, proposals[i].seedCapital);

                        getChildRecord[deployed] = ChildRecord({
                            childAddress: deployed,
                            childType: pType,
                            deployedAt: block.timestamp,
                            seedCapital: proposals[i].seedCapital,
                            seedToken: proposals[i].seedToken,
                            totalRevenueReturned: 0,
                            lastHarvestTimestamp: block.timestamp,
                            status: ChildStatus.Active,
                            initParams: proposals[i].initParams
                        });

                        _allChildren.push(deployed);
                        _activeChildren.push(deployed);
                        spawnedCount++;

                        emit ChildDeployed(deployed, pType, proposals[i].seedCapital, proposals[i].seedToken);
                    }
                }
            }
        }

        epochReports[currentEpoch] = EpochReport({
            epochNumber: currentEpoch,
            timestamp: block.timestamp,
            activeChildrenCount: _activeChildren.length,
            totalRevenueHarvested: epochHarvested,
            childrenSunsetCount: sunsetCount,
            childrenSpawnedCount: spawnedCount
        });

        emit EpochEvaluated(currentEpoch, epochHarvested, sunsetCount, spawnedCount);
        currentEpoch++;
    }

    // ==========================================
    // View Functions
    // ==========================================

    function getActiveChildren() external view override returns (address[] memory) {
        return _activeChildren;
    }

    function getAllChildren() external view override returns (address[] memory) {
        return _allChildren;
    }

    // ==========================================
    // Internal Utilities
    // ==========================================

    function _removeFromActiveChildren(address child) internal {
        uint256 len = _activeChildren.length;
        for (uint256 i = 0; i < len; i++) {
            if (_activeChildren[i] == child) {
                _activeChildren[i] = _activeChildren[len - 1];
                _activeChildren.pop();
                break;
            }
        }
    }

    function _safeTransfer(address token, address to, uint256 amount) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", to, amount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "TRANSFER_FAILED");
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "TRANSFER_FROM_FAILED");
    }

    receive() external payable {
        treasuryBalance[address(0)] += msg.value;
        emit SeedFunded(msg.sender, address(0), msg.value);
    }
}
