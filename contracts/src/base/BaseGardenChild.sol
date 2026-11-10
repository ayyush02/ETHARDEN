// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IGardenChild.sol";

/**
 * @title BaseGardenChild
 * @notice Abstract base implementation for child protocols deployed by the Autonomous Protocol Garden.
 * @dev Enforces non-bypassable revenue sharing via inheritance. The child contract cannot divert or suppress
 *      the accrued Garden fee share, and only the Garden core contract holds pause/sunset privileges.
 */
abstract contract BaseGardenChild is IGardenChild {
    // ==========================================
    // State Variables
    // ==========================================

    /// @notice The parent GardenCore contract
    address public immutable override garden;

    /// @notice Unique protocol identifier
    bytes32 public immutable override childType;

    /// @notice Fixed revenue share basis points owed to the Garden (e.g. 2000 = 20%, 10000 max)
    uint16 public immutable override feeShareBps;

    /// @notice Operational status
    bool public override isActive;
    bool public override isSunset;

    /// @notice Performance metrics per token
    mapping(address => uint256) public override totalFeesGenerated;
    mapping(address => uint256) public override totalFeesPaidToGarden;
    mapping(address => uint256) public override totalVolume;
    mapping(address => uint256) public override accruedGardenFees;
    mapping(address => uint256) public override seedCapitalReceived;

    // Mutex guard against reentrancy
    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    // ==========================================
    // Modifiers
    // ==========================================

    modifier onlyGarden() {
        require(msg.sender == garden, "ONLY_GARDEN");
        _;
    }

    modifier whenActive() {
        require(isActive && !isSunset, "PROTOCOL_INACTIVE_OR_SUNSET");
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
     * @param _garden Address of the central GardenCore contract.
     * @param _childType Protocol identifier tag.
     * @param _feeShareBps Revenue share basis points (e.g., 2000 for 20%). Max is 10000.
     */
    constructor(
        address _garden,
        bytes32 _childType,
        uint16 _feeShareBps
    ) {
        require(_garden != address(0), "INVALID_GARDEN_ADDRESS");
        require(_feeShareBps <= 10000, "INVALID_FEE_SHARE");
        garden = _garden;
        childType = _childType;
        feeShareBps = _feeShareBps;
        isActive = true;
        isSunset = false;
        _status = _NOT_ENTERED;
    }

    // ==========================================
    // Internal Fee Accounting (Non-Bypassable)
    // ==========================================

    /**
     * @dev Core fee split accounting. Every fee assessed by the child contract MUST route through this function.
     * @param token Token in which fee is paid (or address(0) for native ETH).
     * @param totalFee Total fee assessed from user/interaction.
     * @return protocolShare The remainder portion available to the child protocol/LPs.
     * @return gardenShare The portion locked for the Garden treasury.
     */
    function _recordAndSplitFee(
        address token,
        uint256 totalFee
    ) internal returns (uint256 protocolShare, uint256 gardenShare) {
        if (totalFee == 0) return (0, 0);

        gardenShare = (totalFee * feeShareBps) / 10000;
        protocolShare = totalFee - gardenShare;

        accruedGardenFees[token] += gardenShare;
        totalFeesGenerated[token] += totalFee;

        emit RevenueShared(token, totalFee, gardenShare, protocolShare);
    }

    /**
     * @dev Records transaction volume for performance analytics.
     */
    function _recordVolume(address token, uint256 volume) internal {
        totalVolume[token] += volume;
    }

    /**
     * @dev Records initial seed funding provided by the Garden.
     */
    function _recordSeedCapital(address token, uint256 amount) internal {
        seedCapitalReceived[token] += amount;
    }

    // ==========================================
    // External Lifecycle & Revenue Functions
    // ==========================================

    /**
     * @inheritdoc IGardenChild
     */
    function harvestRevenue(address token) external override nonReentrant returns (uint256 amountHarvested) {
        amountHarvested = accruedGardenFees[token];
        require(amountHarvested > 0, "NO_ACCRUED_FEES");

        accruedGardenFees[token] = 0;
        totalFeesPaidToGarden[token] += amountHarvested;

        if (token == address(0)) {
            (bool success, ) = payable(garden).call{value: amountHarvested}("");
            require(success, "ETH_TRANSFER_FAILED");
        } else {
            _safeTransfer(token, garden, amountHarvested);
        }

        emit RevenueHarvested(token, amountHarvested);
    }

    /**
     * @inheritdoc IGardenChild
     */
    function emergencyPause() external override onlyGarden {
        require(isActive, "ALREADY_PAUSED");
        isActive = false;
        emit ChildPaused(msg.sender);
    }

    /**
     * @inheritdoc IGardenChild
     */
    function emergencyUnpause() external override onlyGarden {
        require(!isActive && !isSunset, "CANNOT_UNPAUSE");
        isActive = true;
        emit ChildUnpaused(msg.sender);
    }

    // ==========================================
    // Internal Safe Transfer Helpers
    // ==========================================

    function _safeTransfer(address token, address to, uint256 amount) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", to, amount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "TOKEN_TRANSFER_FAILED");
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "TRANSFER_FROM_FAILED");
    }

    receive() external payable virtual {}
}
