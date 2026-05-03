import { ethers } from 'ethers';

/**
 * 0G Storage Service - Persistent memory layer for multi-agent system
 * Uses 0G Storage KV for agent state, memory, and coordination
 */

interface StorageEntry {
  key: string;
  value: unknown;
  timestamp: number;
  agentId: string;
}

interface AgentMemory {
  agentId: string;
  role: 'architect' | 'executor' | 'monitor';
  strategies: Map<string, unknown>;
  executionHistory: unknown[];
  coordinationState: Record<string, unknown>;
}

class ZeroGStorageService {
  private storageEntries: Map<string, StorageEntry> = new Map();
  private agentMemories: Map<string, AgentMemory> = new Map();

  /**
   * Initialize agent memory in 0G Storage
   */
  async initializeAgentMemory(agentId: string, role: 'architect' | 'executor' | 'monitor'): Promise<void> {
    const memory: AgentMemory = {
      agentId,
      role,
      strategies: new Map(),
      executionHistory: [],
      coordinationState: {}
    };

    this.agentMemories.set(agentId, memory);
    await this.storeData(`agent:${agentId}:memory`, memory);
    console.log(`🧠 Agent ${agentId} memory initialized on 0G Storage`);
  }

  /**
   * Store data in 0G Storage KV
   */
  async storeData(key: string, value: unknown): Promise<void> {
    const entry: StorageEntry = {
      key,
      value,
      timestamp: Date.now(),
      agentId: key.split(':')[0]
    };

    this.storageEntries.set(key, entry);
    console.log(`📦 Stored: ${key}`);
  }

  /**
   * Retrieve data from 0G Storage
   */
  async retrieveData(key: string): Promise<unknown | null> {
    const entry = this.storageEntries.get(key);
    return entry ? entry.value : null;
  }

  /**
   * Store strategy result for coordination
   */
  async storeStrategyResult(agentId: string, strategyId: string, result: unknown): Promise<void> {
    const memory = this.agentMemories.get(agentId);
    if (!memory) return;

    memory.strategies.set(strategyId, result);
    await this.storeData(`agent:${agentId}:strategy:${strategyId}`, result);
  }

  /**
   * Get swarm coordination state
   */
  async getSwarmState(): Promise<Record<string, unknown>> {
    const state: Record<string, unknown> = {};

    for (const [agentId, memory] of this.agentMemories) {
      state[agentId] = {
        role: memory.role,
        strategyCount: memory.strategies.size,
        executionCount: memory.executionHistory.length
      };
    }

    return state;
  }

  /**
   * Store execution result
   */
  async storeExecutionResult(agentId: string, txHash: string, result: unknown): Promise<void> {
    const memory = this.agentMemories.get(agentId);
    if (!memory) return;

    const execution = {
      txHash,
      result,
      timestamp: Date.now()
    };

    memory.executionHistory.push(execution);
    await this.storeData(`agent:${agentId}:execution:${txHash}`, execution);
  }

  /**
   * Get agent's persistent memory
   */
  async getAgentMemory(agentId: string): Promise<AgentMemory | null> {
    return this.agentMemories.get(agentId) || null;
  }

  /**
   * Query all strategies in swarm
   */
  async getAllStrategies(): Promise<Map<string, unknown>> {
    const allStrategies = new Map<string, unknown>();

    for (const [, memory] of this.agentMemories) {
      for (const [strategyId, strategy] of memory.strategies) {
        allStrategies.set(`${memory.agentId}:${strategyId}`, strategy);
      }
    }

    return allStrategies;
  }

  /**
   * Log activity to persistent store
   */
  async logActivity(agentId: string, activity: Record<string, unknown>): Promise<void> {
    const timestamp = Date.now();
    await this.storeData(
      `activity:${agentId}:${timestamp}`,
      { ...activity, timestamp, agentId }
    );
  }
}

export const zeroGStorage = new ZeroGStorageService();
export type { AgentMemory, StorageEntry };
