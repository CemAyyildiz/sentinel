import { Router, Request, Response } from 'express';
import { getQuote, getPools, getETHPrice, getTokenPrice, getAllTokenPrices } from '../services/uniswap';
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

// GET /api/price/:token - Get price for a specific token
router.get('/price/:token', async (req: Request, res: Response) => {
  try {
    const token = req.params.token as string;
    const price = await getTokenPrice(token);
    res.json({ token: token.toUpperCase(), price, timestamp: Date.now() });
  } catch (error) {
    console.error('Token price error:', error);
    res.status(500).json({ error: 'Failed to get token price' });
  }
});

// GET /api/prices - Get all token prices
router.get('/prices', async (req: Request, res: Response) => {
  try {
    const prices = await getAllTokenPrices();
    res.json({ prices, timestamp: Date.now() });
  } catch (error) {
    console.error('Prices error:', error);
    res.status(500).json({ error: 'Failed to get prices' });
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
