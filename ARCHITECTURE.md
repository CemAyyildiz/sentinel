# Sentinel Architecture & Design Docs

## System Architecture Diagrams

### 1. High-Level System Architecture

```mermaid
graph TB
    subgraph Client["Frontend Layer"]
        UI["React/Next.js UI<br/>Agent Dashboard"]
        WS["WebSocket Client<br/>Real-time Updates"]
    end
    
    subgraph API["Backend API Layer"]
        REST["Express.js REST API"]
        WS_SERVER["WebSocket Server<br/>Activity Feed"]
    end
    
    subgraph Agents["Multi-Agent Layer"]
        ARCH["Architect Agent 🏗️<br/>Strategy Parser"]
        EXEC["Executor Agent ⚙️<br/>Trade Execution"]
        MON["Monitor Agent 📊<br/>Price Watcher"]
    end
    
    subgraph Storage["Persistent Memory"]
        ZG["0G Storage KV<br/>Agent State & History"]
    end
    
    subgraph Blockchain["On-Chain Infrastructure"]
        UNI["Uniswap V3<br/>Swap Router"]
        INFT["iNFT Contract<br/>ERC-7857 Agents"]
        ENS["ENS Registry<br/>Agent Identity"]
        ZG_CHAIN["0G Chain<br/>EVM-Compatible"]
    end
    
    subgraph External["External Services"]
        KEEPER["KeeperHub MCP<br/>Execution Layer"]
        ZG_COMPUTE["0G Compute<br/>Inference"]
    end
    
    UI -->|HTTP| REST
    UI -->|WebSocket| WS_SERVER
    REST -->|manages| Agents
    Agents -->|read/write| ZG
    Agents -->|execute| UNI
    Agents -->|mint| INFT
    Agents -->|resolve| ENS
    REST -->|broadcasts| WS_SERVER
    Agents -->|reliable execution| KEEPER
    ARCH -->|inference| ZG_COMPUTE
    REST -->|query| Blockchain
```

### 2. Multi-Agent Swarm Coordination

```mermaid
graph LR
    USER["User Strategy<br/>Natural Language"]
    
    USER -->|"parse request"| ARCH["Architect Agent 🏗️"]
    
    ARCH -->|"validate & store"| ZG_STORAGE["0G Storage KV<br/>Strategy Memory"]
    
    ARCH -->|"parsed plan"| EXEC["Executor Agent ⚙️"]
    ARCH -->|"watch conditions"| MON["Monitor Agent 📊"]
    
    MON -->|"condition met"| EXEC
    
    EXEC -->|"execute trade"| KEEPER["KeeperHub<br/>Reliable Execution"]
    
    KEEPER -->|"swap on"| UNI["Uniswap V3<br/>Liquidity"]
    
    EXEC -->|"store result"| ZG_STORAGE
    MON -->|"log activity"| ZG_STORAGE
    
    ZG_STORAGE -->|"agents read state"| ARCH
    ZG_STORAGE -->|"agents read state"| EXEC
    ZG_STORAGE -->|"agents read state"| MON
```

### 3. Data Flow: Strategy to Execution

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Backend as Backend API
    participant Architect as Architect Agent
    participant ZGStorage as 0G Storage
    participant Monitor as Monitor Agent
    participant Executor as Executor Agent
    participant KeeperHub
    participant Uniswap
    
    User->>Frontend: Input strategy text
    Frontend->>Backend: POST /api/swarm/parse-strategy
    
    Backend->>Architect: Parse strategy
    Architect->>Architect: Extract conditions<br/>Validate routes
    Architect->>ZGStorage: Store strategy plan
    Architect->>Backend: Return parsed plan
    
    Backend->>Frontend: Display strategy preview
    Frontend->>User: Show gas/slippage estimates
    
    User->>Frontend: Deploy strategy
    Frontend->>Backend: POST /api/swarm/monitor
    
    loop Every 30 seconds
        Backend->>Monitor: Check trigger condition
        Monitor->>ZGStorage: Read price history
        Monitor->>Uniswap: Quote current price
        
        alt Condition Met
            Monitor->>Backend: Condition triggered!
            Backend->>Executor: Execute trade
            
            Executor->>KeeperHub: Send swap request
            KeeperHub->>Uniswap: Execute with protection
            Uniswap-->>KeeperHub: TX hash
            KeeperHub-->>Executor: Confirmed
            
            Executor->>ZGStorage: Store TX result
            Executor->>Backend: Trade complete
            Backend->>Frontend: WebSocket: trade event
            Frontend->>User: Notification + TX link
        end
    end
