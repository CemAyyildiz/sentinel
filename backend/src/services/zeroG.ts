import { ParsedStrategy } from '../types';

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
    "type": "swap" | "add_liquidity" | "remove_liquidity",
    "tokenIn": "string",
    "tokenOut": "string",
    "amount": "string"
  },
  "confidence": 0.0-1.0
}

Examples:
Input: "Buy ETH with 500 USDC when ETH drops below $2,400"
Output: {"name":"Buy ETH on Dip","trigger":{"type":"price","token":"ETH","direction":"below","value":2400},"action":{"type":"swap","tokenIn":"USDC","tokenOut":"ETH","amount":"500"},"confidence":0.95}

Input: "Sell 1 ETH when price goes above $3,000"
Output: {"name":"Sell ETH at Target","trigger":{"type":"price","token":"ETH","direction":"above","value":3000},"action":{"type":"swap","tokenIn":"ETH","tokenOut":"USDC","amount":"1"},"confidence":0.92}

Input: "Swap 100 USDC to ETH at best rate"
Output: {"name":"Swap USDC to ETH","trigger":{"type":"price","token":"ETH","direction":"above","value":0},"action":{"type":"swap","tokenIn":"USDC","tokenOut":"ETH","amount":"100"},"confidence":0.98}

Only output valid JSON. No explanation.`;

export async function parseStrategy(prompt: string): Promise<ParsedStrategy> {
  try {
    // Try 0G SDK first
    if (process.env.ZG_PRIVATE_KEY) {
      const result = await parseWithZG(prompt);
      if (result) return result;
    }
  } catch (error) {
    console.error('0G parse error:', error);
  }

  // Fallback: rule-based parser
  return parseWithRules(prompt);
}

async function parseWithZG(prompt: string): Promise<ParsedStrategy | null> {
  try {
    // Dynamic import to avoid crash if SDK not installed
    const { createZGComputeNetworkBroker } = await import('@0glabs/0g-serving-broker');

    const privateKey = process.env.ZG_PRIVATE_KEY;
    if (!privateKey) return null;

    const broker = await createZGComputeNetworkBroker(privateKey as any);

    // List available services
    const services = await broker.inference.listService();
    if (!services || services.length === 0) {
      console.log('No 0G services available, using rule-based parser');
      return null;
    }

    // Use the first available service
    const service = services[0] as any;
    console.log('Using 0G service:', service.provider || service.model);

    // Use the service endpoint directly
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
      ...parsed
    };
  } catch (error) {
    console.error('0G inference error:', error);
    return null;
  }
}

function parseWithRules(prompt: string): ParsedStrategy {
  const lower = prompt.toLowerCase();

  // Extract token names
  const tokens = ['eth', 'weth', 'usdc', 'dai'];
  const foundTokens = tokens.filter(t => lower.includes(t));

  // Extract numbers (prices and amounts)
  const numbers = prompt.match(/\d+\.?\d*/g)?.map(Number) || [];

  // Determine action type
  const isBuy = lower.includes('buy') || lower.includes('swap');
  const isSell = lower.includes('sell');

  // Determine trigger
  const isPriceTrigger = lower.includes('when') || lower.includes('if') || lower.includes('drops') || lower.includes('goes') || lower.includes('above') || lower.includes('below');
  const isBelow = lower.includes('below') || lower.includes('drop') || lower.includes('dip');
  const isAbove = lower.includes('above') || lower.includes('exceed') || lower.includes('rise');

  // Build strategy
  let tokenIn = 'USDC';
  let tokenOut = 'ETH';
  let amount = '500';
  let triggerToken = 'ETH';
  let direction: 'above' | 'below' = 'below';
  let triggerValue = 2400;

  if (isBuy) {
    tokenIn = foundTokens.includes('usdc') ? 'USDC' : foundTokens.includes('dai') ? 'DAI' : 'USDC';
    tokenOut = foundTokens.find(t => t === 'eth' || t === 'weth')?.toUpperCase() || 'ETH';
  } else if (isSell) {
    tokenIn = foundTokens.find(t => t === 'eth' || t === 'weth')?.toUpperCase() || 'ETH';
    tokenOut = foundTokens.includes('usdc') ? 'USDC' : foundTokens.includes('dai') ? 'DAI' : 'USDC';
  }

  // Extract amount
  if (numbers.length > 0) {
    if (isPriceTrigger && numbers.length > 1) {
      amount = String(numbers[0]);
      triggerValue = numbers[1];
    } else if (isPriceTrigger) {
      triggerValue = numbers[0];
    } else {
      amount = String(numbers[0]);
    }
  }

  if (isAbove) direction = 'above';
  if (isBelow) direction = 'below';

  // Generate name
  const actionWord = isBuy ? 'Buy' : isSell ? 'Sell' : 'Swap';
  const name = `${actionWord} ${tokenOut} ${isPriceTrigger ? `on ${direction === 'below' ? 'Dip' : 'Rise'}` : 'Now'}`;

  return {
    id: 'strat_' + Date.now().toString(36),
    name,
    trigger: {
      type: isPriceTrigger ? 'price' : 'price',
      token: triggerToken,
      direction,
      value: triggerValue
    },
    action: {
      type: 'swap',
      tokenIn,
      tokenOut,
      amount
    },
    confidence: 0.75
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
              {
                role: 'system',
                content: 'Analyze the following price data and provide a brief market signal: BUY, SELL, or HOLD. Include a 1-2 sentence reasoning.'
              },
              {
                role: 'user',
                content: JSON.stringify({ token, prices: priceHistory })
              }
            ]
          })
        });
        return await response.text();
      }
    }
  } catch (error) {
    console.error('Market signal error:', error);
  }

  // Fallback
  const lastPrice = priceHistory[priceHistory.length - 1];
  const firstPrice = priceHistory[0];
  const change = ((lastPrice - firstPrice) / firstPrice) * 100;

  if (change > 5) return `SELL - ${token} has risen ${change.toFixed(1)}%, consider taking profits.`;
  if (change < -5) return `BUY - ${token} has dropped ${Math.abs(change).toFixed(1)}%, potential buying opportunity.`;
  return `HOLD - ${token} is relatively stable with ${change.toFixed(1)}% change.`;
}