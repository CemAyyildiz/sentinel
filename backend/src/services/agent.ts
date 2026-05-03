import { getStrategy, getAllStrategies, updateStrategyStatus, createTransaction, updateTransactionStatus } from './database';
import { getETHPrice } from './uniswap';
import { executeRealSwap, checkWalletBalance, getRealQuote } from './realSwap';
import { v4 as uuidv4 } from 'uuid';
import { addActivity } from './agentActivity';
import { ethers, Wallet } from 'ethers';

interface AgentState {
  running: boolean;
  intervalId: NodeJS.Timeout | null;
  lastCheck: Date | null;
  checksPerformed: number;
  strategiesExecuted: number;
  walletAddress: string | null;
}

// Agent'ın kendi cüzdanı (her restart'ta yeni oluşturulur)
let agentWallet: any = null;

function getOrCreateAgentWallet(): any {
  if (agentWallet) return agentWallet;
  
  // Yeni random wallet oluştur
  agentWallet = ethers.Wallet.createRandom();
  console.log(`🤖 Agent wallet created: ${agentWallet.address}`);
  console.log(`🤖 Agent wallet address: ${agentWallet.address}`);
  console.log(`🤖 Send Sepolia ETH to this address for agent to execute swaps`);
  
  return agentWallet;
}

const state: AgentState = {
  running: false,
  intervalId: null,
  lastCheck: null,
  checksPerformed: 0,
  strategiesExecuted: 0,
  walletAddress: null
};

const CHECK_INTERVAL = 30000; // 30 seconds

export function getAgentState() {
  const wallet = getOrCreateAgentWallet();
  return {
    ...state,
    walletAddress: wallet.address,
    activeStrategies: getAllStrategies().filter(s => s.status === 'active').length
  };
}

export function getAgentWalletAddress(): string {
  const wallet = getOrCreateAgentWallet();
  return wallet.address;
}

export function getAgentPrivateKey(): string | null {
  const wallet = getOrCreateAgentWallet();
  return wallet.privateKey || null;
}

export function startAgent() {
  if (state.running) {
    console.log('🤖 Agent already running');
    return;
  }

  console.log('🤖 Starting Sentinel Agent...');
  state.running = true;
  state.lastCheck = new Date();

  // Initial check
  checkStrategies();

  // Set interval for continuous monitoring
  state.intervalId = setInterval(() => {
    checkStrategies();
  }, CHECK_INTERVAL);

  console.log(`🤖 Agent started! Checking every ${CHECK_INTERVAL / 1000} seconds`);
}

export function stopAgent() {
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
  state.running = false;
  console.log('🤖 Agent stopped');
}

async function checkStrategies() {
  state.lastCheck = new Date();
  state.checksPerformed++;

  const strategies = getAllStrategies().filter(s => s.status === 'active');

  if (strategies.length === 0) {
    return;
  }

  console.log(`🤖 [Agent] Checking ${strategies.length} active strategies...`);

  // Get current ETH price
  let currentPrice: number;
  try {
    addActivity('thinking', 'Fetching current ETH price from CoinGecko...');
    currentPrice = await getETHPrice();
    addActivity('analysis', `ETH price: $${currentPrice}`, { price: currentPrice });
  } catch (error) {
    addActivity('error', `Failed to fetch ETH price, using fallback: $2400`, { error: String(error) });
    currentPrice = 2400; // Fallback
  }

  addActivity('monitoring', `Evaluating ${strategies.length} active strategies...`, { count: strategies.length });

  for (const strategy of strategies) {
    try {
      await evaluateStrategy(strategy, currentPrice);
    } catch (error) {
      addActivity('error', `Error evaluating strategy: ${strategy.name}`, { 
        strategyId: strategy.id, 
        error: String(error) 
      });
    }
  }
}

