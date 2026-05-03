import { ethers, Wallet } from 'ethers';
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

Only output valid JSON. No explanation.`;

// Sepolia RPC provider
const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';

export async function parseStrategy(prompt: string, agentPrivateKey?: string): Promise<ExtendedParsedStrategy> {
  // Try 0G if agent has private key
  if (agentPrivateKey) {
    try {
      const result = await parseWithZG(prompt, agentPrivateKey);
      if (result) return result;
    } catch (error) {
      console.error('0G parse error:', error);
    }
  }

  // Fallback to rule-based parsing
  return parseWithRules(prompt);
}

async function parseWithZG(prompt: string, privateKey: string): Promise<ExtendedParsedStrategy | null> {
  try {
    const { createZGComputeNetworkBroker } = await import('@0glabs/0g-serving-broker');
    
    // Create ethers Wallet from private key (0G requires Wallet signer)
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    const wallet = new Wallet(privateKey, provider);
    
    // Initialize 0G broker with wallet signer
    const broker = await createZGComputeNetworkBroker(wallet);
    
    // List available AI services
    const services = await broker.inference.listService();
    if (!services || services.length === 0) {
      console.log('No 0G services available');
      return null;
    }

    const service = services[0] as any;
    const providerAddress = service.provider;
    
    // Get service metadata (endpoint + model)
    const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);
    
    // Get billing headers for this request
    const content = `${ZG_SYSTEM_PROMPT}\n\nUser: ${prompt}`;
    const headers = await broker.inference.getRequestHeaders(providerAddress, content);
    
    // Call 0G AI inference
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: ZG_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        model: model,
      })
    });

    const result: any = await response.json();
    const aiContent = result.choices?.[0]?.message?.content;
    
    if (!aiContent) {
      console.error('0G returned empty response');
      return null;
    }
    
    // Parse AI response
    const parsed = JSON.parse(aiContent);
    
    // Process response to settle fee with 0G
    await broker.inference.processResponse(providerAddress, aiContent, result.id);
    
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

  let triggerType: 'price' | 'time' | 'apr' | 'ai_signal' = 'price';
  let triggerToken = 'ETH';
  let triggerDirection: 'above' | 'below' = 'below';
  let triggerValue = 2400;
  let actionType = 'swap';
  let tokenIn = 'USDC';
  let tokenOut = 'ETH';
  let amount = '500';
  const steps: StrategyStep[] = [];
  let name = '';

  // Check for APR trigger (alert, NOT swap)
  if (lower.includes('apr') || lower.includes('yield') || lower.includes('pool')) {
    if (!lower.includes('buy') && !lower.includes('sell') && !lower.includes('swap')) {
      triggerType = 'apr';
      const aprMatch = prompt.match(/(\d+(?:\.\d+)?)\s*%/);
      if (aprMatch) {
        triggerValue = parseFloat(aprMatch[1]);
      } else {
        triggerValue = 20;
      }
      triggerDirection = lower.includes('exceed') || lower.includes('above') || lower.includes('over') ? 'above' : 'below';
      
      const poolMatch = prompt.match(/(\w+)\/(\w+)/i);
      if (poolMatch) {
        triggerToken = `${poolMatch[1]}/${poolMatch[2]}`;
      }
      
      actionType = 'alert';
      tokenIn = null as any;
      tokenOut = null as any;
      amount = null as any;
      name = `Alert: ${triggerToken} APR ${triggerDirection} ${triggerValue}%`;
    }
  }
  else if (lower.includes('buy') || lower.includes('al')) {
    const amountMatch = prompt.match(/(\d[\d,]*(?:\.\d+)?)\s*(USDC|USDT|DAI|ETH)/i);
    if (amountMatch) {
      amount = amountMatch[1].replace(/,/g, '');
      tokenIn = amountMatch[2].toUpperCase();
    }
    
    const buyMatch = prompt.match(/buy\s+(\w+)/i);
    if (buyMatch) {
      tokenOut = buyMatch[1].toUpperCase();
    }
    
    actionType = 'swap';
    name = `Buy ${tokenOut} with ${amount} ${tokenIn}`;
    steps.push({ type: 'swap', tokenIn, tokenOut, amount });
  }
  else if (lower.includes('sell') || lower.includes('sat')) {
    const amountMatch = prompt.match(/(\d[\d,]*(?:\.\d+)?)\s*(ETH|USDC|USDT|DAI)/i);
    if (amountMatch) {
      amount = amountMatch[1].replace(/,/g, '');
      tokenIn = amountMatch[2].toUpperCase();
    }
    
    const sellMatch = prompt.match(/sell\s+(\d[\d,]*(?:\.\d+)?)?\s*(\w+)/i);
    if (sellMatch && !amountMatch) {
      amount = sellMatch[1] || '1';
      tokenIn = sellMatch[2].toUpperCase();
    }
    
    tokenOut = 'USDC';
    actionType = 'swap';
    name = `Sell ${amount} ${tokenIn} for ${tokenOut}`;
    steps.push({ type: 'swap', tokenIn, tokenOut, amount });
  }
  else if (lower.includes('swap') || lower.includes('convert') || lower.includes('çevir')) {
    const amountMatch = prompt.match(/(\d[\d,]*(?:\.\d+)?)\s*(ETH|USDC|USDT|DAI|WBTC)/i);
    if (amountMatch) {
      amount = amountMatch[1].replace(/,/g, '');
      tokenIn = amountMatch[2].toUpperCase();
    }
    
    const toMatch = prompt.match(/to\s+(\w+)/i);
    if (toMatch) {
      tokenOut = toMatch[1].toUpperCase();
    }
    
    actionType = 'swap';
    name = `Swap ${amount} ${tokenIn} → ${tokenOut}`;
    steps.push({ type: 'swap', tokenIn, tokenOut, amount });
  }
  else if (lower.includes('deposit') || lower.includes('yatır') || lower.includes('lend')) {
    const assetMatch = prompt.match(/(\d[\d,]*(?:\.\d+)?)\s*(ETH|USDC|USDT|DAI|WBTC|AAVE)/i);
    if (assetMatch) {
      amount = assetMatch[1].replace(/,/g, '');
      tokenIn = assetMatch[2].toUpperCase();
    }
    
    actionType = 'deposit';
    tokenOut = tokenIn;
    name = `Deposit ${amount} ${tokenIn} to AAVE`;
    steps.push({ type: 'deposit', asset: tokenIn, protocol: 'aave' });
  }
  else if (lower.includes('withdraw') || lower.includes('çek') || lower.includes('redeem')) {
    const assetMatch = prompt.match(/(\d[\d,]*(?:\.\d+)?)\s*(ETH|USDC|USDT|DAI|WBTC|AAVE)/i);
    if (assetMatch) {
      amount = assetMatch[1].replace(/,/g, '');
      tokenIn = assetMatch[2].toUpperCase();
    }
    
    actionType = 'withdraw';
    tokenOut = tokenIn;
    name = `Withdraw ${amount} ${tokenIn} from AAVE`;
    steps.push({ type: 'withdraw', asset: tokenIn, protocol: 'aave' });
  }
  else if ((lower.includes('sat') || lower.includes('sell')) && lower.includes('yatır')) {
    actionType = 'swap_and_deposit';
    tokenIn = 'ETH';
    tokenOut = 'AAVE';
    amount = '1';
    name = 'Sell ETH & Deposit AAVE';
    steps.push({ type: 'swap', tokenIn: 'ETH', tokenOut: 'USDC', amount: '1' });
    steps.push({ type: 'deposit', asset: 'AAVE', protocol: 'aave' });
  }
  else if (lower.includes('çek') && (lower.includes('al') || lower.includes('buy'))) {
    actionType = 'withdraw_and_swap';
    tokenIn = 'AAVE';
    tokenOut = 'ETH';
    amount = '1';
    name = 'Withdraw AAVE & Buy ETH';
    steps.push({ type: 'withdraw', asset: 'AAVE', protocol: 'aave' });
    steps.push({ type: 'swap', tokenIn: 'AAVE', tokenOut: 'ETH', amount: '1' });
  }
  else {
    const amountMatch = prompt.match(/(\d[\d,]*(?:\.\d+)?)\s*(ETH|USDC|USDT|DAI|WBTC)/i);
    if (amountMatch) {
      amount = amountMatch[1].replace(/,/g, '');
      tokenIn = amountMatch[2].toUpperCase();
    }
    
    if (lower.includes('to') || lower.includes('→')) {
      const toMatch = prompt.match(/(?:to|→)\s*(\w+)/i);
      if (toMatch) {
        tokenOut = toMatch[1].toUpperCase();
      }
    }
    
    actionType = 'swap';
    name = `Swap ${amount} ${tokenIn} → ${tokenOut}`;
    steps.push({ type: 'swap', tokenIn, tokenOut, amount });
  }

  const priceMatch = prompt.match(/\$(\d[\d,]*(?:\.\d+)?)/);
  if (priceMatch) {
    triggerValue = parseFloat(priceMatch[1].replace(/,/g, ''));
  }

  if (lower.includes('above') || lower.includes('gelirse') || lower.includes('rises') || lower.includes('goes up') || lower.includes('exceed')) {
    triggerDirection = 'above';
  }
  if (lower.includes('below') || lower.includes('düşünce') || lower.includes('drops') || lower.includes('düşerse')) {
    triggerDirection = 'below';
  }

  const tokenMatch = prompt.match(/(ETH|BTC|USDC|USDT|DAI|AAVE|WBTC)/i);
  if (tokenMatch && triggerType === 'price') {
    triggerToken = tokenMatch[1].toUpperCase();
  }
  
  if ((lower.includes('alert me') || lower.includes('notify me') || lower.includes('tell me when')) && actionType === 'swap') {
    if (!lower.includes('buy') && !lower.includes('sell') && !lower.includes('swap')) {
      actionType = 'alert';
      tokenIn = null as any;
      tokenOut = null as any;
      amount = null as any;
      name = `Alert: ${triggerToken} ${triggerType} ${triggerDirection} ${triggerValue}`;
    }
  }

  if (!name) {
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
  }

  return {
    id: 'strat_' + Date.now().toString(36),
    name,
    trigger: {
      type: triggerType,
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

export async function getMarketSignal(token: string, priceHistory: number[], agentPrivateKey?: string): Promise<string> {
  // Try 0G if agent has private key
  if (agentPrivateKey) {
    try {
      const { createZGComputeNetworkBroker } = await import('@0glabs/0g-serving-broker');
      
      const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
      const wallet = new Wallet(agentPrivateKey, provider);
      const broker = await createZGComputeNetworkBroker(wallet);
      
      const services = await broker.inference.listService();

      if (services && services.length > 0) {
        const svc = services[0] as any;
        const providerAddress = svc.provider;
        const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);
        
        const content = `Analyze price data for ${token}: ${JSON.stringify(priceHistory)}`;
        const headers = await broker.inference.getRequestHeaders(providerAddress, content);
        
        const response = await fetch(`${endpoint}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: 'Analyze the following price data and provide a brief market signal: BUY, SELL, or HOLD. Include a 1-2 sentence reasoning.' },
              { role: 'user', content: JSON.stringify({ token, prices: priceHistory }) }
            ],
            model: model,
          })
        });
        
        const result: any = await response.json();
        const aiContent = result.choices?.[0]?.message?.content;
        
        if (aiContent) {
          await broker.inference.processResponse(providerAddress, aiContent, result.id);
          return aiContent;
        }
      }
    } catch (error) {
      console.error('0G market signal error:', error);
    }
  }

  // Fallback to simple analysis
  const lastPrice = priceHistory[priceHistory.length - 1];
  const firstPrice = priceHistory[0];
  const change = ((lastPrice - firstPrice) / firstPrice) * 100;

  if (change > 5) return `SELL - ${token} has risen ${change.toFixed(1)}%, consider taking profits.`;
  if (change < -5) return `BUY - ${token} has dropped ${Math.abs(change).toFixed(1)}%, potential buying opportunity.`;
  return `HOLD - ${token} is relatively stable with ${change.toFixed(1)}% change.`;
}