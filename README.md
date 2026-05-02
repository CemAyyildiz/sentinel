# 🛡️ SentinelSwap

**AI-Powered Autonomous DeFi Agent on Ethereum Sepolia**

Describe your trading strategy in plain English → AI parses it → Deploys as an autonomous on-chain agent.

## 🚀 Features

- **Natural Language Strategies**: "Buy ETH with 500 USDC when ETH drops below $2,400"
- **AI Strategy Parsing**: 0G AI converts text to structured DeFi actions
- **Uniswap V3 Integration**: Real-time quotes and swap execution
- **AAVE V3 Lending**: Deposit/withdraw assets to earn yield
- **Multi-Step Strategies**: Complex strategies like "swap then deposit"
- **Turkish Language Support**: "ETH düşünce sat, AAVE yatır"
- **Autonomous Execution**: KeeperHub monitors and executes when conditions are met
- **Real-time Dashboard**: Track strategies, transactions, and ETH price

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, Tailwind CSS, TypeScript |
| Backend | Node.js, Express, TypeScript |
| AI | 0G Compute Network |
| DEX | Uniswap V3 (Sepolia) |
| Lending | AAVE V3 (Sepolia) |
| Automation | KeeperHub / Gelato |
| Network | Ethereum Sepolia |

## 📦 Installation

```bash
cd sentinelswap
cd backend && npm install
cd ../frontend && npm install
cp ../.env.example ../.env
cd ../backend && npm run dev
cd ../frontend && npm run dev
```

## 📝 Example Strategies

- "Buy ETH with 500 USDC when ETH drops below $2,400"
- "ETH düşünce sat, AAVE yatır"
- "ETH $3000 gelirse AAVE çek, ETH al"
- "USDC yatır AAVE'ye"

## 🏆 Hackathon Highlights

1. Real AI Integration (0G Compute)
2. Multi-Protocol (Uniswap V3 + AAVE V3)
3. Autonomous Execution (KeeperHub)
4. Multi-Step Strategies
5. Turkish Language Support