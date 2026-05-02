import { Router, Request, Response } from 'express';
import { getQuote, getPools, getETHPrice } from '../services/uniswap';
import { getMarketSignal } from '../services/zeroG';

const router = Router();

// GET /api/quote
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const { tokenIn, tokenOut, amount } = req.query;

    if (!tokenIn || !tokenOut || !amount) {
      return res.status(400).json({ error: 'tokenIn, tokenOut, and amount are required' });
    }

    const quote = await getQuote(
      tokenIn as string,
      tokenOut as string,
      amount as string
    );

    res.json(quote);
  } catch (error) {
    console.error('Quote error:', error);
    res.status(500).json({ error: 'Failed to get quote' });
  }
});

// GET /api/pools
router.get('/pools', async (req: Request, res: Response) => {
  try {
    const { token0, token1 } = req.query;

    if (!token0 || !token1) {
      return res.status(400).json({ error: 'token0 and token1 are required' });
    }

    const pools = await getPools(token0 as string, token1 as string);
    res.json(pools);
  } catch (error) {
    console.error('Pools error:', error);
    res.status(500).json({ error: 'Failed to get pools' });
  }
});

// GET /api/price
router.get('/price', async (req: Request, res: Response) => {
  try {
    const price = await getETHPrice();
    res.json({ price, timestamp: Date.now() });
  } catch (error) {
    console.error('Price error:', error);
    res.status(500).json({ error: 'Failed to get price' });
  }
});

// POST /api/signal
router.post('/signal', async (req: Request, res: Response) => {
  try {
    const { token, priceHistory } = req.body;

    if (!token || !priceHistory) {
      return res.status(400).json({ error: 'token and priceHistory are required' });
    }

    const signal = await getMarketSignal(token, priceHistory);
    res.json({ signal });
  } catch (error) {
    console.error('Signal error:', error);
    res.status(500).json({ error: 'Failed to get market signal' });
  }
});

export default router;