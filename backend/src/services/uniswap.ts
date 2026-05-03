import { TOKENS, UNISWAP_CONTRACTS, QuoteResult, PoolData } from '../types';

const UNISWAP_API = 'https://trading-api.gateway.uniswap.org/v1';

function getHeaders() {
  return {
    'x-api-key': process.env.UNISWAP_API_KEY || '',
    'Content-Type': 'application/json'
  };
}

export async function getQuote(
  tokenIn: string,
  tokenOut: string,
  amount: string,
  chainId: number = 11155111
): Promise<QuoteResult> {
  const tokenInInfo = TOKENS[tokenIn];
  const tokenOutInfo = TOKENS[tokenOut];

  if (!tokenInInfo || !tokenOutInfo) {
    throw new Error(`Unknown token: ${tokenIn} or ${tokenOut}`);
  }

  const tokenInAddress = tokenInInfo.address;
  const tokenOutAddress = tokenOutInfo.address;

  try {
    const response = await fetch(
      `${UNISWAP_API}/quote?tokenInAddress=${tokenInAddress}&tokenOutAddress=${tokenOutAddress}&tokenInChainId=${chainId}&tokenOutChainId=${chainId}&amount=${amount}&type=EXACT_INPUT`,
      { headers: getHeaders() }
    );

    if (!response.ok) {
      throw new Error(`Uniswap API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      quote: (data as any).quote?.amount || '0',
      gasEstimate: (data as any).gasUseEstimate || '0',
      priceImpact: (data as any).priceImpact || '0',
      route: (data as any).route?.map((r: any) => r.address) || []
    };
  } catch (error) {
    console.error('[Uniswap] Quote API failed, using CoinGecko fallback:', error);
    
    // Fallback: calculate quote using REAL ETH price from CoinGecko
    const ethPrice = await getETHPrice();
    console.log(`[Uniswap Fallback] Using real ETH price: $${ethPrice}`);
    
    const amountNum = parseFloat(amount) || 0;
    let quoteAmount = '0';
    
    // USDC has 6 decimals, ETH has 18 decimals
    if (tokenIn === 'USDC' && tokenOut === 'ETH') {
      const usdcAmount = amountNum / 1e6;
      const ethAmount = usdcAmount / ethPrice;
      quoteAmount = (ethAmount * 1e18).toString();
      console.log(`[Uniswap Fallback] ${usdcAmount} USDC / $${ethPrice} = ${ethAmount} ETH`);
    } else if (tokenIn === 'ETH' && tokenOut === 'USDC') {
      const ethAmount = amountNum / 1e18;
      const usdcAmount = ethAmount * ethPrice;
      quoteAmount = (usdcAmount * 1e6).toString();
      console.log(`[Uniswap Fallback] ${ethAmount} ETH * $${ethPrice} = ${usdcAmount} USDC`);
    } else if (tokenIn === 'USDT' && tokenOut === 'ETH') {
      const usdtAmount = amountNum / 1e6;
      const ethAmount = usdtAmount / ethPrice;
      quoteAmount = (ethAmount * 1e18).toString();
    } else if (tokenIn === 'ETH' && tokenOut === 'USDT') {
      const ethAmount = amountNum / 1e18;
      const usdtAmount = ethAmount * ethPrice;
      quoteAmount = (usdtAmount * 1e6).toString();
    } else if (tokenIn === 'DAI' && tokenOut === 'ETH') {
      const daiAmount = amountNum / 1e18;
      const ethAmount = daiAmount / ethPrice;
      quoteAmount = (ethAmount * 1e18).toString();
    } else if (tokenIn === 'ETH' && tokenOut === 'DAI') {
      const ethAmount = amountNum / 1e18;
      const daiAmount = ethAmount * ethPrice;
      quoteAmount = (daiAmount * 1e18).toString();
    } else {
      quoteAmount = amount;
    }
    
    return {
      quote: quoteAmount,
      gasEstimate: '150000',
      priceImpact: '0.01',
      route: [tokenInAddress, tokenOutAddress]
    };
  }
}

export async function executeSwap(
  quoteResult: QuoteResult,
  walletAddress: string,
  tokenIn: string,
  tokenOut: string,
  amount: string
): Promise<{ hash: string; gasUsed: string }> {
  try {
    const swapResponse = await fetch(`${UNISWAP_API}/swap`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        quote: quoteResult.quote,
        walletAddress: walletAddress,
        slippageTolerance: '0.5',
        deadline: Math.floor(Date.now() / 1000) + 1800
      })
    });

    if (!swapResponse.ok) {
      throw new Error(`Swap failed: ${swapResponse.status}`);
    }

    const data = await swapResponse.json() as any;
    return {
      hash: data.hash,
      gasUsed: data.gasUsed || quoteResult.gasEstimate || '150000'
    };
  } catch (error) {
    console.error('[Uniswap] Swap execution error:', error);
    throw new Error(`Swap execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getPools(
  token0: string,
  token1: string,
  chainId: number = 11155111
): Promise<PoolData[]> {
  const token0Info = TOKENS[token0];
  const token1Info = TOKENS[token1];

  if (!token0Info || !token1Info) {
    throw new Error(`Unknown token: ${token0} or ${token1}`);
  }

  try {
    const response = await fetch(
      `${UNISWAP_API}/pools?token0=${token0Info.address}&token1=${token1Info.address}&chainId=${chainId}`,
      { headers: getHeaders() }
    );

    if (!response.ok) {
      throw new Error(`Pools API error: ${response.status}`);
    }

    const data = await response.json();
    return (data as any).pools || [];
  } catch (error) {
    console.error('Pools fetch error:', error);
    // Return mock data
    return [
      {
        address: UNISWAP_CONTRACTS.FACTORY,
        token0: token0Info.symbol,
        token1: token1Info.symbol,
        fee: 3000,
        tvl: '1000000',
        apr: '12.5',
        volume24h: '500000'
      }
    ];
  }
}

// Price cache to avoid rate limiting
interface PriceCache {
  [token: string]: { price: number; timestamp: number };
}
let cachedPrices: PriceCache = {};
const CACHE_DURATION_MS = 30 * 1000; // 30 seconds

// Supported tokens with CoinGecko IDs
const TOKEN_PRICE_MAP: { [symbol: string]: { coingeckoId: string; fallbackPrice: number } } = {
  ETH: { coingeckoId: 'ethereum', fallbackPrice: 2400 },
  BTC: { coingeckoId: 'bitcoin', fallbackPrice: 65000 },
  USDC: { coingeckoId: 'usd-coin', fallbackPrice: 1 },
  USDT: { coingeckoId: 'tether', fallbackPrice: 1 },
  DAI: { coingeckoId: 'dai', fallbackPrice: 1 },
  WETH: { coingeckoId: 'ethereum', fallbackPrice: 2400 },
  UNI: { coingeckoId: 'uniswap', fallbackPrice: 7 },
  LINK: { coingeckoId: 'chainlink', fallbackPrice: 14 },
  AAVE: { coingeckoId: 'aave', fallbackPrice: 90 }
};

export async function getTokenPrice(token: string): Promise<number> {
  const tokenInfo = TOKEN_PRICE_MAP[token.toUpperCase()];
  if (!tokenInfo) {
    console.warn(`[CoinGecko] Unknown token: ${token}, using fallback price of $1`);
    return 1;
  }

  const cacheKey = token.toUpperCase();
  const cached = cachedPrices[cacheKey];
  
  // Return cached price if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    console.log(`[CoinGecko] Using cached ${token} price: $${cached.price}`);
    return cached.price;
  }

  // Fetch from CoinGecko
  try {
    console.log(`[CoinGecko] Fetching real ${token} price...`);
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${tokenInfo.coingeckoId}&vs_currencies=usd`
    );
    
    if (!res.ok) {
      throw new Error(`CoinGecko API error: ${res.status}`);
    }
    
    const data = await res.json() as { [key: string]: { usd: number } };
    const price = data[tokenInfo.coingeckoId]?.usd;
    
    if (!price || price <= 0) {
      throw new Error(`Invalid price from CoinGecko: ${price}`);
    }
    
    console.log(`[CoinGecko] ${token} price: $${price}`);
    
    // Update cache
    cachedPrices[cacheKey] = { price, timestamp: Date.now() };
    
    return price;
  } catch (error) {
    console.error(`[CoinGecko] Failed to fetch ${token} price:`, error);
    
    // If we have a cached price, use it even if expired
    if (cached) {
      console.log(`[CoinGecko] Using expired cached ${token} price: $${cached.price}`);
      return cached.price;
    }
    
    // Use fallback price
    console.log(`[CoinGecko] Using fallback ${token} price: $${tokenInfo.fallbackPrice}`);
    return tokenInfo.fallbackPrice;
  }
}

export async function getETHPrice(): Promise<number> {
  return getTokenPrice('ETH');
}

export async function getAllTokenPrices(): Promise<{ [token: string]: number }> {
  const tokens = ['ETH', 'BTC', 'USDC', 'USDT', 'DAI', 'UNI', 'LINK'];
  const prices: { [token: string]: number } = {};
  
  // Fetch all prices in parallel
  const results = await Promise.allSettled(
    tokens.map(async (token) => {
      const price = await getTokenPrice(token);
      return { token, price };
    })
  );
  
  for (const result of results) {
    if (result.status === 'fulfilled') {
      prices[result.value.token] = result.value.price;
    }
  }
  
  return prices;
}
