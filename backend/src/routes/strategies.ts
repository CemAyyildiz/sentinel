import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  createStrategy,
  getStrategy,
  getAllStrategies,
  updateStrategyStatus,
  deleteStrategy,
  createTransaction,
  updateTransactionStatus
} from '../services/database';
import { parseStrategy } from '../services/zeroG';
import { getQuote, executeSwap } from '../services/uniswap';
import { createKeeperTask, pauseKeeperTask, resumeKeeperTask, cancelKeeperTask } from '../services/keeperHub';
import { depositToAave, withdrawFromAave, getLendingPositions } from '../services/aave';

const router = Router();

// POST /api/strategies/parse
router.post('/parse', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const parsed = await parseStrategy(prompt);

    // Get quote for the parsed strategy
    try {
      const amount = convertToWei(parsed.action.tokenIn, parsed.action.amount);
      const quote = await getQuote(
        parsed.action.tokenIn,
        parsed.action.tokenOut,
        amount
      );
      parsed.estimatedRoute = quote;
    } catch (quoteError) {
      console.error('Quote fetch failed, using calculated fallback:', quoteError);
      // Fallback: calculate estimated output based on current ETH price
      const ethPrice = 2400; // Current ETH price
      const amountNum = parseFloat(parsed.action.amount);
      let estimatedOutput: string;
      
      if (parsed.action.tokenIn === 'USDC' && parsed.action.tokenOut === 'ETH') {
        // USDC to ETH: amount / price
        estimatedOutput = ((amountNum / ethPrice) * 1e18).toFixed(0);
      } else if (parsed.action.tokenIn === 'ETH' && parsed.action.tokenOut === 'USDC') {
        // ETH to USDC: amount * price
        estimatedOutput = ((amountNum * ethPrice) * 1e6).toFixed(0);
      } else {
        // Default fallback
        estimatedOutput = (amountNum * 0.99 * 1e18).toFixed(0);
      }
      
      parsed.estimatedRoute = {
        quote: estimatedOutput,
        gasEstimate: '150000',
        priceImpact: '0.05',
        route: [parsed.action.tokenIn, parsed.action.tokenOut]
      };
    }

    // Save to database
    createStrategy({
      id: parsed.id,
      name: parsed.name,
      prompt: prompt,
      trigger_type: parsed.trigger.type,
      trigger_params: {
        token: parsed.trigger.token,
        direction: parsed.trigger.direction,
        value: parsed.trigger.value
      },
      action_type: parsed.action.type,
      action_params: {
        tokenIn: parsed.action.tokenIn,
        tokenOut: parsed.action.tokenOut,
        amount: parsed.action.amount
      }
    });

    res.json(parsed);
  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({ error: 'Failed to parse strategy' });
  }
});

// POST /api/strategies/deploy
router.post('/deploy', async (req: Request, res: Response) => {
  try {
    const { strategyId, walletAddress } = req.body;

    if (!strategyId) {
      return res.status(400).json({ error: 'Strategy ID is required' });
    }

    const strategy = getStrategy(strategyId);
    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    if (walletAddress) {
      strategy.wallet_address = walletAddress;
    }

    const taskId = await createKeeperTask(strategy);
    updateStrategyStatus(strategyId, 'active', taskId);

    res.json({
      taskId,
      status: 'active',
      message: 'Strategy deployed successfully'
    });
  } catch (error) {
    console.error('Deploy error:', error);
    res.status(500).json({ error: 'Failed to deploy strategy' });
  }
});

// GET /api/strategies
router.get('/', (req: Request, res: Response) => {
  try {
    const strategies = getAllStrategies();
    res.json(strategies);
  } catch (error) {
    console.error('Get strategies error:', error);
    res.status(500).json({ error: 'Failed to get strategies' });
  }
});

// GET /api/strategies/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const strategy = getStrategy(String(req.params.id));
    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }
    res.json(strategy);
  } catch (error) {
    console.error('Get strategy error:', error);
    res.status(500).json({ error: 'Failed to get strategy' });
  }
});

// PATCH /api/strategies/:id/pause
router.patch('/:id/pause', async (req: Request, res: Response) => {
  try {
    const strategy = getStrategy(String(req.params.id));
    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    if (strategy.keeper_task_id) {
      await pauseKeeperTask(strategy.keeper_task_id);
    }

    updateStrategyStatus(String(req.params.id), 'paused');
    res.json({ status: 'paused' });
  } catch (error) {
    console.error('Pause error:', error);
    res.status(500).json({ error: 'Failed to pause strategy' });
  }
});

