import { Router, Request, Response } from 'express';
import { getAgentState, startAgent, stopAgent } from '../services/agent';
import { checkWalletBalance } from '../services/realSwap';

const router = Router();

// Get agent status
router.get('/status', (req: Request, res: Response) => {
  const state = getAgentState();
  res.json({
    success: true,
    agent: {
      running: state.running,
      lastCheck: state.lastCheck,
      checksPerformed: state.checksPerformed,
      strategiesExecuted: state.strategiesExecuted,
      activeStrategies: state.activeStrategies,
      walletAddress: state.walletAddress
    }
  });
});

// Start agent
router.post('/start', (req: Request, res: Response) => {
  startAgent();
  res.json({
    success: true,
    message: 'Agent started'
  });
});

// Stop agent
router.post('/stop', (req: Request, res: Response) => {
  stopAgent();
  res.json({
    success: true,
    message: 'Agent stopped'
  });
});

// Check wallet balance
router.get('/balance/:address', async (req: Request, res: Response) => {
  try {
    const address = req.params.address as string;
    const balance = await checkWalletBalance(address);
    res.json({
      success: true,
      balance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check balance'
    });
  }
});

export default router;
