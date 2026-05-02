import { Router, Request, Response } from 'express';
import { getAllTransactions, getTransactionsByStrategy } from '../services/database';

const router = Router();

// GET /api/history
router.get('/', (req: Request, res: Response) => {
  try {
    const transactions = getAllTransactions();
    res.json(transactions);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get transaction history' });
  }
});

// GET /api/history/:strategyId
router.get('/:strategyId', (req: Request, res: Response) => {
  try {
    const transactions = getTransactionsByStrategy(String(req.params.strategyId));
    res.json(transactions);
  } catch (error) {
    console.error('Get strategy history error:', error);
    res.status(500).json({ error: 'Failed to get strategy history' });
  }
});

export default router;