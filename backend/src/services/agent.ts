import { getStrategy, getAllStrategies, updateStrategyStatus, createTransaction, updateTransactionStatus } from './database';
import { getQuote, executeSwap, getETHPrice } from './uniswap';
import { depositToAave, withdrawFromAave } from './aave';
import { v4 as uuidv4 } from 'uuid';

interface AgentState {
  running: boolean;
  intervalId: NodeJS.Timeout | null;
  lastCheck: Date | null;
  checksPerformed: number;
  strategiesExecuted: number;
}

const state: AgentState = {
  running: false,
  intervalId: null,
  lastCheck: null,
  checksPerformed: 0,
  strategiesExecuted: 0
};

const CHECK_INTERVAL = 30000; // 30 seconds

export function getAgentState() {
  return {
    ...state,
    activeStrategies: getAllStrategies().filter(s => s.status === 'active').length
  };
}

export function startAgent() {
  if (state.running) {
    console.log('🤖 Agent already running');
    return;
  }

  console.log('🤖 Starting SentinelSwap Agent...');
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
    currentPrice = await getETHPrice();
    console.log(`🤖 [Agent] Current ETH price: $${currentPrice}`);
  } catch (error) {
    console.error('🤖 [Agent] Failed to get ETH price:', error);
    currentPrice = 2400; // Fallback
  }

  for (const strategy of strategies) {
    try {
      await evaluateStrategy(strategy, currentPrice);
    } catch (error) {
      console.error(`🤖 [Agent] Error evaluating strategy ${strategy.id}:`, error);
    }
  }
}

async function evaluateStrategy(strategy: any, currentPrice: number) {
  const trigger = strategy.trigger_params;
  if (!trigger || trigger.type !== 'price') return;

  const targetPrice = trigger.value;
  const direction = trigger.direction;
  const token = trigger.token;

  let shouldExecute = false;

  if (token === 'ETH') {
    if (direction === 'below' && currentPrice < targetPrice) {
      shouldExecute = true;
      console.log(`🤖 [Agent] TRIGGER: ETH ($${currentPrice}) < $${targetPrice}`);
    } else if (direction === 'above' && currentPrice > targetPrice) {
      shouldExecute = true;
      console.log(`🤖 [Agent] TRIGGER: ETH ($${currentPrice}) > $${targetPrice}`);
    }
  }

  if (shouldExecute) {
    console.log(`🤖 [Agent] Executing strategy: ${strategy.name}`);
    await executeStrategy(strategy);
  }
}

async function executeStrategy(strategy: any) {
  const txId = uuidv4();
  const walletAddress = strategy.wallet_address || '0x0000000000000000000000000000000000000000';

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
      // Simple swap
      const amount = convertToWei(strategy.action_params.tokenIn, strategy.action_params.amount);
      const quote = await getQuote(
        strategy.action_params.tokenIn,
        strategy.action_params.tokenOut,
        amount
      );
      result = await executeSwap(
        quote,
        walletAddress,
        strategy.action_params.tokenIn,
        strategy.action_params.tokenOut,
        amount
      );
    } else if (strategy.action_type === 'deposit') {
      // AAVE deposit
      const depositResult = await depositToAave(
        strategy.action_params.tokenOut,
        strategy.action_params.amount,
        walletAddress
      );
      result = { hash: depositResult.txHash, gasUsed: '150000' };
    } else if (strategy.action_type === 'withdraw') {
      // AAVE withdraw
      const withdrawResult = await withdrawFromAave(
        `pos_${strategy.id}`,
        walletAddress
      );
      result = { hash: withdrawResult.txHash, gasUsed: '150000' };
    } else if (strategy.action_type === 'swap_and_deposit') {
      // Swap then deposit
      const amount = convertToWei(strategy.action_params.tokenIn, strategy.action_params.amount);
      const quote = await getQuote(strategy.action_params.tokenIn, 'USDC', amount);
      const swapResult = await executeSwap(quote, walletAddress, strategy.action_params.tokenIn, 'USDC', amount);

      // Then deposit to AAVE
      const depositResult = await depositToAave('AAVE', '1', walletAddress);
      result = { hash: depositResult.txHash, gasUsed: '300000' };
    } else if (strategy.action_type === 'withdraw_and_swap') {
      // Withdraw then swap
      const withdrawResult = await withdrawFromAave(`pos_${strategy.id}`, walletAddress);

      // Then swap
      const amount = convertToWei('AAVE', '1');
      const quote = await getQuote('AAVE', strategy.action_params.tokenOut, amount);
      const swapResult = await executeSwap(quote, walletAddress, 'AAVE', strategy.action_params.tokenOut, amount);
      result = { hash: swapResult.hash, gasUsed: '300000' };
    } else {
      throw new Error(`Unknown action type: ${strategy.action_type}`);
    }

    // Update transaction as success
    updateTransactionStatus(txId, 'success', result.hash, result.gasUsed);

    // Mark strategy as executed
    updateStrategyStatus(strategy.id, 'executed');

    state.strategiesExecuted++;
    console.log(`🤖 [Agent] ✅ Strategy executed! TX: ${result.hash}`);

  } catch (error) {
    console.error(`🤖 [Agent] ❌ Strategy execution failed:`, error);
    updateTransactionStatus(txId, 'failed');
    updateStrategyStatus(strategy.id, 'failed');
  }
}

function convertToWei(token: string, amount: string): string {
  const decimals: Record<string, number> = {
    ETH: 18,
    WETH: 18,
    USDC: 6,
    DAI: 18,
    AAVE: 18
  };

  const d = decimals[token] || 18;
  const value = parseFloat(amount);
  return Math.floor(value * Math.pow(10, d)).toString();
}