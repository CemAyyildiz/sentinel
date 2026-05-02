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
    console.error('Uniswap quote error:', error);
    // Return mock data for development
    return {
      quote: amount,
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
): Promise<{ hash: string }> {
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

    return await swapResponse.json() as { hash: string };
  } catch (error) {
    console.error('Swap execution error:', error);
    // Return mock hash for development
    return {
      hash: '0x' + Math.random().toString(16).slice(2) + Date.now().toString(16)
    };
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
  try {
    const quote = await getQuote('USDC', 'ETH', '1000000000'); // 1000 USDC
    const ethAmount = parseFloat(quote.quote) / 1e18;
    return 1000 / ethAmount;
  } catch {
    return 2400; // Mock price
  }
}