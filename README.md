# SentinelSwap 🛡️

**Autonomous DeFi Agent Platform** - Describe your trading strategy in plain English, and let AI execute it automatically.

## 🏆 Hackathon Project

SentinelSwap is an autonomous DeFi agent that lets users create trading strategies using natural language. The AI parses your intent, validates routes via Uniswap, and executes trades automatically when conditions are met.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SentinelSwap                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Frontend  │───▶│   Backend   │───▶│  Uniswap    │         │
│  │   (Next.js) │    │  (Express)  │    │    API      │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│        │                   │                                     │
│        │                   ▼                                     │
│        │           ┌─────────────┐                              │
│        │           │   SQLite    │                              │
│        │           │  Database   │                              │
│        │           └─────────────┘                              │
│        │                   │                                     │
│        ▼                   ▼                                     │
│  ┌─────────────────────────────────────┐                       │
│  │         Autonomous Agent            │                       │
│  │  • Monitors ETH price every 30s     │                       │
│  │  • Evaluates trigger conditions     │                       │
│  │  • Executes swaps via Uniswap       │                       │
│  └─────────────────────────────────────┘                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/sentinelswap.git
cd sentinelswap

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Environment Setup

Create `backend/.env`:
```env
PORT=3001
DATABASE_URL=./sentinelswap.db
```

### Running the Application

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

Open http://localhost:3000 in your browser.

## 💡 How It Works

### 1. Describe Your Strategy
Type your trading strategy in plain English:
- "Buy ETH with 500 USDC when ETH drops below $2,400"
- "Sell 1 ETH when price goes above $3,000"
- "Swap 1000 USDC to ETH at best rate"

### 2. AI Parses Your Intent
The system extracts:
- **Trigger**: Price condition (above/below target)
- **Action**: Swap parameters (tokenIn, tokenOut, amount)
- **Confidence**: How well the AI understood your request

### 3. Review & Deploy
Preview the parsed strategy with estimated route, gas, and price impact. Deploy when satisfied.

### 4. Autonomous Execution
The agent monitors conditions every 30 seconds and executes automatically when triggered.

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework
- **Tailwind CSS** - Styling
- **Lucide Icons** - Icon library

### Backend
- **Express.js** - API server
- **SQLite** - Database (via better-sqlite3)
- **TypeScript** - Type safety

### Integrations
- **Uniswap Trading API** - Price quotes and swap execution
- **0G AI** - Natural language parsing (simulated)

## 📡 API Endpoints

### Strategies
- `POST /api/strategies/parse` - Parse natural language to strategy
- `POST /api/strategies/deploy` - Deploy a strategy
- `GET /api/strategies` - List all strategies
- `PATCH /api/strategies/:id/pause` - Pause strategy
- `PATCH /api/strategies/:id/resume` - Resume strategy
- `DELETE /api/strategies/:id` - Delete strategy
- `POST /api/strategies/:id/execute` - Execute strategy manually

### Market
- `GET /api/price` - Current ETH price
- `GET /api/quote` - Get swap quote

### History
- `GET /api/history` - Transaction history

### Agent
- `GET /api/agent/state` - Agent status
- `POST /api/agent/start` - Start agent
- `POST /api/agent/stop` - Stop agent

## 🎯 Features

- ✅ Natural language strategy creation
- ✅ Real-time ETH price monitoring
- ✅ Uniswap route optimization
- ✅ Autonomous trade execution
- ✅ Transaction history tracking
- ✅ Strategy pause/resume/delete
- ✅ Manual execution option
- ✅ Toast notifications
- ✅ Responsive UI

## 🔮 Future Enhancements

- [ ] Multi-chain support (Arbitrum, Optimism, Base)
- [ ] More trigger types (time-based, volume-based)
- [ ] Portfolio tracking
- [ ] Strategy templates
- [ ] Social sharing of strategies
- [ ] Advanced order types (limit, stop-loss)
- [ ] Integration with more DEXs

## 📝 License

MIT License

## 👥 Team

Built with ❤️ for the Hackathon