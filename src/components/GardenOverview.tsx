import React from 'react';
import { Play, Coins, RefreshCw, PlusCircle, ArrowUpRight, ShieldCheck, Cpu } from 'lucide-react';
import { TreasuryState, ChildProtocol, EpochRecord } from '../types/garden';
import { TreasuryAssetDistribution } from './TreasuryAssetDistribution';
import { CumulativeRevenueChart } from './CumulativeRevenueChart';

interface GardenOverviewProps {
  treasury: TreasuryState;
  children: ChildProtocol[];
  currentEpoch: number;
  epochs: EpochRecord[];
  onSimulateActivity: () => void;
  onHarvestAll: () => void;
  onEvaluateEpoch: () => void;
  onOpenDeployModal: () => void;
  logs: { id: string; time: string; text: string; type: 'harvest' | 'deploy' | 'sunset' | 'epoch' | 'info' }[];
}

export const GardenOverview: React.FC<GardenOverviewProps> = ({
  treasury,
  children,
  currentEpoch,
  epochs,
  onSimulateActivity,
  onHarvestAll,
  onEvaluateEpoch,
  onOpenDeployModal,
  logs,
}) => {
  const activeChildren = children.filter((c) => c.status === 'Active');
  const sunsetChildren = children.filter((c) => c.status === 'Sunset');
  const pausedChildren = children.filter((c) => c.status === 'Paused');

  const totalAccruedFees = children.reduce((sum, c) => sum + c.accruedGardenFees, 0);
  const totalVolumeAll = children.reduce((sum, c) => sum + c.totalVolume, 0);

  return (
    <div className="space-y-6">
      {/* Hero Meta-Protocol Banner */}
      <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-emerald-400 font-medium">Solidity ^0.8.24</span>
              <span>·</span>
              <span>Foundry Architecture</span>
              <span>·</span>
              <span>Autonomous Closed Loop</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Self-Sustaining Protocol Evolution
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              The Garden holds the central treasury, deploys parameterized DeFi children (AMMs & Vaults), collects non-bypassable fee shares, culls bottom performers, and mutates future parameters toward higher fee yields.
            </p>
          </div>

          <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
            <button
              onClick={onSimulateActivity}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 rounded-lg transition-colors whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              <span>Simulate Market Volume</span>
            </button>
            <button
              onClick={onHarvestAll}
              disabled={totalAccruedFees === 0}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap border ${
                totalAccruedFees > 0
                  ? 'text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/70 border-emerald-500/40'
                  : 'text-slate-500 bg-slate-900/40 border-slate-800 cursor-not-allowed'
              }`}
            >
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              <span>Harvest Accrued Fees ({totalAccruedFees.toLocaleString(undefined, { maximumFractionDigits: 1 })} gUSD)</span>
            </button>
            <button
              onClick={onEvaluateEpoch}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Evaluate Epoch {currentEpoch} & Evolve</span>
            </button>
          </div>
        </div>
      </div>

      {/* Treasury Breakdown & Asset Distribution Pie Chart (Recharts) */}
      <TreasuryAssetDistribution treasury={treasury} />

      {/* Primary KPI Grid (Tabular Numerals, 1-Level Depth) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
          <div className="text-xs text-slate-400 font-medium">Treasury Token Reserve</div>
          <div className="text-xl font-bold text-white font-mono tabular-nums mt-1.5">
            {treasury.tokenABalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs text-slate-400 font-normal">gUSD</span>
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-mono tabular-nums">
            <span>+{totalAccruedFees.toFixed(1)} gUSD unharvested</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
          <div className="text-xs text-slate-400 font-medium">ETH Treasury Reserve</div>
          <div className="text-xl font-bold text-white font-mono tabular-nums mt-1.5">
            {treasury.ethBalance.toFixed(2)} <span className="text-xs text-slate-400 font-normal">ETH</span>
          </div>
          <div className="text-xs text-emerald-400 mt-1 flex items-center gap-0.5">
            <ShieldCheck className="w-3 h-3" />
            <span>30% minimum safety reserve</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
          <div className="text-xs text-slate-400 font-medium">Total Lifetime Revenue</div>
          <div className="text-xl font-bold text-emerald-400 font-mono tabular-nums mt-1.5">
            {treasury.totalLifetimeRevenue.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-xs text-slate-400 font-normal">gUSD</span>
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
            Processed Vol: ${totalVolumeAll.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
          <div className="text-xs text-slate-400 font-medium">Active Children / Generations</div>
          <div className="text-xl font-bold text-white font-mono tabular-nums mt-1.5">
            {activeChildren.length} <span className="text-xs text-slate-400 font-normal">Active · {sunsetChildren.length} Sunset</span>
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <Cpu className="w-3 h-3 text-indigo-400" />
            <span>Generation {currentEpoch} Strategy</span>
          </div>
        </div>
      </div>

      {/* Cumulative Revenue Trajectory AreaChart (Recharts) */}
      <CumulativeRevenueChart epochs={epochs} />

      {/* Split Section: Active Protocols Snapshot & Live Event Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Top Active Child Protocols */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-sm font-semibold text-white">Active Child Protocols</h2>
              <p className="text-xs text-slate-400">Deployed instances generating fees and streaming revenue back to Garden</p>
            </div>
            <button
              onClick={onOpenDeployModal}
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Deploy New Child</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-medium text-[11px]">
                  <th className="pb-2.5">Protocol / Address</th>
                  <th className="pb-2.5">Type & Fee Tier</th>
                  <th className="pb-2.5 text-right">Seed Capital</th>
                  <th className="pb-2.5 text-right">Volume</th>
                  <th className="pb-2.5 text-right">Garden Fees</th>
                  <th className="pb-2.5 text-right">Score / ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {activeChildren.slice(0, 5).map((child) => (
                  <tr key={child.address} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 font-medium text-slate-200">
                      <div>{child.name}</div>
                      <div className="text-[11px] font-mono text-slate-500 truncate max-w-[140px]">
                        {child.address}
                      </div>
                    </td>
                    <td className="py-2.5 text-slate-300">
                      <div className="font-mono">
                        {child.type === 'SIMPLE_AMM'
                          ? `${((child.swapFeeBps || 30) / 100).toFixed(2)}% AMM`
                          : `${((child.depositFeeBps || 25) / 100).toFixed(2)}% Vault`}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {((child.gardenFeeShareBps) / 100).toFixed(0)}% Garden Cut
                      </div>
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-300">
                      {child.seedCapital.toLocaleString()} {child.seedToken}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-300">
                      {child.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-emerald-400 font-medium">
                      {(child.totalRevenueHarvested + child.accruedGardenFees).toFixed(1)}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums">
                      <span className={child.score >= 100 ? 'text-emerald-400' : 'text-amber-400'}>
                        {child.score.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Live Event Ledger & Invariants */}
        <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-4">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-white">Event Log & State Machine</h2>
            <p className="text-xs text-slate-400">On-chain emissions and autonomous lifecycle actions</p>
          </div>

          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {logs.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 text-xs font-mono space-y-1"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="uppercase text-slate-400">{log.type}</span>
                  <span>{log.time}</span>
                </div>
                <div className="text-slate-300 text-[11px] leading-snug">{log.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