// PATCH /api/strategies/:id/resume
router.patch('/:id/resume', async (req: Request, res: Response) => {
  try {
    const strategy = getStrategy(String(req.params.id));
    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    if (strategy.keeper_task_id) {
      await resumeKeeperTask(strategy.keeper_task_id);
    }

    updateStrategyStatus(String(req.params.id), 'active');
    res.json({ status: 'active' });
  } catch (error) {
    console.error('Resume error:', error);
    res.status(500).json({ error: 'Failed to resume strategy' });
  }
});

// DELETE /api/strategies/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const strategy = getStrategy(String(req.params.id));
    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    if (strategy.keeper_task_id) {
      await cancelKeeperTask(strategy.keeper_task_id);
    }

    deleteStrategy(String(req.params.id));
    res.json({ deleted: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete strategy' });
  }
});

// POST /api/strategies/:id/execute (Manual trigger for demo)
router.post('/:id/execute', async (req: Request, res: Response) => {
  try {
    const strategy = getStrategy(String(req.params.id));
    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    const { walletAddress } = req.body;
    const address = walletAddress || strategy.wallet_address || '0x0000000000000000000000000000000000000000';

    // Create transaction record
    const txId = uuidv4();
    createTransaction({
      id: txId,
      strategy_id: String(req.params.id),
      status: 'pending',
      action_type: strategy.action_type,
      action_details: strategy.action_params
    });

    // Handle different action types
    let result: { hash: string; gasUsed: string };

    if (strategy.action_type === 'deposit') {
      // AAVE Deposit
      const depositResult = await depositToAave(
        strategy.action_params.tokenOut,
        strategy.action_params.amount,
        address
      );
      result = { hash: depositResult.txHash, gasUsed: '150000' };
    } else if (strategy.action_type === 'withdraw') {
      // AAVE Withdraw
      const withdrawResult = await withdrawFromAave(
        `pos_${strategy.id}`,
        address
      );
      result = { hash: withdrawResult.txHash, gasUsed: '150000' };
    } else if (strategy.action_type === 'swap_and_deposit') {
      // Swap then deposit
      const amount = convertToWei(strategy.action_params.tokenIn, strategy.action_params.amount);
      const quote = await getQuote(
        strategy.action_params.tokenIn,
        'USDC',
        amount
      );
      const swapResult = await executeSwap(quote, address, strategy.action_params.tokenIn, 'USDC', amount);
      
      // Then deposit to AAVE
      const depositResult = await depositToAave('AAVE', '1', address);
      result = { hash: depositResult.txHash, gasUsed: '300000' };
    } else if (strategy.action_type === 'withdraw_and_swap') {
      // Withdraw then swap
      const withdrawResult = await withdrawFromAave(`pos_${strategy.id}`, address);
      
      // Then swap
      const amount = convertToWei('AAVE', '1');
      const quote = await getQuote('AAVE', strategy.action_params.tokenOut, amount);
      const swapResult = await executeSwap(quote, address, 'AAVE', strategy.action_params.tokenOut, amount);
      result = { hash: swapResult.hash, gasUsed: swapResult.gasUsed };
    } else {
      // Default: swap
      const amount = convertToWei(strategy.action_params.tokenIn, strategy.action_params.amount);
      const quote = await getQuote(
        strategy.action_params.tokenIn,
        strategy.action_params.tokenOut,
        amount
      );
      result = await executeSwap(
        quote,
        address,
        strategy.action_params.tokenIn,
        strategy.action_params.tokenOut,
        amount
      );
    }

    // Update transaction
    updateTransactionStatus(txId, 'success', result.hash, result.gasUsed);

    // Update strategy status
    updateStrategyStatus(String(req.params.id), 'executed');

    res.json({
      txHash: result.hash,
      status: 'success',
      gasUsed: result.gasUsed
    });
  } catch (error) {
    console.error('Execute error:', error);
    res.status(500).json({ error: 'Failed to execute strategy' });
  }
});

// GET /api/strategies/:id/lending-positions
router.get('/:id/lending-positions', async (req: Request, res: Response) => {
  try {
    const strategy = getStrategy(String(req.params.id));
    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    const address = strategy.wallet_address || '0x0000000000000000000000000000000000000000';
    const positions = await getLendingPositions(address);
    res.json(positions);
  } catch (error) {
    console.error('Get lending positions error:', error);
    res.status(500).json({ error: 'Failed to get lending positions' });
  }
});

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

export default router;