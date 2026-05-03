import express, { Request, Response } from 'express';
import { multiAgentSwarm, type StrategyPlan } from '../services/swarm';
import { iNFTService } from '../services/iNFT';
import { ensService } from '../services/ens';
import { zeroGStorage } from '../services/zeroGStorage';
import { ethers } from 'ethers';

const router = express.Router();

/**
 * Swarm Management Endpoints
 */

// Initialize swarm with agents
router.post('/swarm/initialize', async (req: Request, res: Response) => {
  try {
    const { architectWallet, executorWallet, monitorWallet } = req.body;

    // Register Architect Agent
    await multiAgentSwarm.registerAgent({
      id: 'architect-agent-001',
      role: 'architect',
      wallet: architectWallet ? new ethers.Wallet(architectWallet) : undefined,
      responsibilities: ['strategy_parsing', 'route_validation', 'risk_assessment']
    });

    // Register Executor Agent
    await multiAgentSwarm.registerAgent({
      id: 'executor-agent-001',
      role: 'executor',
      wallet: executorWallet ? new ethers.Wallet(executorWallet) : undefined,
      responsibilities: ['trade_execution', 'gas_optimization', 'order_management']
    });

    // Register Monitor Agent
    await multiAgentSwarm.registerAgent({
      id: 'monitor-agent-001',
      role: 'monitor',
      wallet: monitorWallet ? new ethers.Wallet(monitorWallet) : undefined,
      responsibilities: ['price_monitoring', 'condition_checking', 'alert_triggering']
    });

    // Mint agents as iNFTs
    const architectNFT = await iNFTService.mintAgentNFT(
      'architect-agent-001',
      'Architecture',
      'architect',
      architectWallet?.address || ethers.ZeroAddress,
      'zg-storage://agent-architect-001'
    );

    const executorNFT = await iNFTService.mintAgentNFT(
      'executor-agent-001',
      'Executor',
      'executor',
      executorWallet?.address || ethers.ZeroAddress,
      'zg-storage://agent-executor-001'
    );

    const monitorNFT = await iNFTService.mintAgentNFT(
      'monitor-agent-001',
      'Monitor',
      'monitor',
      monitorWallet?.address || ethers.ZeroAddress,
      'zg-storage://agent-monitor-001'
    );

    // Register ENS domains
    await ensService.registerAgentDomain(
      'architect-agent-001',
      'architect',
      'architect',
      architectWallet?.address || ethers.ZeroAddress
    );

    await ensService.registerAgentDomain(
      'executor-agent-001',
      'executor',
      'executor',
      executorWallet?.address || ethers.ZeroAddress
    );

    await ensService.registerAgentDomain(
      'monitor-agent-001',
      'monitor',
      'monitor',
      monitorWallet?.address || ethers.ZeroAddress
    );

    res.json({
      success: true,
      agents: Array.from(multiAgentSwarm.getAgents().values()),
      nfts: {
        architect: architectNFT,
        executor: executorNFT,
        monitor: monitorNFT
      },
      message: 'Swarm initialized with iNFT minting and ENS domains'
    });
  } catch (error) {
    console.error('Swarm initialization error:', error);
    res.status(500).json({ error: 'Failed to initialize swarm' });
  }
});

// Get swarm state
router.get('/swarm/state', async (req: Request, res: Response) => {
  try {
    const state = await multiAgentSwarm.getSwarmState();
    res.json(state);
  } catch (error) {
    console.error('Error getting swarm state:', error);
    res.status(500).json({ error: 'Failed to get swarm state' });
  }
});

// Parse strategy with Architect Agent
router.post('/swarm/parse-strategy', async (req: Request, res: Response) => {
  try {
    const { strategyText, strategyId } = req.body;

    const plan = await multiAgentSwarm.architectParseStrategy(strategyText, strategyId);

    res.json({
      success: true,
      plan,
      architect: 'architect-agent-001'
    });
  } catch (error) {
    console.error('Strategy parsing error:', error);
    res.status(500).json({ error: 'Failed to parse strategy' });
  }
});

