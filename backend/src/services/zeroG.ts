import { ParsedStrategy } from '../types';

interface StrategyStep {
  type: 'swap' | 'deposit' | 'withdraw';
  tokenIn?: string;
  tokenOut?: string;
  amount?: string;
  asset?: string;
  protocol?: string;
}

interface ExtendedParsedStrategy extends ParsedStrategy {
  steps: StrategyStep[];
}

const ZG_SYSTEM_PROMPT = `You are a DeFi strategy parser. Given a natural language trading strategy, extract a structured JSON object.

Output format:
{
  "name": "string - short descriptive name",
  "trigger": {
    "type": "price" | "time" | "apr" | "ai_signal",
    "token": "string - token symbol",
    "direction": "above" | "below" | "equals",
    "value": number
  },
  "action": {
    "type": "swap" | "deposit" | "withdraw" | "swap_and_deposit" | "withdraw_and_swap",
    "tokenIn": "string",
    "tokenOut": "string",
    "amount": "string"
  },
  "steps": [
    {"type": "swap|deposit|withdraw", "tokenIn": "...", "tokenOut": "...", "amount": "...", "asset": "...", "protocol": "aave"}
  ],
  "confidence": 0.0-1.0
}

Examples:
Input: "Buy ETH with 500 USDC when ETH drops below $2,400"
Output: {"name":"Buy ETH on Dip","trigger":{"type":"price","token":"ETH","direction":"below","value":2400},"action":{"type":"swap","tokenIn":"USDC","tokenOut":"ETH","amount":"500"},"steps":[{"type":"swap","tokenIn":"USDC","tokenOut":"ETH","amount":"500"}],"confidence":0.95}

Input: "ETH düşünce sat, AAVE yatır"
Output: {"name":"Sell ETH & Deposit AAVE","trigger":{"type":"price","token":"ETH","direction":"below","value":2400},"action":{"type":"swap_and_deposit","tokenIn":"ETH","tokenOut":"AAVE","amount":"1"},"steps":[{"type":"swap","tokenIn":"ETH","tokenOut":"USDC","amount":"1"},{"type":"deposit","asset":"AAVE","protocol":"aave"}],"confidence":0.90}

Input: "ETH $3000 gelirse AAVE çek, ETH al"
Output: {"name":"Withdraw AAVE & Buy ETH","trigger":{"type":"price","token":"ETH","direction":"above","value":3000},"action":{"type":"withdraw_and_swap","tokenIn":"AAVE","tokenOut":"ETH","amount":"1"},"steps":[{"type":"withdraw","asset":"AAVE","protocol":"aave"},{"type":"swap","tokenIn":"AAVE","tokenOut":"ETH","amount":"1"}],"confidence":0.90}

Only output valid JSON. No explanation.`;

export async function parseStrategy(prompt: string): Promise<ExtendedParsedStrategy> {
  try {
    if (process.env.ZG_PRIVATE_KEY) {
      const result = await parseWithZG(prompt);
      if (result) return result;
    }
  } catch (error) {
    console.error('0G parse error:', error);
  }

  return parseWithRules(prompt);
}

