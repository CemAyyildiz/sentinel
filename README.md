# SentinelSwap 🛡️

**Autonomous DeFi Trading Agents Powered by AI**

Describe your trading strategy in plain English. Let intelligent agents execute it on-chain — autonomously, 24/7.

## What is SentinelSwap?

SentinelSwap is an autonomous DeFi agent platform that transforms natural language trading strategies into on-chain execution. Simply describe what you want to trade, and AI-powered agents handle the rest — from parsing your intent to executing swaps on Uniswap V3.

### How It Works

```
You: "Buy 1 ETH with USDC when price drops below $2,400"
                    ↓
         🧠 Architect Agent parses intent
                    ↓
         📊 Monitor Agent watches price
                    ↓
         ⚡ Executor Agent triggers swap
                    ↓
            ✅ Trade executed
```

## Features

- **Natural Language Strategies** — No code required. Describe trades in plain English.
- **Multi-Agent System** — Specialized agents (Architect, Monitor, Executor) collaborate autonomously.
- **Real-Time Execution** — KeeperHub integration ensures 24/7 monitoring and reliable execution.
- **Persistent Memory** — Agent state and strategies stored on 0G Storage for continuity.
- **Agent Tokenization** — Mint agents as iNFTs (ERC-7857) with embedded intelligence.
- **ENS Identity** — Agent discovery and reputation via `.eth` domains.
- **Live Dashboard** — Real-time activity feed with WebSocket updates.

## Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
git clone https://github.com/your-username/sentinelswap.git
cd sentinelswap

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Run

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                    │
│           Dashboard • Strategy Builder • Feed           │
└───────────────────────────┬─────────────────────────────┘
                            │ WebSocket
┌───────────────────────────┴─────────────────────────────┐
│              Multi-Agent Swarm System                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Architect   │  │   Monitor   │  │  Executor   │     │
│  │ 🏗️ Parse    │  │ 📊 Watch    │  │ ⚡ Execute  │     │
│  │   & Validate│  │   & Trigger │  │   & Optimize│     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────┐
│                  0G Storage (Memory)                    │
│          Agent State • Strategies • History             │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────┐
│   Uniswap V3  │  KeeperHub  │  ENS  │  iNFT (ERC-7857) │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, Tailwind CSS, TypeScript |
| Backend | Express.js, SQLite, ethers.js v6 |
| AI | 0G Compute Network (inference) |
| Storage | 0G Storage (KV + Log) |
| DeFi | Uniswap V3 Router |
| Execution | KeeperHub (MCP) |
| Identity | ENS (.eth domains) |
| Tokenization | iNFT (ERC-7857) |

## API Overview

### Strategies
```
POST   /api/strategies/parse     Parse natural language
POST   /api/strategies/deploy    Deploy strategy
GET    /api/strategies           List all strategies
DELETE /api/strategies/:id       Remove strategy
```

### Agent Swarm
```
POST   /api/swarm/initialize     Start multi-agent system
GET    /api/swarm/state          Real-time coordination state
POST   /api/swarm/parse-strategy Architect parses intent
POST   /api/swarm/execute-trade  Executor runs swap
```

### Market & History
```
GET    /api/price                Current ETH price
GET    /api/quote                Swap quote
GET    /api/history              Transaction history
```

## Example Usage

**Input:**
```
"Swap 0.5 ETH to USDC when ETH hits $3,000, max 0.5% slippage"
```

**What happens:**
1. Architect parses trigger condition + swap params
2. Validates route on Uniswap V3
3. Stores strategy in 0G Storage
4. Monitor watches ETH price via oracle
5. When $3,000 hit → Executor triggers swap
6. Transaction confirmed on-chain

## Project Structure

```
sentinelswap/
├── backend/
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Core logic
│   │   │   ├── agent.ts     # Agent orchestration
│   │   │   ├── swarm.ts     # Multi-agent coordination
│   │   │   ├── uniswap.ts   # Swap execution
│   │   │   ├── ens.ts       # ENS resolution
│   │   │   └── iNFT.ts      # Agent tokenization
│   │   └── types/           # TypeScript definitions
│   └── api/                 # Vercel deployment
├── frontend/
│   └── src/
│       ├── app/             # Next.js pages
│       └── components/      # React components
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## License

MIT License — see [LICENSE](LICENSE) for details.

---

**Built with ❤️**