// Execute trade with Executor Agent
router.post('/swarm/execute-trade', async (req: Request, res: Response) => {
  try {
    const { strategyId, plan, params } = req.body;

    const txHash = await multiAgentSwarm.executorExecuteTrade(plan, params);

    res.json({
      success: true,
      txHash,
      executor: 'executor-agent-001',
      strategyId
    });
  } catch (error) {
    console.error('Trade execution error:', error);
    res.status(500).json({ error: 'Failed to execute trade' });
  }
});

// Monitor conditions
router.post('/swarm/monitor', async (req: Request, res: Response) => {
  try {
    const { strategyId, condition } = req.body;

    const conditionMet = await multiAgentSwarm.monitorWatchConditions(strategyId, condition);

    res.json({
      success: true,
      strategyId,
      conditionMet,
      monitor: 'monitor-agent-001'
    });
  } catch (error) {
    console.error('Monitoring error:', error);
    res.status(500).json({ error: 'Failed to monitor condition' });
  }
});

/**
 * iNFT Endpoints
 */

// Mint agent NFT
router.post('/inft/mint', async (req: Request, res: Response) => {
  try {
    const { agentId, agentName, role, owner, memoryPointer } = req.body;

    const nft = await iNFTService.mintAgentNFT(agentId, agentName, role, owner, memoryPointer);

    res.json({
      success: true,
      nft,
      message: `Agent ${agentName} minted as iNFT`
    });
  } catch (error) {
    console.error('iNFT minting error:', error);
    res.status(500).json({ error: 'Failed to mint iNFT' });
  }
});

// Get all minted agents
router.get('/inft/agents', async (req: Request, res: Response) => {
  try {
    const agents = await iNFTService.getAllMintedAgents();
    res.json({
      success: true,
      agents,
      count: agents.length
    });
  } catch (error) {
    console.error('Error fetching iNFT agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

/**
 * ENS Endpoints
 */

// Discover agents by role
router.get('/ens/discover/:role', async (req: Request, res: Response) => {
  try {
    const role = req.params.role as string;
    const agents = await ensService.discoverAgentsByRole(role);

    res.json({
      success: true,
      agents,
      count: agents.length
    });
  } catch (error) {
    console.error('Error discovering agents:', error);
    res.status(500).json({ error: 'Failed to discover agents' });
  }
});

// Resolve ENS domain
router.get('/ens/resolve/:domain', async (req: Request, res: Response) => {
  try {
    const domain = req.params.domain as string;
    const address = await ensService.resolveAgentDomain(domain);

    if (!address) {
      return res.status(404).json({ error: 'Agent domain not found' });
    }

    const profile = await ensService.getAgentByDomain(domain);

    res.json({
      success: true,
      domain,
      address,
      profile
    });
  } catch (error) {
    console.error('Error resolving ENS domain:', error);
    res.status(500).json({ error: 'Failed to resolve domain' });
  }
});

// Get all agents
router.get('/ens/agents', async (req: Request, res: Response) => {
  try {
    const agents = await ensService.getAllAgents();

    res.json({
      success: true,
      agents,
      count: agents.length
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

/**
 * 0G Storage Endpoints
 */

// Get agent memory from 0G Storage
router.get('/storage/agent-memory/:agentId', async (req: Request, res: Response) => {
  try {
    const agentId = req.params.agentId as string;
    const memory = await zeroGStorage.getAgentMemory(agentId);

    if (!memory) {
      return res.status(404).json({ error: 'Agent memory not found' });
    }

    res.json({
      success: true,
      agentId,
      memory
    });
  } catch (error) {
    console.error('Error fetching agent memory:', error);
    res.status(500).json({ error: 'Failed to fetch agent memory' });
  }
});

// Get all strategies from 0G Storage
router.get('/storage/all-strategies', async (req: Request, res: Response) => {
  try {
    const strategies = await zeroGStorage.getAllStrategies();

    res.json({
      success: true,
      strategies: Array.from(strategies.entries()),
      count: strategies.size
    });
  } catch (error) {
    console.error('Error fetching strategies:', error);
    res.status(500).json({ error: 'Failed to fetch strategies' });
  }
});

export default router;
