export type ChildStatus = 'Active' | 'Paused' | 'Sunset';

export type ProtocolType = 'SIMPLE_AMM' | 'YIELD_VAULT';

export interface ChildProtocol {
  address: string;
  name: string;
  type: ProtocolType;
  generation: number;
  deployedAt: number; // timestamp
  seedCapital: number; // in ETH or Tokens
  seedToken: string;
  swapFeeBps?: number; // e.g. 30 = 0.30%
  gardenFeeShareBps: number; // e.g. 2000 = 20%
  depositFeeBps?: number;
  perfFeeBps?: number;
  totalVolume: number;
  totalFeesGenerated: number;
  accruedGardenFees: number;
  totalRevenueHarvested: number;
  reserve0?: number;
  reserve1?: number;
  token0Symbol?: string;
  token1Symbol?: string;
  status: ChildStatus;
  score: number; // ROI / performance score
}

export interface EpochRecord {
  epochNumber: number;
  timestamp: number;
  activeChildrenCount: number;
  totalHarvested: number;
  sunsetCount: number;
  spawnedCount: number;
  bestPerformingFeeBps: number;
  avgRoiBps: number;
}

export interface TreasuryState {
  ethBalance: number;
  tokenABalance: number; // gUSD
  tokenBBalance: number; // gETH
  totalLifetimeRevenue: number;
  totalCapitalReinvested: number;
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  gasUsed: number;
  status: 'passed' | 'failed' | 'pending';
  logs: string[];
}