```

### 4. Agent Lifecycle & iNFT Tokenization

```mermaid
graph LR
    A["Agent<br/>Initialized"] 
    B["Registered in<br/>Swarm"]
    C["Memory<br/>on 0G"]
    D["Minted as<br/>iNFT"]
    E["ENS Domain<br/>Assigned"]
    F["Active in<br/>Swarm"]
    G["Execution<br/>History"]
    H["Update<br/>via iNFT"]
    
    A -->|register| B
    B -->|persist state| C
    C -->|tokenize| D
    D -->|identity| E
    E -->|coordinate| F
    F -->|execute trades| G
    G -->|dynamic upgrade| H
    H -->|evolve| F
    
    style A fill:#e1f5ff
    style D fill:#fff3e0
    style E fill:#f3e5f5
    style F fill:#e8f5e9
```

### 5. ENS Agent Discovery Network

```mermaid
graph TB
    subgraph Swarm["Agent Swarm"]
        A1["Architect Agent"]
        E1["Executor Agent"]
        M1["Monitor Agent"]
    end
    
    subgraph ENS["ENS Domain Registry"]
        D1["architect.sentinelswap.eth"]
        D2["executor.sentinelswap.eth"]
        D3["monitor.sentinelswap.eth"]
    end
    
    subgraph Metadata["ENS Text Records"]
        M1T["agent-id: arch-001"]
        M2T["agent-role: architect"]
        M3T["capabilities: parsing,..."]
        M4T["memory-pointer: zg://..."]
    end
    
    A1 -->|registers| D1
    E1 -->|registers| D2
    M1 -->|registers| D3
    
    D1 -->|stores| M1T
    D1 -->|stores| M2T
    D1 -->|stores| M3T
    D1 -->|stores| M4T
    
    D2 -->|stores| M1T
    D3 -->|stores| M1T
    
    Frontend["Frontend App"] -->|resolves| D1
    Frontend -->|queries| D2
    Frontend -->|discovers| D3
    
    OtherAgent["Other Agents"] -->|discover| D1
    OtherAgent -->|coordinate| D2
```

### 6. 0G Storage: Persistent Memory Architecture

```mermaid
graph TB
    subgraph "0G Storage (KV + Log)"
        KV["Key-Value Store<br/>Current State"]
        LOG["Append Log<br/>History"]
    end
    
    subgraph "Agent Memory"
        A1_MEM["Agent 1<br/>agent:arch-001:memory"]
        A1_STRAT["Strategies<br/>agent:arch-001:strategy:*"]
        A1_EXEC["Execution<br/>agent:arch-001:execution:*"]
        A1_ACT["Activities<br/>activity:arch-001:*"]
    end
    
    subgraph "Shared State"
        SWARM_STATE["Swarm State<br/>swarm:coordination"]
        STRATEGIES["All Strategies<br/>strategies:*"]
    end
    
    KV -->|stores| A1_MEM
    KV -->|stores| A1_STRAT
    KV -->|stores| A1_EXEC
    KV -->|stores| SWARM_STATE
    
    LOG -->|logs| A1_ACT
    LOG -->|logs| STRATEGIES
    
    Architect["Architect Agent"] -->|read| A1_MEM
    Architect -->|write| A1_STRAT
    Executor["Executor Agent"] -->|read| A1_STRAT
    Executor -->|write| A1_EXEC
    Monitor["Monitor Agent"] -->|read| SWARM_STATE
    Monitor -->|write| A1_ACT
```

### 7. KeeperHub Integration: Reliable Execution

```mermaid
graph LR
    Executor["Executor Agent<br/>sends request"]
    MCP["KeeperHub MCP<br/>Server"]
    KH_API["KeeperHub<br/>API"]
    RELAY["Keeper Network<br/>Relay"]
    BLOCKCHAIN["Blockchain<br/>RPC"]
    
    Executor -->|"execute(plan)"| MCP
    MCP -->|"broadcast"| KH_API
    KH_API -->|"route to reliable keeper"| RELAY
    RELAY -->|"with retry logic"| BLOCKCHAIN
    RELAY -->|"gas optimization"| BLOCKCHAIN
    RELAY -->|"MEV protection"| BLOCKCHAIN
    
    BLOCKCHAIN -->|"confirmation"| RELAY
    RELAY -->|"audit trail"| KH_API
    KH_API -->|"MCP response"| MCP
    MCP -->|"result"| Executor
    
    style Executor fill:#e8f5e9
    style MCP fill:#fff3e0
    style KH_API fill:#f3e5f5
    style RELAY fill:#e1f5ff
