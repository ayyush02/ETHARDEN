import React from 'react';
import { Shield, GitBranch, ArrowDown, Lock, Cpu, Sparkles } from 'lucide-react';

export const ArchitectureGuide: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">System Architecture & Design Specification</h2>
        <p className="text-xs text-slate-400 mt-1">
          Engineering breakdown of the Autonomous Protocol Garden meta-protocol, revenue share invariants, and genetic adaptation.
        </p>
      </div>

      {/* 5-Phase Lifecycle Visual Diagram */}
      <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-6">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span>The Autonomous Closed-Loop Lifecycle</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="text-[11px] font-mono text-emerald-400 font-semibold">01. Treasury Seeding</div>
            <div className="text-slate-200 font-medium">Capital Allocation</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              GardenCore holds ETH and ERC-20s. Dispatches seed capital to deploy newly parameterized children via registered factories.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="text-[11px] font-mono text-emerald-400 font-semibold">02. Execution</div>
            <div className="text-slate-200 font-medium">Child DeFi Activity</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Children process real swaps or vault deposits. Every transaction incurs protocol fees based on their evolved parameter traits.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="text-[11px] font-mono text-emerald-400 font-semibold">03. Non-Bypassable Fee</div>
            <div className="text-slate-200 font-medium">Revenue Splitter</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Inherited <code className="text-emerald-400 font-mono">BaseGardenChild</code> reserves Garden fee cut directly. Child cannot divert or suppress funds.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="text-[11px] font-mono text-emerald-400 font-semibold">04. Epoch Scoring</div>
            <div className="text-slate-200 font-medium">Fitness Evaluation</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Every epoch interval, <code className="text-emerald-400 font-mono">EvolutionaryStrategy</code> ranks children by fee yield velocity and ROI.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="text-[11px] font-mono text-emerald-400 font-semibold">05. Culling & Mutation</div>
            <div className="text-slate-200 font-medium">Offspring Genesis</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Underperformers are sunsetted & liquidated. Next generation offspring mutate parameters biased toward top alpha performers.
            </p>
          </div>
        </div>
      </div>

      {/* Revenue Share Enforcement Security Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Non-Bypassable Revenue Enforcement</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Child protocols are not trusted third parties. Instead of trusting child contracts to willingly transfer fees, enforcement is built into the architecture:
          </p>
          <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4 leading-relaxed">
            <li>
              <strong className="text-slate-200">Mandatory Inheritance:</strong> Every child must inherit <code className="font-mono text-slate-300">BaseGardenChild</code> with an immutable <code className="font-mono text-slate-300">garden</code> address set in the constructor.
            </li>
            <li>
              <strong className="text-slate-200">Internal Accounting Hook:</strong> All user fees must route through <code className="font-mono text-slate-300">_recordAndSplitFee()</code>, which locks the Garden share into an isolated accumulator.
            </li>
            <li>
              <strong className="text-slate-200">Permissionless Harvest:</strong> The Garden can pull accrued fees at any time via <code className="font-mono text-slate-300">harvestRevenue()</code>.
            </li>
            <li>
              <strong className="text-slate-200">Forced Sunsetting:</strong> Only the Garden can call <code className="font-mono text-slate-300">sunset()</code>, which sweeps all remaining child token balances back into the Treasury reserve.
            </li>
          </ul>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Security & Governance Architecture</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Production-oriented smart contract security primitives:
          </p>
          <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4 leading-relaxed">
            <li>
              <strong className="text-slate-200">Two-Step Ownership Transfer:</strong> Avoids catastrophic lost keys. Handoff to a DAO Timelock or Multisig requires explicit acceptance.
            </li>
            <li>
              <strong className="text-slate-200">Separation of Concerns:</strong> Treasury and registry logic resides in <code className="font-mono text-slate-300">GardenCore</code>, child deployment in <code className="font-mono text-slate-300">ChildFactory</code>, and genetic math in <code className="font-mono text-slate-300">EvolutionaryStrategy</code>.
            </li>
            <li>
              <strong className="text-slate-200">Emergency Isolation:</strong> If a child protocol exhibits toxic slippage or an exploit, GardenCore can invoke <code className="font-mono text-slate-300">emergencyPause()</code> instantly.
            </li>
            <li>
              <strong className="text-slate-200">Reentrancy Protection:</strong> State mutations occur before token transfers throughout.
            </li>
          </ul>
        </div>
      </div>

      {/* Adding a New Protocol Type Guide */}
      <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-4">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">How to Add a New Child Protocol Type</h3>
        </div>

        <div className="space-y-3 text-xs text-slate-300">
          <p>
            To introduce a novel DeFi mechanism (e.g., an orderbook hook, dynamic lending pool, or dynamic fee AMM):
          </p>

          <ol className="space-y-2 list-decimal pl-5 text-slate-400">
            <li>
              <strong className="text-slate-200">Inherit <code className="font-mono text-emerald-400">BaseGardenChild</code>:</strong>
              <div className="bg-slate-950 p-3 rounded-lg font-mono text-[11px] text-slate-300 my-1 overflow-x-auto">
{`contract MyCustomChild is BaseGardenChild {
    constructor(address _garden, uint16 _feeShareBps) 
        BaseGardenChild(_garden, keccak256("CUSTOM_TYPE"), _feeShareBps) {}
        
    function userAction(address token, uint256 grossAmount) external {
        uint256 fee = (grossAmount * feeTierBps) / 10000;
        _recordAndSplitFee(token, fee);
    }
}`}
              </div>
            </li>
            <li>
              <strong className="text-slate-200">Add branch in <code className="font-mono text-emerald-400">ChildFactory.sol</code>:</strong> Decode custom initialization parameters and call <code className="font-mono">new MyCustomChild(...)</code>.
            </li>
            <li>
              <strong className="text-slate-200">Register in <code className="font-mono text-emerald-400">GardenCore</code>:</strong> Call <code className="font-mono">registerFactory(keccak256("CUSTOM_TYPE"), factoryAddress)</code>.
            </li>
            <li>
              <strong className="text-slate-200">Add Parameter Genes to Strategy:</strong> Add mutation and bounded clamp rules in <code className="font-mono text-emerald-400">EvolutionaryStrategy.sol</code>.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};