async function evaluateStrategy(strategy: any, currentPrice: number) {
  const trigger = strategy.trigger_params;
  if (!trigger || trigger.type !== 'price') return;

  const targetPrice = trigger.value;
  const direction = trigger.direction;
  const token = trigger.token;

  addActivity('analysis', `Checking "${strategy.name}": ${token} ${direction} $${targetPrice}`, {
    strategyId: strategy.id,
    currentPrice,
    targetPrice,
    direction
  });

  let shouldExecute = false;
  let reason = '';

  if (token === 'ETH') {
    if (direction === 'below' && currentPrice < targetPrice) {
      shouldExecute = true;
      reason = `ETH ($${currentPrice}) dropped below target ($${targetPrice})`;
    } else if (direction === 'above' && currentPrice > targetPrice) {
      shouldExecute = true;
      reason = `ETH ($${currentPrice}) rose above target ($${targetPrice})`;
    } else {
      reason = `Condition not met: ETH at $${currentPrice}, waiting for ${direction} $${targetPrice}`;
    }
  }

  if (shouldExecute) {
    addActivity('decision', `🎯 TRIGGER ACTIVATED! ${reason}`, {
      strategyId: strategy.id,
      strategyName: strategy.name,
      currentPrice,
      targetPrice
    });
    await executeStrategy(strategy);
  } else {
    addActivity('monitoring', reason, { strategyId: strategy.id });
  }
}

async function executeStrategy(strategy: any) {
  const txId = uuidv4();
  const walletAddress = strategy.wallet_address || '0x0000000000000000000000000000000000000000';

  addActivity('action', `⚡ Executing "${strategy.name}"...`, {
    strategyId: strategy.id,
    actionType: strategy.action_type,
    actionParams: strategy.action_params
  });

  try {
    // Create transaction record
    createTransaction({
      id: txId,
      strategy_id: strategy.id,
      status: 'pending',
      action_type: strategy.action_type,
      action_details: strategy.action_params
    });

    let result: { hash: string; gasUsed: string };

    if (strategy.action_type === 'swap') {
      const amount = convertToWei(strategy.action_params.tokenIn, strategy.action_params.amount);
      
      addActivity('analysis', `Getting quote: ${strategy.action_params.amount} ${strategy.action_params.tokenIn} → ${strategy.action_params.tokenOut}`, {
        amount,
        tokenIn: strategy.action_params.tokenIn,
        tokenOut: strategy.action_params.tokenOut
      });

      // Get real quote from Uniswap V3 QuoterV2
      const quote = await getRealQuote(
        strategy.action_params.tokenIn,
        strategy.action_params.tokenOut,
        amount
      );

      addActivity('decision', `Quote received: ${quote.quote}. Executing real swap...`, { quote });

      // Execute real swap via Uniswap V3 SwapRouter using agent's wallet
      const agentW = getOrCreateAgentWallet();
      const swapResult = await executeRealSwap({
        tokenIn: strategy.action_params.tokenIn,
        tokenOut: strategy.action_params.tokenOut,
        amount: amount,
        walletAddress: agentW.address,
        privateKey: agentW.privateKey,
        slippage: 0.5
      });

      if (!swapResult.success) {
        throw new Error(swapResult.error || 'Swap failed');
      }

      result = { hash: swapResult.txHash!, gasUsed: swapResult.gasUsed || '150000' };
    } else {
      throw new Error(`Unknown action type: ${strategy.action_type}`);
    }

    // Update transaction as success
    updateTransactionStatus(txId, 'success', result.hash, result.gasUsed);

    // Mark strategy as executed
    updateStrategyStatus(strategy.id, 'executed');

    state.strategiesExecuted++;
    
    addActivity('success', `✅ Strategy executed successfully! TX: ${result.hash.slice(0, 10)}...`, {
      strategyId: strategy.id,
      strategyName: strategy.name,
      txHash: result.hash,
      gasUsed: result.gasUsed
    });

  } catch (error) {
    addActivity('error', `❌ Strategy execution failed: ${strategy.name}`, {
      strategyId: strategy.id,
      error: String(error)
    });
    updateTransactionStatus(txId, 'failed');
    updateStrategyStatus(strategy.id, 'failed');
  }
}

function convertToWei(token: string, amount: string): string {
  const decimals: Record<string, number> = {
    ETH: 18,
    WETH: 18,
    USDC: 6,
    DAI: 18
  };

  const d = decimals[token] || 18;
  const value = parseFloat(amount);
  return Math.floor(value * Math.pow(10, d)).toString();
}