import { Router, Request, Response } from 'express';
import { getAgentState, startAgent, stopAgent } from '../services/agent';

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
      activeStrategies: state.activeStrategies
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

export default router;