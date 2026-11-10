import React, { useState } from 'react';
import { Header } from './components/Header';
import { GardenOverview } from './components/GardenOverview';
import { ChildProtocolGrid } from './components/ChildProtocolGrid';
import { EvolutionCyclePanel } from './components/EvolutionCyclePanel';
import { ContractExplorer } from './components/ContractExplorer';
import { FoundryTestConsole } from './components/FoundryTestConsole';
import { ArchitectureGuide } from './components/ArchitectureGuide';
import { SwapSimulatorModal } from './components/SwapSimulatorModal';
import { DeployChildModal } from './components/DeployChildModal';
import { ChildProtocol, TreasuryState, EpochRecord, ProtocolType } from './types/garden';

const INITIAL_TREASURY: TreasuryState = {
  ethBalance: 25.4,
  tokenABalance: 432500,
  tokenBBalance: 320,
  totalLifetimeRevenue: 48920,
  totalCapitalReinvested: 125000,
};

const INITIAL_CHILDREN: ChildProtocol[] = [
  {
    address: '0x3A2190A87e0766B8a666504C059B2bA97A2E9F21',
    name: 'Garden AMM Pair Alpha',
    type: 'SIMPLE_AMM',
    generation: 1,
    deployedAt: Date.now() - 14 * 86400000,
    seedCapital: 25000,
    seedToken: 'gUSD',
    swapFeeBps: 30, // 0.30%
    gardenFeeShareBps: 2000, // 20%
    totalVolume: 184200,
    totalFeesGenerated: 1105.2,
    accruedGardenFees: 221.0,
    totalRevenueHarvested: 884.2,
    reserve0: 32400,
    reserve1: 32.4,
    token0Symbol: 'gUSD',
    token1Symbol: 'gETH',
    status: 'Active',
    score: 4.4,
  },
  {
    address: '0x814674C78385AeaAc6Dea188E8130B1713B448e8',
    name: 'Low-Slippage Stable AMM',
    type: 'SIMPLE_AMM',
    generation: 1,
    deployedAt: Date.now() - 14 * 86400000,
    seedCapital: 15000,
    seedToken: 'gUSD',
    swapFeeBps: 10, // 0.10%
    gardenFeeShareBps: 2000, // 20%
    totalVolume: 340000,
    totalFeesGenerated: 340.0,
    accruedGardenFees: 68.0,
    totalRevenueHarvested: 272.0,
    reserve0: 19800,
    reserve1: 19.8,
    token0Symbol: 'gUSD',
    token1Symbol: 'gETH',
    status: 'Active',
    score: 2.3,
  },
  {
    address: '0xFD5B5fE92B1982b6831d1E8C5F57242F55716e9F',
    name: 'Dynamic Volatility AMM',
    type: 'SIMPLE_AMM',
    generation: 2,
    deployedAt: Date.now() - 7 * 86400000,
    seedCapital: 20000,
    seedToken: 'gUSD',
    swapFeeBps: 45, // 0.45% (Evolved trait)
    gardenFeeShareBps: 2500, // 25% (Evolved trait)
    totalVolume: 295000,
    totalFeesGenerated: 1327.5,
    accruedGardenFees: 331.9,
    totalRevenueHarvested: 995.6,
    reserve0: 28100,
    reserve1: 28.1,
    token0Symbol: 'gUSD',
    token1Symbol: 'gETH',
    status: 'Active',
    score: 6.6,
  },
  {
    address: '0x992B12Fa942aCe724fA826B85994f1c9c74A6981',
    name: 'Auto-Compounding Fee Vault',
    type: 'YIELD_VAULT',
    generation: 2,
    deployedAt: Date.now() - 7 * 86400000,
    seedCapital: 10000,
    seedToken: 'gUSD',
    depositFeeBps: 25, // 0.25%
    perfFeeBps: 1500, // 15%
    gardenFeeShareBps: 2500, // 25%
    totalVolume: 120000,
    totalFeesGenerated: 300.0,
    accruedGardenFees: 75.0,
    totalRevenueHarvested: 225.0,
    status: 'Active',
    score: 3.0,
  },
  {
    address: '0x17D234A59bc4F48467D226A691522F31a9807B42',
    name: 'High-Fee AMM Experiment',
    type: 'SIMPLE_AMM',
    generation: 0,
    deployedAt: Date.now() - 21 * 86400000,
    seedCapital: 10000,
    seedToken: 'gUSD',
    swapFeeBps: 180, // 1.80% (Excessive fee suppressed volume)
    gardenFeeShareBps: 2000,
    totalVolume: 12000,
    totalFeesGenerated: 216.0,
    accruedGardenFees: 0,
    totalRevenueHarvested: 43.2,
    status: 'Sunset',
    score: 0.4,
  },
];

