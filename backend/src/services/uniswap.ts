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

export async function getETHPrice(): Promise<number> {
  // Use CoinGecko as primary price source (free, no API key needed)
  try {
    console.log('[CoinGecko] Fetching real ETH price...');
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    if (!res.ok) {
      throw new Error(`CoinGecko API error: ${res.status}`);
    }
    const data = await res.json() as { ethereum: { usd: number } };
    const price = data.ethereum?.usd;
    if (!price || price > 100000 || price < 100) {
      throw new Error(`Invalid price from CoinGecko: ${price}`);
    }
    console.log(`[CoinGecko] ETH price: $${price}`);
    return price;
  } catch (error) {
    console.error('[CoinGecko] Failed to fetch ETH price:', error);
    throw new Error('Unable to fetch real ETH price. CoinGecko API is unavailable.');
  }
}
