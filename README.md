# 🛡️ SentinelSwap

**Autonomous DeFi Strategy Agent** — AI-powered trading strategies on Uniswap via natural language.

> Hackathon Project: 0G AI × Uniswap × KeeperHub

---

## 🎯 What is SentinelSwap?

SentinelSwap lets you describe DeFi trading strategies in **plain English**. Our AI parses your intent, estimates swap routes via Uniswap, and deploys an autonomous on-chain agent that executes when conditions are met.

### Example Prompts

```
"Buy ETH with 500 USDC when ETH drops below $2,400"
"Sell 1 ETH when price goes above $3,000"
"Swap 100 USDC to ETH at best rate"
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    SentinelSwap                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐  │
│  │ Frontend │───▶│ Backend  │───▶│  0G Compute AI   │  │
│  │ Next.js  │    │ Express  │    │  (Strategy Parse) │  │
│  └──────────┘    └──────────┘    └──────────────────┘  │
│       │              │                                   │
│       │              ▼                                   │
│       │         ┌──────────┐    ┌──────────────────┐   │
│       │         │ SQLite   │    │  Uniswap API     │   │
│       │         │ (Storage)│    │  (Quote & Swap)  │   │
│       │         └──────────┘    └──────────────────┘   │
│       │              │                                   │
│       │              ▼                                   │
│       │         ┌──────────┐    ┌──────────────────┐   │
│       └────────▶│ KeeperHub│───▶│  On-Chain Agent   │   │
│                 │ (Trigger)│    │  (Execution)     │   │
│                 └──────────┘    └──────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Flow

1. **User** enters a natural language strategy
2. **0G AI** parses it into structured trigger/action
3. **Uniswap API** estimates the swap route
4. **User** deploys the strategy
5. **KeeperHub** monitors trigger conditions
6. **On-chain agent** executes the swap when triggered

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm

### 1. Clone & Install

```bash
cd sentinelswap

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your keys
```

### 3. Run

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
sentinelswap/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Express server
│   │   ├── types/index.ts    # TypeScript types
│   │   ├── routes/
│   │   │   ├── strategies.ts # Strategy CRUD + deploy
│   │   │   ├── history.ts    # Transaction history
│   │   │   └── market.ts     # Price & quote APIs
│   │   └── services/
│   │       ├── database.ts   # SQLite operations
│   │       ├── uniswap.ts    # Uniswap API client
│   │       ├── zeroG.ts      # 0G AI integration
│   │       └── keeperHub.ts  # KeeperHub integration
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/app/
│   │   ├── page.tsx          # Main UI
│   │   ├── layout.tsx        # Root layout
│   │   └── globals.css       # Tailwind styles
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── next.config.js
│
├── .env.example
├── .gitignore
└── README.md
```

---

## 🔌 Integrations

### 0G Compute Network
- Strategy parsing from natural language
- Market signal analysis
- Fallback rule-based parser for development

### Uniswap Trading API
- Real-time quote estimation
- Swap execution on Sepolia testnet
- Pool data and price feeds

### KeeperHub
- Autonomous trigger monitoring
- On-chain agent deployment
- Task lifecycle management

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Backend | Express.js, TypeScript |
| Database | SQLite (better-sqlite3) |
| AI | 0G Compute Network |
| DEX | Uniswap v3 (Sepolia) |
| Automation | KeeperHub |

---

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/strategies/parse` | Parse natural language strategy |
| POST | `/api/strategies/deploy` | Deploy strategy to KeeperHub |
| GET | `/api/strategies` | List all strategies |
| GET | `/api/strategies/:id` | Get strategy details |
| PATCH | `/api/strategies/:id/pause` | Pause strategy |
| PATCH | `/api/strategies/:id/resume` | Resume strategy |
| DELETE | `/api/strategies/:id` | Delete strategy |
| POST | `/api/strategies/:id/execute` | Manual execution |
| GET | `/api/history` | Transaction history |
| GET | `/api/quote` | Get swap quote |
| GET | `/api/price` | Get ETH price |
| GET | `/api/health` | Health check |

---

## 🎨 Screenshots

### Create Strategy
Enter your trading strategy in plain English and let AI parse it.

### My Strategies
Manage your deployed strategies - pause, resume, or execute manually.

### Transaction History
Track all executed swaps with gas usage and status.

---

## 📝 License

MIT

---

## 🏆 Built for Hackathon

SentinelSwap demonstrates the power of combining:
- **0G AI** for intelligent strategy parsing
- **Uniswap** for decentralized trading
- **KeeperHub** for autonomous execution

Making DeFi accessible through natural language. 🚀