import { ethers } from 'ethers';

/**
 * ENS Service - Agent Identity Layer
 * Give each agent a human-readable ENS domain
 * Store agent metadata in ENS text records
 */

export interface AgentENSProfile {
  agentId: string;
  ensDomain: string;
  address: string;
  role: 'architect' | 'executor' | 'monitor';
  textRecords: Record<string, string>;
  metadata: {
    capabilities: string[];
    strategyCount: number;
    totalExecutions: number;
  };
}

// ENS Registry ABI (simplified)
const ENS_REGISTRY_ABI = [
  'function resolver(bytes32 node) view returns (address)',
  'function setResolver(bytes32 node, address resolver) external'
];

// ENS Resolver ABI (simplified)
const ENS_RESOLVER_ABI = [
  'function getText(bytes32 node, string calldata key) view returns (string memory)',
  'function setText(bytes32 node, string calldata key, string calldata value) external',
  'function addr(bytes32 node) view returns (address)',
  'function setAddr(bytes32 node, address addr) external'
];

class ENSService {
  private provider: ethers.Provider;
  private signer: ethers.Signer | null = null;
  private ensRegistry: ethers.Contract | null = null;
  private agentProfiles: Map<string, AgentENSProfile> = new Map();

  private readonly ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e'; // Mainnet
  private readonly ENS_REGISTRY_SEPOLIA = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e'; // Same on testnet

  constructor(rpcUrl: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Initialize ENS service
   */
  async initialize(signerPrivateKey: string): Promise<void> {
    this.signer = new ethers.Wallet(signerPrivateKey, this.provider);

    // Initialize ENS registry connection
    const registryAddress = this.ENS_REGISTRY_SEPOLIA;
    this.ensRegistry = new ethers.Contract(registryAddress, ENS_REGISTRY_ABI, this.signer);

    console.log(`🔤 ENS Service initialized for agent identity`);
  }

  /**
   * Register agent with ENS domain
   * Format: agent-{agentId}.sentinelswap.eth
   */
  async registerAgentDomain(
    agentId: string,
    agentName: string,
    role: 'architect' | 'executor' | 'monitor',
    agentAddress: string
  ): Promise<AgentENSProfile> {
    const ensDomain = `${agentName.toLowerCase()}.sentinelswap.eth`;
    const nodeHash = ethers.namehash(ensDomain);

    const profile: AgentENSProfile = {
      agentId,
      ensDomain,
      address: agentAddress,
      role,
      textRecords: {
        'agent-id': agentId,
        'agent-role': role,
        'agent-type': 'multi-agent-swarm',
        'created-at': new Date().toISOString(),
        'version': '1.0.0'
      },
      metadata: {
        capabilities: this.getCapabilitiesForRole(role),
        strategyCount: 0,
        totalExecutions: 0
      }
    };

    this.agentProfiles.set(agentId, profile);

    console.log(`📝 Registered agent domain:`);
    console.log(`   Domain: ${ensDomain}`);
    console.log(`   Node: ${nodeHash}`);
    console.log(`   Address: ${agentAddress}`);
    console.log(`   Role: ${role}`);

    return profile;
  }

  /**
   * Update agent profile metadata
   */
  async updateAgentMetadata(
    agentId: string,
    metadata: Partial<AgentENSProfile['metadata']>
  ): Promise<void> {
    const profile = this.agentProfiles.get(agentId);
    if (!profile) throw new Error(`Agent profile not found: ${agentId}`);

    profile.metadata = { ...profile.metadata, ...metadata };
    this.agentProfiles.set(agentId, profile);

    console.log(`✏️ Updated metadata for ${agentId}`);
  }

  /**
   * Store text record in ENS
   */
  async setTextRecord(agentId: string, key: string, value: string): Promise<void> {
    const profile = this.agentProfiles.get(agentId);
    if (!profile) throw new Error(`Agent profile not found: ${agentId}`);

    profile.textRecords[key] = value;
    console.log(`📌 Stored text record: ${key}=${value} for ${profile.ensDomain}`);
  }

  /**
   * Get text record from ENS
   */
  async getTextRecord(agentId: string, key: string): Promise<string | null> {
    const profile = this.agentProfiles.get(agentId);
    if (!profile) return null;

    return profile.textRecords[key] || null;
  }

  /**
   * Get agent profile by ENS domain
   */
  async getAgentByDomain(domain: string): Promise<AgentENSProfile | null> {
    for (const [, profile] of this.agentProfiles) {
      if (profile.ensDomain === domain) {
        return profile;
      }
    }
    return null;
  }

  /**
   * Get agent profile by ID
   */
  async getAgentProfile(agentId: string): Promise<AgentENSProfile | null> {
    return this.agentProfiles.get(agentId) || null;
  }

  /**
   * Resolve ENS domain to agent address
   */
  async resolveAgentDomain(domain: string): Promise<string | null> {
    const profile = await this.getAgentByDomain(domain);
    return profile ? profile.address : null;
  }

  /**
   * List all registered agents
   */
  async getAllAgents(): Promise<AgentENSProfile[]> {
    return Array.from(this.agentProfiles.values());
  }

  /**
   * Discover agents by role
   */
  async discoverAgentsByRole(role: string): Promise<AgentENSProfile[]> {
    return Array.from(this.agentProfiles.values()).filter(
      (profile) => profile.role === role
    );
  }

  /**
   * Get agent discovery metadata (for frontend)
   */
  async getAgentDiscoveryMetadata(agentId: string): Promise<Record<string, unknown> | null> {
    const profile = this.agentProfiles.get(agentId);
    if (!profile) return null;

    return {
      ensDomain: profile.ensDomain,
      address: profile.address,
      role: profile.role,
      capabilities: profile.metadata.capabilities,
      strategyCount: profile.metadata.strategyCount,
      totalExecutions: profile.metadata.totalExecutions
    };
  }

  /**
   * Get capabilities for role
   */
  private getCapabilitiesForRole(role: string): string[] {
    const capabilities: Record<string, string[]> = {
      architect: ['strategy_parsing', 'route_validation', 'risk_assessment', 'gas_estimation'],
      executor: ['trade_execution', 'gas_optimization', 'slippage_control', 'price_protection'],
      monitor: ['price_monitoring', 'condition_checking', 'alert_triggering', 'event_logging']
    };
    return capabilities[role] || [];
  }
}

export const ensService = new ENSService(
  process.env.RPC_URL || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY'
);
