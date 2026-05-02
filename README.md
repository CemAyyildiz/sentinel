# SentinelSwap 🛡️

**Autonomous DeFi Agent powered by 0G AI**

SentinelSwap is an AI-powered DeFi strategy platform that lets you create autonomous trading strategies using natural language. The system parses your intent, estimates routes via Uniswap, and deploys strategies as on-chain agents that execute automatically when conditions are met.

## 🚀 Features

- **Natural Language Strategies**: Describe your trading strategy in plain English or Turkish
- **AI-Powered Parsing**: 0G AI parses your intent into executable parameters
- **Real-Time Monitoring**: Autonomous agent checks conditions every 30 seconds
- **Auto-Execution**: Strategies execute automatically when trigger conditions are met
- **Multi-Action Support**: Swap, AAVE deposit/withdraw, and combined strategies
- **Uniswap Integration**: Real-time quotes and swap execution
- **AAVE Integration**: Lending and borrowing positions
- **Beautiful UI**: Modern dark theme with real-time updates

## 🏗️ Architecture

```
sentinelswap/
├── backend/           # Express.js API server
│   └── src/
│       ├── routes/    # API endpoints
│       ├── services/  # Business logic
│       └── types/     # TypeScript types
├── frontend/          # Next.js 14 app
│   └── src/app/       # React components
└── .env               # Environment config
```

### Backend Services

- **agent.ts**: Autonomous agent that monitors and executes strategies
- **database.ts**: SQLite-based strategy and transaction storage
- **uniswap.ts**: Uniswap API integration for quotes and swaps
- **aave.ts**: AAVE protocol integration for lending
- **zeroG.ts**: 0G AI integration for strategy parsing
- **keeperHub.ts**: Keeper network for on-chain automation

### Frontend

- **Next.js 14** with App Router
- **Tailwind CSS** for styling
- **Real-time updates** with auto-refresh
- **Wallet connection** via MetaMask

## 🛠️ Setup

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
cd sentinelswap

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Configure environment
cp ../.env.example ../.env
# Edit .env with your API keys
```

### Running

```bash
# Start backend (from backend/)
npm run dev

# Start frontend (from frontend/)
npm run dev
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## 📡 API Endpoints

### Strategies
- `GET /api/strategies` - List all strategies
- `POST /api/strategies/parse` - Parse natural language strategy
- `POST /api/strategies/deploy` - Deploy a strategy
- `PATCH /api/strategies/:id/pause` - Pause a strategy
- `PATCH /api/strategies/:id/resume` - Resume a strategy
- `DELETE /api/strategies/:id` - Delete a strategy
- `POST /api/strategies/:id/execute` - Execute strategy manually

### Agent
- `GET /api/agent/status` - Get agent status
- `POST /api/agent/start` - Start the agent
- `POST /api/agent/stop` - Stop the agent

### Market
- `GET /api/price` - Current ETH price
- `GET /api/pools` - Available liquidity pools

### History
- `GET /api/history` - Transaction history

## 🤖 How the Agent Works

1. **Monitoring**: Agent checks active strategies every 30 seconds
2. **Price Check**: Fetches current ETH price (with fallback)
3. **Evaluation**: Compares current price against strategy triggers
4. **Execution**: When conditions are met, executes the strategy action
5. **Recording**: Logs transaction and updates strategy status

### Supported Actions

- **swap**: Token swap via Uniswap
- **deposit**: Deposit to AAVE lending pool
- **withdraw**: Withdraw from AAVE position
- **swap_and_deposit**: Swap then deposit to AAVE
- **withdraw_and_swap**: Withdraw from AAVE then swap

## 🎯 Example Strategies

```
"Buy ETH with 500 USDC when ETH drops below $2,400"
"Sell 1 ETH when price goes above $3,000"
"ETH düşünce sat, AAVE yatır"
"ETH $3000 gelirse AAVE çek, ETH al"
"USDC yatır AAVE'ye"
```

## 🔧 Tech Stack

- **Backend**: Express.js, TypeScript, SQLite
- **Frontend**: Next.js 14, React, Tailwind CSS
- **AI**: 0G Network for strategy parsing
- **DeFi**: Uniswap V4, AAVE V3
- **Chain**: Ethereum Sepolia (testnet)

## 📝 License

MIT

## 🏆 Hackathon

Built for the 0G AI Hackathon. SentinelSwap demonstrates how AI agents can autonomously manage DeFi strategies, making complex trading accessible through natural language.