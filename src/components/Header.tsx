import React from 'react';
import { Download, Terminal } from 'lucide-react';
import { downloadFoundryProjectZip } from '../utils/exportZip';

interface HeaderProps {
  activeTab: 'overview' | 'children' | 'evolution' | 'contracts' | 'tests' | 'architecture';
  setActiveTab: (tab: 'overview' | 'children' | 'evolution' | 'contracts' | 'tests' | 'architecture') => void;
  epochNumber: number;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, epochNumber }) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0b0f17]/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
            🌱
          </div>
          <span className="text-base font-semibold tracking-tight text-white whitespace-nowrap">
            Autonomous Protocol Garden
          </span>
          <span className="hidden sm:inline text-xs text-slate-500 font-mono">
            Epoch {epochNumber}
          </span>
        </div>

        {/* Zone 2: 4-5 clean single-line nav tabs */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-800/60">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'overview'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Garden Core
          </button>
          <button
            onClick={() => setActiveTab('children')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'children'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Child Protocols
          </button>
          <button
            onClick={() => setActiveTab('evolution')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'evolution'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Evolution Engine
          </button>
          <button
            onClick={() => setActiveTab('contracts')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'contracts'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Contracts & NatSpec
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'tests'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Foundry Tests
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'architecture'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Architecture
          </button>
        </nav>

        {/* Zone 3: 1 primary action button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => downloadFoundryProjectZip()}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Foundry Suite</span>
          </button>
        </div>
      </div>

      {/* Mobile nav fallback */}
      <div className="flex lg:hidden overflow-x-auto gap-1 mt-2.5 pt-2 border-t border-slate-800/60 pb-1 scrollbar-none">
        {(['overview', 'children', 'evolution', 'contracts', 'tests', 'architecture'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
              activeTab === tab
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
    </header>
  );
};
