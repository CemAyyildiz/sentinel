export interface Strategy {
  id: string;
  name: string;
  prompt: string;
  trigger_type: 'price' | 'time' | 'apr' | 'ai_signal';
  trigger_params: TriggerParams;
  action_type: 'swap' | 'add_liquidity' | 'remove_liquidity' | 'alert';
  action_params: ActionParams;
  status: 'active' | 'paused' | 'executed' | 'failed';
  keeper_task_id: string | null;
  wallet_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface TriggerParams {
  token: string;
  direction: 'above' | 'below' | 'equals';
  value: number;
}

export interface ActionParams {
  tokenIn: string;
  tokenOut: string;
  amount: string;
}

export interface StrategyStep {
  type: 'swap' | 'deposit' | 'withdraw';
  tokenIn?: string;
  tokenOut?: string;
  amount?: string;
  asset?: string;
  protocol?: string;
}

export interface ParsedStrategy {
  id: string;
  name: string;
  trigger: {
    type: string;
    token: string;
    direction: string;
    value: number;
  };
  action: {
    type: string;
    tokenIn: string;
    tokenOut: string;
    amount: string;
  };
  steps?: StrategyStep[];
  estimatedRoute?: QuoteResult;
  confidence: number;
}

export interface Transaction {
  id: string;
  strategy_id: string;
  tx_hash: string | null;
  status: 'pending' | 'success' | 'failed';
  action_type: string;
  action_details: string;
  gas_used: string | null;
  created_at: string;
}

export interface QuoteResult {
  quote: string;
  gasEstimate: string;
  priceImpact: string;
  route: string[];
}

export interface PoolData {
  address: string;
  token0: string;
  token1: string;
  fee: number;
  tvl: string;
  apr: string;
  volume24h: string;
}

export interface TokenInfo {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
}

export const TOKENS: Record<string, TokenInfo> = {
  ETH: {
    symbol: 'ETH',
    name: 'Ether',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18
  },
  WETH: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    decimals: 18
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    decimals: 6
  },
  DAI: {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    address: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357',
    decimals: 18
  }
};

export const UNISWAP_CONTRACTS = {
  SWAP_ROUTER_02: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E',
  QUOTER_V2: '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3',
  FACTORY: '0x0227628f3F023bb0B980b67D528571c95c6DaC1c'
};