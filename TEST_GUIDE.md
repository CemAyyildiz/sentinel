# Sentinel Autonomous Agent Test Guide 🧪

## ✅ Yes, The Project Runs Fully Autonomous!

Sentinel is a DeFi agent that automatically starts when the backend boots up. Here's how to test it:

---

## 🚀 Step 1: Start the Project

### Terminal 1 - Backend
```bash
cd sentinelswap/backend
npm install
npm run dev
```

**Expected output:**
```
🚀 Sentinel Backend running on port 3001
📊 API: http://localhost:3001/api
🤖 Starting Sentinel Agent...
🤖 Agent started! Checking every 30 seconds
```

### Terminal 2 - Frontend
```bash
cd sentinelswap/frontend
npm install
npm run dev
```

**Expected output:**
```
▲ Next.js 14.x
- Local: http://localhost:3000
```

---

## 🧪 Step 2: Check Agent Status

### Check via API
```bash
curl http://localhost:3001/api/agent/state
```

**Expected response:**
```json
{
  "running": true,
  "lastCheck": "2026-05-03T12:33:00.000Z",
  "checksPerformed": 5,
  "strategiesExecuted": 0,
  "activeStrategies": 0
}
```

### Real-time Monitoring via WebSocket
```javascript
// Run in browser console
const ws = new WebSocket('ws://localhost:3001');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('🤖 Agent Activity:', data);
};
```

---

## 📝 Step 3: Create a Strategy

### Via Frontend
1. Go to http://localhost:3000
2. Type the following strategy:
   ```
   Buy ETH with 500 USDC when ETH drops below $2,400
   ```
3. Click "Parse Strategy" button
4. Review the strategy details
5. Click "Deploy Strategy" button

### Via API
```bash
# Parse the strategy
curl -X POST http://localhost:3001/api/strategies/parse \
  -H "Content-Type: application/json" \
  -d '{"text": "Buy ETH with 500 USDC when ETH drops below $2400"}'

# Deploy the strategy (use ID from parse result)
curl -X POST http://localhost:3001/api/strategies/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ETH Dip Buy",
    "trigger_params": {"type": "price", "token": "ETH", "direction": "below", "value": 2400},
    "action_type": "swap",
    "action_params": {"tokenIn": "USDC", "tokenOut": "ETH", "amount": "500"}
  }'
```

---

## 👁️ Step 4: Monitor Agent Activity

### Check Activity Log
```bash
# Get last 20 activities
curl http://localhost:3001/api/agent/activities?limit=20
```

**Expected activities:**
```json
[
  {
    "type": "thinking",
    "message": "Fetching current ETH price from CoinGecko...",
    "timestamp": "2026-05-03T12:33:30.000Z"
  },
  {
    "type": "analysis",
    "message": "ETH price: $2,450",
    "data": {"price": 2450}
  },
  {
    "type": "monitoring",
    "message": "Evaluating 1 active strategies...",
    "data": {"count": 1}
  },
  {
    "type": "analysis",
    "message": "Checking \"ETH Dip Buy\": ETH below $2,400",
    "data": {"currentPrice": 2450, "targetPrice": 2400}
  },
  {
    "type": "monitoring",
    "message": "Condition not met: ETH at $2,450, waiting for below $2,400"
  }
]
```

### Frontend Dashboard
- View real-time activities in the Agent Dashboard panel
- New logs will appear every 30 seconds

---

## ⚡ Step 5: Test Strategy Triggering

### Scenario 1: Simulate Price Drop
You can temporarily modify the `getETHPrice` function to run in test mode:

```typescript
// In sentinelswap/backend/src/services/uniswap.ts
export async function getETHPrice(): Promise<number> {
  // Return low price for testing
  return 2350; // Below $2,400
}
```

**Expected result:**
```
🎯 TRIGGER ACTIVATED! ETH ($2,350) dropped below target ($2,400)
⚡ Executing "ETH Dip Buy"...
✅ Strategy executed successfully! TX: 0x1234...
```

### Scenario 2: Manual Trigger
```bash
curl -X POST http://localhost:3001/api/strategies/{strategyId}/execute
```

---

## 📊 Step 6: Verify Results

### Transaction History
```bash
curl http://localhost:3001/api/history
```

### Strategy Status
```bash
curl http://localhost:3001/api/strategies
```

**Expected status:**
```json
{
  "id": "...",
  "name": "ETH Dip Buy",
  "status": "executed",  // "active" → "executed"
  "executed_at": "2026-05-03T12:34:00.000Z"
}
```

---

## 🔍 Step 7: Real-time Monitoring

### Monitor Agent Logs
You should see the following logs in the backend terminal:

```
🤖 [Agent] Checking 1 active strategies...
🤖 [Agent] ETH price: $2,450
🤖 [Agent] Checking "ETH Dip Buy": ETH below $2,400
🤖 [Agent] Condition not met: ETH at $2,450, waiting for below $2,400

# 30 seconds later...
🤖 [Agent] Checking 1 active strategies...
🤖 [Agent] ETH price: $2,380
🤖 [Agent] 🎯 TRIGGER ACTIVATED! ETH ($2,380) dropped below target ($2,400)
🤖 [Agent] ⚡ Executing "ETH Dip Buy"...
🤖 [Agent] ✅ Strategy executed successfully! TX: 0x1234...
```

---

## 🛠️ Troubleshooting

### Agent Not Running?
```bash
# Check agent status
curl http://localhost:3001/api/agent/state

# Start agent manually
curl -X POST http://localhost:3001/api/agent/start

# Stop agent
curl -X POST http://localhost:3001/api/agent/stop
```

### Price Data Not Loading?
- CoinGecko API may have hit rate limit
- Fallback price: $2,400

### WebSocket Connection Dropping?
- Make sure backend is running
- Check firewall settings

---

## 📈 Performance Metrics

Monitor agent performance:

```bash
curl http://localhost:3001/api/agent/state | jq
```

**Key metrics:**
- `running`: Is the agent running?
- `checksPerformed`: Total number of checks
- `strategiesExecuted`: Number of strategies executed
- `activeStrategies`: Number of active strategies
- `lastCheck`: Last check time

---

## ✅ Test Checklist

- [ ] Backend started successfully
- [ ] Frontend started successfully
- [ ] Agent started automatically
- [ ] Strategy parsed successfully
- [ ] Strategy deployed successfully
- [ ] Agent checks every 30 seconds
- [ ] Price data fetched successfully
- [ ] Strategy condition evaluated
- [ ] Trigger activated (simulation)
- [ ] Swap transaction executed
- [ ] Transaction recorded in history
- [ ] Real-time updates received via WebSocket

---

## 🎯 Conclusion

Yes, Sentinel runs **fully autonomous**!

The agent automatically starts when the backend boots and:
1. Checks active strategies every 30 seconds
2. Fetches live ETH price
3. Evaluates strategy conditions
4. Automatically executes swaps when conditions are met
5. Logs all activities and broadcasts via WebSocket

**No human intervention required!** 🤖