async function parseWithZG(prompt: string): Promise<ExtendedParsedStrategy | null> {
  try {
    const { createZGComputeNetworkBroker } = await import('@0glabs/0g-serving-broker');
    const privateKey = process.env.ZG_PRIVATE_KEY;
    if (!privateKey) return null;

    const broker = await createZGComputeNetworkBroker(privateKey as any);
    const services = await broker.inference.listService();
    if (!services || services.length === 0) return null;

    const service = services[0] as any;
    const endpoint = service.endpoint || service.url || `https://inference.0g.ai/v1/${service.provider}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: ZG_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ]
      })
    });

    const result = await response.text();
    const parsed = JSON.parse(result);
    return {
      id: 'strat_' + Date.now().toString(36),
      ...parsed,
      steps: parsed.steps || []
    };
  } catch (error) {
    console.error('0G inference error:', error);
    return null;
  }
}

function parseWithRules(prompt: string): ExtendedParsedStrategy {
  const lower = prompt.toLowerCase();

  let triggerToken = 'ETH';
  let triggerDirection: 'above' | 'below' = 'below';
  let triggerValue = 2400;
  let actionType = 'swap';
  let tokenIn = 'USDC';
  let tokenOut = 'ETH';
  let amount = '500';
  const steps: StrategyStep[] = [];

  // Extract price
  const priceMatch = prompt.match(/\$(\d[\d,]*(?:\.\d+)?)/);
  if (priceMatch) {
    triggerValue = parseFloat(priceMatch[1].replace(/,/g, ''));
  }

  // Direction
  if (lower.includes('above') || lower.includes('gelirse') || lower.includes('rises') || lower.includes('goes up')) {
    triggerDirection = 'above';
  }
  if (lower.includes('below') || lower.includes('düşünce') || lower.includes('drops') || lower.includes('düşerse')) {
    triggerDirection = 'below';
  }

  // Complex: ETH sat, AAVE yatır
  if ((lower.includes('sat') || lower.includes('sell')) && lower.includes('yatır')) {
    actionType = 'swap_and_deposit';
    tokenIn = 'ETH';
    tokenOut = 'AAVE';
    amount = '1';
    steps.push({ type: 'swap', tokenIn: 'ETH', tokenOut: 'USDC', amount: '1' });
    steps.push({ type: 'deposit', asset: 'AAVE', protocol: 'aave' });
  }
  // Complex: AAVE çek, ETH al
  else if (lower.includes('çek') && (lower.includes('al') || lower.includes('buy'))) {
    actionType = 'withdraw_and_swap';
    tokenIn = 'AAVE';
    tokenOut = 'ETH';
    amount = '1';
    steps.push({ type: 'withdraw', asset: 'AAVE', protocol: 'aave' });
    steps.push({ type: 'swap', tokenIn: 'AAVE', tokenOut: 'ETH', amount: '1' });
  }
  // Simple AAVE deposit
  else if (lower.includes('aave') && lower.includes('yatır')) {
    actionType = 'deposit';
    const assetMatch = prompt.match(/(ETH|USDC|USDT|DAI|WBTC|AAVE)/i);
    tokenOut = assetMatch ? assetMatch[1].toUpperCase() : 'USDC';
    tokenIn = tokenOut;
    steps.push({ type: 'deposit', asset: tokenOut, protocol: 'aave' });
  }
  // Simple AAVE withdraw
  else if (lower.includes('aave') && lower.includes('çek')) {
    actionType = 'withdraw';
    const assetMatch = prompt.match(/(ETH|USDC|USDT|DAI|WBTC|AAVE)/i);
    tokenIn = assetMatch ? assetMatch[1].toUpperCase() : 'USDC';
    tokenOut = tokenIn;
    steps.push({ type: 'withdraw', asset: tokenIn, protocol: 'aave' });
  }
  // Simple swap
  else {
    const amountMatch = prompt.match(/(\d[\d,]*(?:\.\d+)?)\s*(ETH|USDC|USDT|DAI|WBTC)/i);
    if (amountMatch) {
      amount = amountMatch[1].replace(/,/g, '');
      tokenIn = amountMatch[2].toUpperCase();
    }

    if (lower.includes('buy') || lower.includes('al')) {
      tokenIn = 'USDC';
      tokenOut = 'ETH';
      actionType = 'buy';
    } else if (lower.includes('sell') || lower.includes('sat')) {
      tokenIn = 'ETH';
      tokenOut = 'USDC';
      actionType = 'sell';
    }

    steps.push({ type: 'swap', tokenIn, tokenOut, amount });
  }

  // Generate human-readable name
  let name: string;
  if (steps.length > 1) {
    name = steps.map(s => {
      if (s.type === 'swap') return `Swap ${s.tokenIn}→${s.tokenOut}`;
      if (s.type === 'deposit') return `Deposit ${s.asset} to AAVE`;
      if (s.type === 'withdraw') return `Withdraw ${s.asset} from AAVE`;
      return s.type;
    }).join(' + ');
  } else if (actionType === 'buy') {
    name = `Buy ${tokenOut} with ${amount} ${tokenIn}`;
  } else if (actionType === 'sell') {
    name = `Sell ${amount} ${tokenIn} for ${tokenOut}`;
  } else {
    name = `Swap ${amount} ${tokenIn} → ${tokenOut}`;
  }

  return {
    id: 'strat_' + Date.now().toString(36),
    name,
    trigger: {
      type: 'price',
      token: triggerToken,
      direction: triggerDirection,
      value: triggerValue
    },
    action: {
      type: actionType,
      tokenIn,
      tokenOut,
      amount
    },
    steps,
    confidence: 0.92
  };
}

export async function getMarketSignal(token: string, priceHistory: number[]): Promise<string> {
  try {
    if (process.env.ZG_PRIVATE_KEY) {
      const { createZGComputeNetworkBroker } = await import('@0glabs/0g-serving-broker');
      const broker = await createZGComputeNetworkBroker(process.env.ZG_PRIVATE_KEY as any);
      const services = await broker.inference.listService();

      if (services && services.length > 0) {
        const svc = services[0] as any;
        const endpoint = svc.endpoint || svc.url || `https://inference.0g.ai/v1/${svc.provider}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: 'Analyze the following price data and provide a brief market signal: BUY, SELL, or HOLD. Include a 1-2 sentence reasoning.' },
              { role: 'user', content: JSON.stringify({ token, prices: priceHistory }) }
            ]
          })
        });
        return await response.text();
      }
    }
  } catch (error) {
    console.error('Market signal error:', error);
  }

  const lastPrice = priceHistory[priceHistory.length - 1];
  const firstPrice = priceHistory[0];
  const change = ((lastPrice - firstPrice) / firstPrice) * 100;

  if (change > 5) return `SELL - ${token} has risen ${change.toFixed(1)}%, consider taking profits.`;
  if (change < -5) return `BUY - ${token} has dropped ${Math.abs(change).toFixed(1)}%, potential buying opportunity.`;
  return `HOLD - ${token} is relatively stable with ${change.toFixed(1)}% change.`;
}