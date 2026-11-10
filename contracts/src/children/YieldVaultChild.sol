// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../base/BaseGardenChild.sol";

/**
 * @title YieldVaultChild
 * @notice Parameterized fee-taking yield vault child protocol.
 * @dev Takes a deposit fee and performance fee on simulated harvest yield, sharing both with the Garden treasury.
 */
contract YieldVaultChild is BaseGardenChild {
    address public immutable asset;
    uint16 public immutable depositFeeBps;     // e.g. 50 = 0.5%
    uint16 public immutable performanceFeeBps; // e.g. 1000 = 10.0%

    uint256 public totalDeposits;
    mapping(address => uint256) public userShares;

    event Deposited(address indexed user, uint256 amountIn, uint256 feeDeducted, uint256 sharesIssued);
    event YieldHarvested(uint256 grossYield, uint256 performanceFee, uint256 netYieldCompounded);

    constructor(
        address _garden,
        address _asset,
        uint16 _depositFeeBps,
        uint16 _performanceFeeBps,
        uint16 _gardenFeeShareBps
    ) BaseGardenChild(_garden, keccak256("YIELD_VAULT"), _gardenFeeShareBps) {
        require(_asset != address(0), "INVALID_ASSET");
        require(_depositFeeBps <= 1000, "EXCESSIVE_DEPOSIT_FEE"); // Max 10%
        require(_performanceFeeBps <= 3000, "EXCESSIVE_PERF_FEE"); // Max 30%
        asset = _asset;
        depositFeeBps = _depositFeeBps;
        performanceFeeBps = _performanceFeeBps;
    }

    function deposit(uint256 amount) external nonReentrant whenActive returns (uint256 shares) {
        require(amount > 0, "ZERO_AMOUNT");

        _safeTransferFrom(asset, msg.sender, address(this), amount);

        uint256 fee = (amount * depositFeeBps) / 10000;
        _recordAndSplitFee(asset, fee);
        _recordVolume(asset, amount);

        uint256 netDeposit = amount - fee;
        totalDeposits += netDeposit;
        userShares[msg.sender] += netDeposit;

        if (msg.sender == garden) {
            _recordSeedCapital(asset, netDeposit);
        }

        emit Deposited(msg.sender, amount, fee, netDeposit);
        return netDeposit;
    }

    /**
     * @notice Distributes simulated yield (e.g. from lending or strategy) and extracts performance fee.
     */
    function compoundYield(uint256 grossYield) external nonReentrant whenActive {
        require(grossYield > 0, "ZERO_YIELD");
        _safeTransferFrom(asset, msg.sender, address(this), grossYield);

        uint256 perfFee = (grossYield * performanceFeeBps) / 10000;
        _recordAndSplitFee(asset, perfFee);

        uint256 netYield = grossYield - perfFee;
        totalDeposits += netYield;

        emit YieldHarvested(grossYield, perfFee, netYield);
    }

    function sunset(address primaryToken) external override onlyGarden nonReentrant returns (uint256 reclaimedAmount) {
        require(!isSunset, "ALREADY_SUNSET");
        isSunset = true;
        isActive = false;

        // Harvest any accrued fees
        if (accruedGardenFees[asset] > 0) {
            uint256 fees = accruedGardenFees[asset];
            accruedGardenFees[asset] = 0;
            totalFeesPaidToGarden[asset] += fees;
            _safeTransfer(asset, garden, fees);
        }

        // Return all vault assets to Garden
        reclaimedAmount = _getAssetBalance();
        if (reclaimedAmount > 0) {
            _safeTransfer(asset, garden, reclaimedAmount);
            emit ChildSunset(garden, asset, reclaimedAmount);
        }
        totalDeposits = 0;
    }

    function _getAssetBalance() internal view returns (uint256) {
        (bool success, bytes memory data) = asset.staticcall(
            abi.encodeWithSignature("balanceOf(address)", address(this))
        );
        if (success && data.length >= 32) {
            return abi.decode(data, (uint256));
        }
        return 0;
    }
}