```

### 8. Uniswap V3 Integration Path

```mermaid
graph TB
    subgraph "Agent Decision"
        PLAN["Strategy Plan<br/>from Architect"]
        QUOTE["Quote Best Route"]
    end
    
    subgraph "Uniswap Smart Contracts"
        QUOTER["Quoter V2<br/>View Estimates"]
        ROUTER["Swap Router 02<br/>Execute Trades"]
    end
    
    subgraph "Onchain State"
        POOLS["Uniswap V3 Pools<br/>with liquidity"]
        BALANCES["Token Balances<br/>WETH, USDC, etc."]
    end
    
    PLAN -->|"get quote"| QUOTER
    QUOTER -->|"check liquidity"| POOLS
    QUOTER -->|"price + slippage"| QUOTE
    
    QUOTE -->|"execute swap"| ROUTER
    ROUTER -->|"transfer tokens"| BALANCES
    ROUTER -->|"call pool"| POOLS
    POOLS -->|"update state"| BALANCES
    
    ROUTER -->|"emit event"| LOGS["Transaction Logs<br/>Executor stores"]
```

---

## Agent State Management

### Agent State Schema

```typescript
interface AgentMemory {
  agentId: string;
  role: 'architect' | 'executor' | 'monitor';
  
  // Persistent state
  strategies: Map<strategyId, StrategyPlan>;
  executionHistory: Execution[];
  coordinationState: SwarmState;
  
  // Metadata
  createdAt: number;
  lastUpdated: number;
  metadata: AgentMetadata;
}

interface StrategyPlan {
  id: string;
  parsed: ParsedIntent;
  route: Route[];
  gasEstimate: string;
  priceImpact: string;
  validated: boolean;
  validatedBy: string; // architect agent id
}

interface Execution {
  txHash: string;
  strategyId: string;
  result: TradeResult;
  timestamp: number;
  executor: string; // executor agent id
}
```

---

## Communication Protocol

### Agent-to-Agent Communication

**Via 0G Storage (async):**
- Architect writes strategy → Executor reads strategy
- Executor writes execution result → Monitor reads result
- Monitor logs condition → Architect reads for next iteration

**Via WebSocket (real-time):**
- Backend broadcasts execution events to frontend
- Frontend updates UI in real-time
- Swarm coordination state published every 30 seconds

---

## Security Model

### On-Chain Safety
- ✅ Smart contract audited patterns (Uniswap)
- ✅ Slippage protection enforced
- ✅ MEV protection via KeeperHub
- ✅ Non-custodial: agents don't hold funds

### Off-Chain Security
- ✅ Strategy encrypted in 0G Storage
- ✅ iNFT access control via ownership
- ✅ ENS text records immutable by default
- ✅ WebSocket auth via session token

---

## Scalability Considerations

### Current Limits
- Single Ethereum chain (Sepolia)
- Sequential agent execution
- SQLite for local data

### Scaling Path
1. **Phase 2:** Multi-chain via layered agents
2. **Phase 3:** Parallel agent execution within swarm
3. **Phase 4:** Cross-chain strategy atomicity
4. **Phase 5:** Horizontal scaling via keeper network

---

## Testing Strategy

### Unit Tests
- Agent decision logic
- Route validation
- State management

### Integration Tests
- Architect → Executor flow
- Monitor trigger detection
- 0G Storage persistence

### End-to-End Tests
- Full strategy deployment
- Trade execution on Sepolia
- WebSocket real-time updates

### Performance Tests
- Agent response time < 1s
- WebSocket latency < 100ms
- 0G Storage read/write throughput

---

## Deployment Architecture

### Development
```
localhost:3000 (Next.js)
localhost:3001 (Express API)
localhost:3002 (KeeperHub MCP)
./sentinelswap.db (SQLite)
```

### Production (0G Chain)
```
Frontend: IPFS/Fleek
Backend: 0G Compute Container
Storage: 0G Storage Network
Chain: 0G EVM Layer
```

---

*Last Updated: May 2026*
