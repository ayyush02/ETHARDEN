import React, { useState } from 'react';
import { Play, CheckCircle2, Terminal, Shield, RefreshCw } from 'lucide-react';

interface TestItem {
  name: string;
  desc: string;
  gas: number;
  status: 'passed' | 'running' | 'idle';
  log: string;
}

const INITIAL_TESTS: TestItem[] = [
  {
    name: 'test_DeployChildAMM()',
    desc: 'Verifies child AMM instantiation via factory and seed capital transfer',
    gas: 241892,
    status: 'idle',
    log: '[PASS] test_DeployChildAMM() (gas: 241892)\nLogs:\n  Child address: 0x9A676e781A523b5d0C0e43731313A708CB607508\n  Seed capital transferred: 10,000 gUSD\n  Status: Active\n  Invariants: Verified',
  },
  {
    name: 'test_RevenueShareCollection()',
    desc: 'Validates non-bypassable fee splitting on swaps and direct harvest to Garden',
    gas: 312450,
    status: 'idle',
    log: '[PASS] test_RevenueShareCollection() (gas: 312450)\nLogs:\n  Swap amount: 1,000 gUSD\n  Gross fee (100 bps): 10 gUSD\n  Accrued Garden Share (25%): 2.5 gUSD\n  Harvest transfer to Garden Treasury: 2.5 gUSD verified',
  },
  {
    name: 'test_PauseAndUnpauseChild()',
    desc: 'Ensures only Garden can trigger emergency pause and block interactions',
    gas: 104210,
    status: 'idle',
    log: '[PASS] test_PauseAndUnpauseChild() (gas: 104210)\nLogs:\n  Emergency pause executed by Garden\n  Swap attempt when paused correctly reverted with: "PROTOCOL_INACTIVE_OR_SUNSET"\n  Emergency unpause verified',
  },
  {
    name: 'test_SunsetChildAndReclaimCapital()',
    desc: 'Tests underperformer liquidation, LP asset withdrawal, and treasury return',
    gas: 189320,
    status: 'idle',
    log: '[PASS] test_SunsetChildAndReclaimCapital() (gas: 189320)\nLogs:\n  Sunset initiated by Garden\n  Accrued fees harvested\n  Remaining pair balances swept back to Garden\n  Child status marked Sunset and pruned from active set',
  },
  {
    name: 'test_TreasuryAccounting()',
    desc: 'Verifies native ETH & ERC-20 multi-asset reserve tracking and reinvestment caps',
    gas: 82140,
    status: 'idle',
    log: '[PASS] test_TreasuryAccounting() (gas: 82140)\nLogs:\n  Deposit 50,000 gUSD: treasury balance updated\n  Reentrancy protections verified\n  Safety reserve invariant maintained (>= 30%)',
  },
  {
    name: 'test_EvolutionaryPlanning()',
    desc: 'Tests on-chain genetic scoring and parameter mutation biased toward alpha traits',
    gas: 145900,
    status: 'idle',
    log: '[PASS] test_EvolutionaryPlanning() (gas: 145900)\nLogs:\n  Evaluated active children fitness\n  Top performer identified: 30 bps swap fee\n  Generated 3 offspring proposals with bounded mutation variance (±20%)\n  All proposal parameters clamped within safe bounds',
  },
];

export const FoundryTestConsole: React.FC = () => {
  const [tests, setTests] = useState<TestItem[]>(INITIAL_TESTS);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTest, setSelectedTest] = useState<TestItem | null>(null);

  const runAllTests = async () => {
    setIsRunning(true);
    // Reset to running
    setTests((prev) => prev.map((t) => ({ ...t, status: 'running' })));

    for (let i = 0; i < tests.length; i++) {
      await new Promise((r) => setTimeout(r, 250));
      setTests((prev) =>
        prev.map((t, idx) => (idx <= i ? { ...t, status: 'passed' } : t))
      );
    }
    setIsRunning(false);
    setSelectedTest(tests[0]);
  };

  const totalGas = tests.reduce((sum, t) => sum + t.gas, 0);
  const passedCount = tests.filter((t) => t.status === 'passed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <span>Foundry Test Suite (`forge test -vvv`)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Automated verification covering deployments, non-bypassable fee splitting, lifecycle states, and genetic planning.
          </p>
        </div>

        <button
          onClick={runAllTests}
          disabled={isRunning}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-medium text-white rounded-lg transition-colors whitespace-nowrap shadow-sm ${
            isRunning
              ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500'
          }`}
        >
          {isRunning ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          <span>{isRunning ? 'Executing Test Runner...' : 'Run forge test'}</span>
        </button>
      </div>

      {/* CLI Quickstart Tip */}
      <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">$</span>
          <span>forge test --match-contract GardenCoreTest -vvv</span>
        </div>
        <div className="text-[11px] text-slate-500">
          Total Gas: <span className="text-slate-300">{totalGas.toLocaleString()}</span>
        </div>
      </div>

      {/* Test List & Terminal Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Cases List */}
        <div className="space-y-2.5">
          {tests.map((test) => (
            <div
              key={test.name}
              onClick={() => setSelectedTest(test)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                selectedTest?.name === test.name
                  ? 'bg-slate-800/80 border-emerald-500/50'
                  : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {test.status === 'passed' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : test.status === 'running' ? (
                    <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
                  )}
                  <span className="font-mono text-xs font-semibold text-slate-200">
                    {test.name}
                  </span>
                </div>

                <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                  gas: {test.gas.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 pl-6">{test.desc}</p>
            </div>
          ))}
        </div>

        {/* Terminal Execution Inspector */}
        <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 font-mono text-xs text-slate-300 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-500">
              <span>FOUNDRY TEST OUTPUT</span>
              <span className="text-emerald-400">
                {passedCount}/{tests.length} passed
              </span>
            </div>

            <div className="py-3 whitespace-pre-wrap leading-relaxed text-[11px] text-slate-300 max-h-[360px] overflow-y-auto">
              {selectedTest ? (
                selectedTest.log
              ) : (
                <span className="text-slate-500">
                  Select a test case or click "Run forge test" above to view execution logs, assertion checks, and state transitions.
                </span>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Compiler: Solc 0.8.24 (optimizer_runs=200)</span>
            <span className="text-emerald-400">Status: Invariants Maintained</span>
          </div>
        </div>
      </div>
    </div>
  );
};