const INITIAL_EPOCHS: EpochRecord[] = [
  {
    epochNumber: 1,
    timestamp: Date.now() - 63 * 86400000,
    activeChildrenCount: 2,
    totalHarvested: 1420.5,
    sunsetCount: 0,
    spawnedCount: 2,
    bestPerformingFeeBps: 30,
    avgRoiBps: 2.8,
  },
  {
    epochNumber: 2,
    timestamp: Date.now() - 56 * 86400000,
    activeChildrenCount: 3,
    totalHarvested: 2489.8,
    sunsetCount: 1,
    spawnedCount: 2,
    bestPerformingFeeBps: 35,
    avgRoiBps: 3.4,
  },
  {
    epochNumber: 3,
    timestamp: Date.now() - 49 * 86400000,
    activeChildrenCount: 3,
    totalHarvested: 3120.0,
    sunsetCount: 0,
    spawnedCount: 1,
    bestPerformingFeeBps: 40,
    avgRoiBps: 3.9,
  },
  {
    epochNumber: 4,
    timestamp: Date.now() - 42 * 86400000,
    activeChildrenCount: 4,
    totalHarvested: 3850.5,
    sunsetCount: 1,
    spawnedCount: 2,
    bestPerformingFeeBps: 40,
    avgRoiBps: 4.1,
  },
  {
    epochNumber: 5,
    timestamp: Date.now() - 35 * 86400000,
    activeChildrenCount: 4,
    totalHarvested: 4420.0,
    sunsetCount: 0,
    spawnedCount: 1,
    bestPerformingFeeBps: 45,
    avgRoiBps: 4.6,
  },
  {
    epochNumber: 6,
    timestamp: Date.now() - 28 * 86400000,
    activeChildrenCount: 4,
    totalHarvested: 5180.2,
    sunsetCount: 1,
    spawnedCount: 2,
    bestPerformingFeeBps: 45,
    avgRoiBps: 5.0,
  },
  {
    epochNumber: 7,
    timestamp: Date.now() - 21 * 86400000,
    activeChildrenCount: 4,
    totalHarvested: 5890.0,
    sunsetCount: 0,
    spawnedCount: 1,
    bestPerformingFeeBps: 45,
    avgRoiBps: 5.3,
  },
  {
    epochNumber: 8,
    timestamp: Date.now() - 14 * 86400000,
    activeChildrenCount: 5,
    totalHarvested: 6720.5,
    sunsetCount: 1,
    spawnedCount: 2,
    bestPerformingFeeBps: 45,
    avgRoiBps: 5.7,
  },
  {
    epochNumber: 9,
    timestamp: Date.now() - 7 * 86400000,
    activeChildrenCount: 4,
    totalHarvested: 7540.0,
    sunsetCount: 0,
    spawnedCount: 1,
    bestPerformingFeeBps: 45,
    avgRoiBps: 6.1,
  },
  {
    epochNumber: 10,
    timestamp: Date.now() - 1 * 86400000,
    activeChildrenCount: 4,
    totalHarvested: 8288.5,
    sunsetCount: 1,
    spawnedCount: 2,
    bestPerformingFeeBps: 45,
    avgRoiBps: 6.6,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'children' | 'evolution' | 'contracts' | 'tests' | 'architecture'>('overview');
  const [treasury, setTreasury] = useState<TreasuryState>(INITIAL_TREASURY);
  const [children, setChildren] = useState<ChildProtocol[]>(INITIAL_CHILDREN);
  const [currentEpoch, setCurrentEpoch] = useState<number>(11);
  const [epochs, setEpochs] = useState<EpochRecord[]>(INITIAL_EPOCHS);

  // Evolutionary Strategy Settings
  const [minRoiThresholdBps, setMinRoiThresholdBps] = useState<number>(20); // 0.20%
  const [mutationVariance, setMutationVariance] = useState<number>(20); // ±20%
  const [reinvestmentRatioBps, setReinvestmentRatioBps] = useState<number>(7000); // 70%

  // Modals
  const [swapModalChild, setSwapModalChild] = useState<ChildProtocol | null>(null);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);

  // Event Logs
  const [logs, setLogs] = useState<{ id: string; time: string; text: string; type: 'harvest' | 'deploy' | 'sunset' | 'epoch' | 'info' }[]>([
    {
      id: '1',
      time: '12m ago',
      text: 'GardenCore initialized with EvolutionaryStrategy at 0x9A67...7508',
      type: 'info',
    },
    {
      id: '2',
      time: '10m ago',
      text: 'Epoch 2 completed: Underperformer 0x17D2...7B42 sunset; 9,820 gUSD capital reclaimed',
      type: 'sunset',
    },
    {
      id: '3',
      time: '5m ago',
      text: 'Deployed Dynamic Volatility AMM (0.45% fee) with mutated genetic traits',
      type: 'deploy',
    },
    {
      id: '4',
      time: '2m ago',
      text: 'Revenue received: 331.9 gUSD routed directly into Treasury balance',
      type: 'harvest',
    },
  ]);

  const addLog = (text: string, type: 'harvest' | 'deploy' | 'sunset' | 'epoch' | 'info') => {
    const newLog = {
      id: Math.random().toString(),
      time: 'Just now',
      text,
      type,
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 19)]);
  };

  // Simulate Market Swaps & Volume across all active children
  const handleSimulateActivity = () => {
    setChildren((prev) =>
      prev.map((c) => {
        if (c.status !== 'Active') return c;

        // Random market swap volume
        const addedVol = Math.floor(Math.random() * 8000) + 1200;
        const feeRateBps = c.swapFeeBps || c.depositFeeBps || 30;
        const feeEarned = (addedVol * feeRateBps) / 10000;
        const gardenFeeEarned = (feeEarned * c.gardenFeeShareBps) / 10000;

        const newVol = c.totalVolume + addedVol;
        const newFees = c.totalFeesGenerated + feeEarned;
        const newAccrued = c.accruedGardenFees + gardenFeeEarned;
        const totalHarvestedAndAccrued = c.totalRevenueHarvested + newAccrued;
        const newScore = (totalHarvestedAndAccrued / c.seedCapital) * 100;

        return {
          ...c,
          totalVolume: newVol,
          totalFeesGenerated: newFees,
          accruedGardenFees: newAccrued,
          score: newScore,
        };
      })
    );

    addLog('Market volume simulated across all active children (+42 trades). Accrued fees updated.', 'info');
  };

  // Harvest specific child revenue
  const handleHarvestChild = (childAddress: string) => {
    const target = children.find((c) => c.address === childAddress);
    if (!target || target.accruedGardenFees === 0) return;

    const harvestedAmount = target.accruedGardenFees;

    setChildren((prev) =>
      prev.map((c) => {
        if (c.address === childAddress) {
          return {
            ...c,
            accruedGardenFees: 0,
            totalRevenueHarvested: c.totalRevenueHarvested + harvestedAmount,
          };
        }
        return c;
      })
    );

    setTreasury((prev) => ({
      ...prev,
      tokenABalance: prev.tokenABalance + harvestedAmount,
      totalLifetimeRevenue: prev.totalLifetimeRevenue + harvestedAmount,
    }));

    addLog(`Harvested ${harvestedAmount.toFixed(1)} gUSD from ${target.name} into Garden Treasury`, 'harvest');
  };

  // Harvest all accrued revenue across all active children
  const handleHarvestAll = () => {
    let totalHarvested = 0;

    setChildren((prev) =>
      prev.map((c) => {
        if (c.accruedGardenFees > 0) {
          totalHarvested += c.accruedGardenFees;
          return {
            ...c,
            accruedGardenFees: 0,
            totalRevenueHarvested: c.totalRevenueHarvested + c.accruedGardenFees,
          };
        }
        return c;
      })
    );

    if (totalHarvested > 0) {
      setTreasury((prev) => ({
        ...prev,
        tokenABalance: prev.tokenABalance + totalHarvested,
        totalLifetimeRevenue: prev.totalLifetimeRevenue + totalHarvested,
      }));

      addLog(`Harvested ${totalHarvested.toFixed(1)} gUSD across all active children into Treasury`, 'harvest');
    }
  };

  // Emergency Pause or Unpause Child
  const handleTogglePause = (childAddress: string) => {
    setChildren((prev) =>
      prev.map((c) => {
        if (c.address === childAddress) {
          const nextStatus = c.status === 'Active' ? 'Paused' : 'Active';
          addLog(`${c.name} state changed: ${c.status} -> ${nextStatus}`, 'info');
          return { ...c, status: nextStatus };
        }
        return c;
      })
    );
  };

  // Sunset Child Protocol & Sweep Liquidity
  const handleSunsetChild = (childAddress: string) => {
    const target = children.find((c) => c.address === childAddress);
    if (!target) return;

    const reclaimedCapital = (target.reserve0 || target.seedCapital * 0.95);

    setChildren((prev) =>
      prev.map((c) => {
        if (c.address === childAddress) {
          return {
            ...c,
            status: 'Sunset',
            accruedGardenFees: 0,
            totalRevenueHarvested: c.totalRevenueHarvested + c.accruedGardenFees,
            reserve0: 0,
            reserve1: 0,
          };
        }
        return c;
      })
    );

    setTreasury((prev) => ({
      ...prev,
      tokenABalance: prev.tokenABalance + reclaimedCapital,
    }));

    addLog(`Sunset ${target.name}. Liquidated reserves and returned ${reclaimedCapital.toFixed(0)} gUSD to Treasury`, 'sunset');
  };

  // Execute Swap on AMM Child
  const handleExecuteSwap = (childAddress: string, amountIn: number, tokenIn: 'token0' | 'token1') => {
    setChildren((prev) =>
      prev.map((c) => {
        if (c.address !== childAddress) return c;

        const isToken0 = tokenIn === 'token0';
        const res0 = c.reserve0 || 10000;
        const res1 = c.reserve1 || 10;

        const resIn = isToken0 ? res0 : res1;
        const resOut = isToken0 ? res1 : res0;

        const feeRateBps = c.swapFeeBps || 30;
        const totalFee = (amountIn * feeRateBps) / 10000;
        const gardenCut = (totalFee * c.gardenFeeShareBps) / 10000;

        const amountInWithLPFee = Math.max(0, amountIn - totalFee);
        const amountOut = (resOut * amountInWithLPFee) / (resIn + amountInWithLPFee);

        let newRes0 = res0;
        let newRes1 = res1;

        if (isToken0) {
          newRes0 = res0 + (amountIn - gardenCut);
          newRes1 = Math.max(1, res1 - amountOut);
        } else {
          newRes1 = res1 + (amountIn - gardenCut);
          newRes0 = Math.max(1, res0 - amountOut);
        }

        const newFees = c.totalFeesGenerated + totalFee;
        const newAccrued = c.accruedGardenFees + gardenCut;
        const newVol = c.totalVolume + amountIn;
        const newScore = ((c.totalRevenueHarvested + newAccrued) / c.seedCapital) * 100;

        return {
          ...c,
          reserve0: newRes0,
          reserve1: newRes1,
          totalFeesGenerated: newFees,
          accruedGardenFees: newAccrued,
          totalVolume: newVol,
          score: newScore,
        };
      })
    );

    addLog(`Swap executed on ${childAddress.slice(0, 8)}: Incurred fee routed to Garden accumulator`, 'info');
  };

  // Deploy New Child Instance
  const handleDeployChild = (
    type: ProtocolType,
    name: string,
    swapFeeBps: number,
    gardenFeeShareBps: number,
    seedCapital: number
  ) => {
    const randomHex = Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const newAddress = `0x${randomHex}`;

    const newChild: ChildProtocol = {
      address: newAddress,
      name,
      type,
      generation: currentEpoch,
      deployedAt: Date.now(),
      seedCapital,
      seedToken: 'gUSD',
      swapFeeBps: type === 'SIMPLE_AMM' ? swapFeeBps : undefined,
      depositFeeBps: type === 'YIELD_VAULT' ? swapFeeBps : undefined,
      gardenFeeShareBps,
      totalVolume: 0,
      totalFeesGenerated: 0,
      accruedGardenFees: 0,
      totalRevenueHarvested: 0,
      reserve0: type === 'SIMPLE_AMM' ? seedCapital : undefined,
      reserve1: type === 'SIMPLE_AMM' ? seedCapital / 1000 : undefined,
      token0Symbol: 'gUSD',
      token1Symbol: 'gETH',
      status: 'Active',
      score: 0,
    };

    setChildren((prev) => [newChild, ...prev]);
    setTreasury((prev) => ({
      ...prev,
      tokenABalance: prev.tokenABalance - seedCapital,
      totalCapitalReinvested: prev.totalCapitalReinvested + seedCapital,
    }));

    addLog(`Deployed ${name} (${newAddress.slice(0, 10)}...) with ${seedCapital.toLocaleString()} gUSD seed capital`, 'deploy');
  };

  // Autonomous Evolutionary Epoch Evaluation
  const handleEvaluateEpoch = () => {
    // 1. Harvest all accrued revenue first
    let harvestedEpoch = 0;
    const harvestedChildren = children.map((c) => {
      if (c.accruedGardenFees > 0) {
        harvestedEpoch += c.accruedGardenFees;
        return {
          ...c,
          totalRevenueHarvested: c.totalRevenueHarvested + c.accruedGardenFees,
          accruedGardenFees: 0,
        };
      }
      return c;
    });

    // 2. Identify underperformers for sunsetting (Score < minRoiThresholdBps / 100)
    const thresholdPct = minRoiThresholdBps / 100;
    let sunsetCount = 0;
    let reclaimedCapitalTotal = 0;

    const evaluatedChildren = harvestedChildren.map((c) => {
      if (c.status === 'Active' && c.score < thresholdPct && c.generation < currentEpoch) {
        sunsetCount++;
        reclaimedCapitalTotal += (c.reserve0 || c.seedCapital * 0.9);
        return {
          ...c,
          status: 'Sunset' as const,
          reserve0: 0,
          reserve1: 0,
        };
      }
      return c;
    });

    // 3. Find top performer AMM to mutate
    const activeAMMs = evaluatedChildren.filter((c) => c.status === 'Active' && c.type === 'SIMPLE_AMM');
    let bestFeeBps = 45;
    let bestGardenCut = 2500;

    if (activeAMMs.length > 0) {
      const top = [...activeAMMs].sort((a, b) => b.score - a.score)[0];
      bestFeeBps = top.swapFeeBps || 45;
      bestGardenCut = top.gardenFeeShareBps || 2500;
    }

    // 4. Genetic mutation for Generation N+1 offspring
    const spawnCount = 2;
    const offspring: ChildProtocol[] = [];
    const seedPerChild = 15000;

    for (let i = 0; i < spawnCount; i++) {
      // Perturb fee by mutationVariance
      const deltaPercent = (Math.random() * (mutationVariance * 2) - mutationVariance) / 100;
      let mutatedFee = Math.round(bestFeeBps * (1 + deltaPercent));
      if (mutatedFee < 5) mutatedFee = 5;
      if (mutatedFee > 200) mutatedFee = 200;

      const randomHex = Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const addr = `0x${randomHex}`;

      offspring.push({
        address: addr,
        name: `Gen ${currentEpoch + 1} Evolved AMM #${i + 1}`,
        type: 'SIMPLE_AMM',
        generation: currentEpoch + 1,
        deployedAt: Date.now(),
        seedCapital: seedPerChild,
        seedToken: 'gUSD',
        swapFeeBps: mutatedFee,
        gardenFeeShareBps: bestGardenCut,
        totalVolume: 0,
        totalFeesGenerated: 0,
        accruedGardenFees: 0,
        totalRevenueHarvested: 0,
        reserve0: seedPerChild,
        reserve1: seedPerChild / 1000,
        token0Symbol: 'gUSD',
        token1Symbol: 'gETH',
        status: 'Active',
        score: 0,
      });
    }

    const updatedChildrenList = [...offspring, ...evaluatedChildren];
    const totalAllocatedSeed = spawnCount * seedPerChild;

    setTreasury((prev) => ({
      ...prev,
      tokenABalance: prev.tokenABalance + harvestedEpoch + reclaimedCapitalTotal - totalAllocatedSeed,
      totalLifetimeRevenue: prev.totalLifetimeRevenue + harvestedEpoch,
      totalCapitalReinvested: prev.totalCapitalReinvested + totalAllocatedSeed,
    }));

    setChildren(updatedChildrenList);

    // Record epoch history
    const avgRoi =
      evaluatedChildren.length > 0
        ? evaluatedChildren.reduce((s, c) => s + c.score, 0) / evaluatedChildren.length
        : 4.5;

    const newEpochRecord: EpochRecord = {
      epochNumber: currentEpoch,
      timestamp: Date.now(),
      activeChildrenCount: evaluatedChildren.filter((c) => c.status === 'Active').length + spawnCount,
      totalHarvested: harvestedEpoch,
      sunsetCount,
      spawnedCount: spawnCount,
      bestPerformingFeeBps: bestFeeBps,
      avgRoiBps: avgRoi,
    };

    setEpochs((prev) => [...prev, newEpochRecord]);
    setCurrentEpoch((prev) => prev + 1);

    addLog(
      `Epoch ${currentEpoch} executed: Sunset ${sunsetCount} underperformers (+${reclaimedCapitalTotal.toFixed(0)} gUSD). Spawned ${spawnCount} Gen ${currentEpoch + 1} children.`,
      'epoch'
    );
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        epochNumber={currentEpoch}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'overview' && (
          <GardenOverview
            treasury={treasury}
            children={children}
            currentEpoch={currentEpoch}
            epochs={epochs}
            onSimulateActivity={handleSimulateActivity}
            onHarvestAll={handleHarvestAll}
            onEvaluateEpoch={handleEvaluateEpoch}
            onOpenDeployModal={() => setIsDeployModalOpen(true)}
            logs={logs}
          />
        )}

        {activeTab === 'children' && (
          <ChildProtocolGrid
            children={children}
            onHarvestChild={handleHarvestChild}
            onTogglePause={handleTogglePause}
            onSunsetChild={handleSunsetChild}
            onOpenSwapModal={(c) => setSwapModalChild(c)}
            onOpenDeployModal={() => setIsDeployModalOpen(true)}
          />
        )}

        {activeTab === 'evolution' && (
          <EvolutionCyclePanel
            currentEpoch={currentEpoch}
            epochs={epochs}
            children={children}
            onTriggerEpoch={handleEvaluateEpoch}
            minRoiThresholdBps={minRoiThresholdBps}
            setMinRoiThresholdBps={setMinRoiThresholdBps}
            mutationVariance={mutationVariance}
            setMutationVariance={setMutationVariance}
            reinvestmentRatioBps={reinvestmentRatioBps}
            setReinvestmentRatioBps={setReinvestmentRatioBps}
          />
        )}

        {activeTab === 'contracts' && <ContractExplorer />}

        {activeTab === 'tests' && <FoundryTestConsole />}

        {activeTab === 'architecture' && <ArchitectureGuide />}
      </main>

      {/* Modals */}
      {swapModalChild && (
        <SwapSimulatorModal
          child={swapModalChild}
          onClose={() => setSwapModalChild(null)}
          onExecuteSwap={handleExecuteSwap}
        />
      )}

      {isDeployModalOpen && (
        <DeployChildModal
          onClose={() => setIsDeployModalOpen(false)}
          onDeploy={handleDeployChild}
          maxTreasuryAvailable={treasury.tokenABalance}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-4 mt-auto text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Autonomous Protocol Garden</span>
          <span>·</span>
          <span>Solidity ^0.8.24</span>
          <span>·</span>
          <span>Foundry Suite</span>
        </div>
        <div>Non-bypassable revenue share & on-chain genetic parameter evolution</div>
      </footer>
    </div>
  );
}
