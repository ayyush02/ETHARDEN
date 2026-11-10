import React from 'react';
import { Dna, RefreshCw, TrendingUp, Sliders, CheckCircle2, AlertCircle } from 'lucide-react';
import { EpochRecord, ChildProtocol } from '../types/garden';

interface EvolutionCyclePanelProps {
  currentEpoch: number;
  epochs: EpochRecord[];
  children: ChildProtocol[];
  onTriggerEpoch: () => void;
  minRoiThresholdBps: number;
  setMinRoiThresholdBps: (val: number) => void;
  mutationVariance: number;
  setMutationVariance: (val: number) => void;
  reinvestmentRatioBps: number;
  setReinvestmentRatioBps: (val: number) => void;
}

export const EvolutionCyclePanel: React.FC<EvolutionCyclePanelProps> = ({
  currentEpoch,
  epochs,
  children,
  onTriggerEpoch,
  minRoiThresholdBps,
  setMinRoiThresholdBps,
  mutationVariance,
  setMutationVariance,
  reinvestmentRatioBps,
  setReinvestmentRatioBps,
}) => {
  const activeChildren = children.filter((c) => c.status === 'Active');
  const sortedByScore = [...activeChildren].sort((a, b) => b.score - a.score);
  const topPerformer = sortedByScore[0];

  return (
    <div className="space-y-6">
      {/* Header & Strategy Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Dna className="w-5 h-5 text-indigo-400" />
            <span>On-Chain Genetic Evolution Engine</span>
          </h2>
          <p className="text-xs text-slate-400">
            Automated selection, sunsetting of underperforming variants, and bounded parameter mutation toward maximum fee yield.
          </p>
        </div>

        <button
          onClick={onTriggerEpoch}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Execute Epoch {currentEpoch} Evolution Cycle</span>
        </button>
      </div>

      {/* Top Performer Trait Spotlight & Mutation Drift */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">Current Alpha Performer</span>
            <span className="text-[11px] text-emerald-400 font-mono">Generation {topPerformer?.generation || 0}</span>
          </div>

          {topPerformer ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-200">{topPerformer.name}</div>
              <div className="text-xs text-slate-400 font-mono">
                Swap Fee: <span className="text-white font-semibold">{((topPerformer.swapFeeBps || 30) / 100).toFixed(2)}%</span>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Garden Revenue Share: <span className="text-emerald-400 font-semibold">{((topPerformer.gardenFeeShareBps || 2000) / 100).toFixed(0)}%</span>
              </div>
              <div className="text-xs text-slate-400 font-mono tabular-nums">
                Fitness ROI Score: <span className="text-emerald-400 font-semibold">{topPerformer.score.toFixed(1)}%</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">No active children currently registered.</p>
          )}
        </div>

        {/* Generational Trait Convergence Visualization */}
        <div className="md:col-span-2 p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">Parameter Convergence Over Generations</span>
            <span className="text-[11px] text-slate-400 font-mono">Dominant Fee Tier (bps)</span>
          </div>

          <div className="h-32 flex items-end gap-3 pt-4 border-b border-slate-800">
            {epochs.map((ep) => {
              // Normalized height based on best performing fee bps (max ~100 bps)
              const heightPct = Math.min(100, Math.max(15, (ep.bestPerformingFeeBps / 100) * 100));
              return (
                <div key={ep.epochNumber} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div className="text-[11px] font-mono text-emerald-400 font-semibold">
                    {ep.bestPerformingFeeBps} bps
                  </div>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full bg-gradient-to-t from-indigo-900/80 to-indigo-500 rounded-t transition-all"
                  />
                  <div className="text-[11px] font-mono text-slate-400">
                    Gen {ep.epochNumber}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>Exploration Phase (Generations 1-2)</span>
            <span>Exploitation & Optimization Phase (Generations 3+)</span>
          </div>
        </div>
      </div>

      {/* Strategy Engine Parameters (DAO Configurable) */}
      <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Evolutionary Strategy Hyperparameters</h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Callable by DAO Governance</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-medium">Min ROI Sunset Threshold</span>
              <span className="font-mono text-emerald-400 font-semibold">{(minRoiThresholdBps / 100).toFixed(2)}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              value={minRoiThresholdBps}
              onChange={(e) => setMinRoiThresholdBps(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Children returning less than this percentage over their grace period are sunset and liquidated.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-medium">Genetic Mutation Variance</span>
              <span className="font-mono text-indigo-400 font-semibold">±{mutationVariance}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="40"
              value={mutationVariance}
              onChange={(e) => setMutationVariance(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Perturbation percentage applied to top performer parameters when synthesizing offspring.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-medium">Treasury Reinvestment Ratio</span>
              <span className="font-mono text-emerald-400 font-semibold">{(reinvestmentRatioBps / 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="3000"
              max="9000"
              step="500"
              value={reinvestmentRatioBps}
              onChange={(e) => setReinvestmentRatioBps(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Portion of available treasury allocated to seed new child experiments; remainder kept as reserve.
            </p>
          </div>
        </div>
      </div>

      {/* Epoch Historical Ledger */}
      <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-3">
        <h3 className="text-sm font-semibold text-white">Generational Epoch History</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-medium text-[11px]">
                <th className="pb-2.5">Epoch #</th>
                <th className="pb-2.5">Timestamp</th>
                <th className="pb-2.5 text-right">Active Children</th>
                <th className="pb-2.5 text-right">Revenue Harvested</th>
                <th className="pb-2.5 text-right">Underperformers Sunset</th>
                <th className="pb-2.5 text-right">Offspring Spawned</th>
                <th className="pb-2.5 text-right">Optimal Fee Tier</th>
                <th className="pb-2.5 text-right">Avg Generation ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {epochs.map((ep) => (
                <tr key={ep.epochNumber} className="hover:bg-slate-800/20">
                  <td className="py-2.5 font-medium text-white">Epoch {ep.epochNumber}</td>
                  <td className="py-2.5 text-slate-400">
                    {new Date(ep.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-2.5 text-right text-slate-300">{ep.activeChildrenCount}</td>
                  <td className="py-2.5 text-right text-emerald-400 font-medium">
                    +{ep.totalHarvested.toFixed(1)} gUSD
                  </td>
                  <td className="py-2.5 text-right text-rose-400">
                    {ep.sunsetCount > 0 ? `-${ep.sunsetCount}` : '0'}
                  </td>
                  <td className="py-2.5 text-right text-indigo-400">+{ep.spawnedCount}</td>
                  <td className="py-2.5 text-right text-slate-200">{ep.bestPerformingFeeBps} bps</td>
                  <td className="py-2.5 text-right text-emerald-400">{ep.avgRoiBps.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
