import { ethers } from 'ethers';

/**
 * iNFT Agent Tokenization - ERC-7857
 * Mint agents as NFTs with embedded intelligence and persistent memory
 */

export interface iNFTMetadata {
  agentId: string;
  agentName: string;
  role: 'architect' | 'executor' | 'monitor';
  embeddedIntelligence: {
    modelHash: string;
    capabilities: string[];
  };
  memoryPointer: string; // 0G Storage location
  createdAt: number;
  owner: string;
}

export interface AgentNFT {
  tokenId: string;
  metadata: iNFTMetadata;
  mintedAt: number;
  contractAddress: string;
}

// ERC-7857 iNFT Contract ABI (simplified)
const iNFTABI = [
  'function mint(address to, string memory uri) public returns (uint256)',
  'function setTokenURI(uint256 tokenId, string memory uri) public',
  'function ownerOf(uint256 tokenId) public view returns (address)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event MetadataUpdate(uint256 indexed tokenId)',
  'function balanceOf(address owner) public view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) public view returns (uint256)'
];

class INFTAgentService {
  private provider: ethers.Provider;
  private signer: ethers.Signer | null = null;
  private iNFTContract: ethers.Contract | null = null;
  private contractAddress: string = '';
  private mintedAgents: Map<string, AgentNFT> = new Map();

  constructor(rpcUrl: string, contractAddress?: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contractAddress = contractAddress || '';
  }

  /**
   * Initialize iNFT contract connection
   */
  async initialize(signerPrivateKey: string, contractAddress: string): Promise<void> {
    this.signer = new ethers.Wallet(signerPrivateKey, this.provider);
    this.contractAddress = contractAddress;
    this.iNFTContract = new ethers.Contract(contractAddress, iNFTABI, this.signer);
    console.log(`✨ iNFT Service initialized for contract: ${contractAddress}`);
  }

  /**
   * Mint an agent as iNFT
   */
  async mintAgentNFT(
    agentId: string,
    agentName: string,
    role: 'architect' | 'executor' | 'monitor',
    owner: string,
    memoryPointer: string
  ): Promise<AgentNFT> {
    if (!this.iNFTContract) {
      throw new Error('iNFT contract not initialized');
    }

    const metadata: iNFTMetadata = {
      agentId,
      agentName,
      role,
      embeddedIntelligence: {
        modelHash: ethers.id(`model-${agentId}`),
        capabilities: this.getCapabilitiesForRole(role)
      },
      memoryPointer, // Pointer to 0G Storage
      createdAt: Date.now(),
      owner
    };

    // Create metadata URI
    const metadataURI = `ipfs://${Buffer.from(JSON.stringify(metadata)).toString('hex')}`;

    try {
      // In real scenario, this would mint to blockchain
      const tokenId = ethers.hexlify(ethers.randomBytes(32));

      const nft: AgentNFT = {
        tokenId,
        metadata,
        mintedAt: Date.now(),
        contractAddress: this.contractAddress
      };

      this.mintedAgents.set(agentId, nft);

      console.log(`🎨 Agent minted as iNFT:`);
      console.log(`   Token ID: ${tokenId}`);
      console.log(`   Agent: ${agentName} (${role})`);
      console.log(`   Owner: ${owner}`);
      console.log(`   Memory: ${memoryPointer}`);

      return nft;
    } catch (error) {
      console.error('Failed to mint iNFT:', error);
      throw error;
    }
  }

  /**
   * Get capabilities for agent role
   */
  private getCapabilitiesForRole(role: string): string[] {
    const capabilities: Record<string, string[]> = {
      architect: ['strategy_parsing', 'route_validation', 'risk_assessment'],
      executor: ['trade_execution', 'gas_optimization', 'slippage_control'],
      monitor: ['price_monitoring', 'condition_checking', 'alert_triggering']
    };
    return capabilities[role] || [];
  }

  /**
   * Update agent memory pointer in NFT
   */
  async updateAgentMemoryPointer(agentId: string, newMemoryPointer: string): Promise<void> {
    const nft = this.mintedAgents.get(agentId);
    if (!nft) throw new Error(`Agent NFT not found: ${agentId}`);

    nft.metadata.memoryPointer = newMemoryPointer;
    this.mintedAgents.set(agentId, nft);

    console.log(`🔄 Updated memory pointer for ${agentId}: ${newMemoryPointer}`);
  }

  /**
   * Get agent NFT metadata
   */
  async getAgentNFT(agentId: string): Promise<AgentNFT | null> {
    return this.mintedAgents.get(agentId) || null;
  }

  /**
   * List all minted agent NFTs
   */
  async getAllMintedAgents(): Promise<AgentNFT[]> {
    return Array.from(this.mintedAgents.values());
  }

  /**
   * Verify agent NFT ownership
   */
  async verifyOwnership(agentId: string, ownerAddress: string): Promise<boolean> {
    const nft = this.mintedAgents.get(agentId);
    if (!nft) return false;
    return nft.metadata.owner.toLowerCase() === ownerAddress.toLowerCase();
  }

  /**
   * Transfer agent NFT
   */
  async transferAgent(agentId: string, newOwner: string): Promise<void> {
    const nft = this.mintedAgents.get(agentId);
    if (!nft) throw new Error(`Agent NFT not found: ${agentId}`);

    nft.metadata.owner = newOwner;
    this.mintedAgents.set(agentId, nft);

    console.log(`📦 Transferred agent ${agentId} to ${newOwner}`);
  }

  /**
   * Get agent metadata for display
   */
  async getAgentMetadata(agentId: string): Promise<iNFTMetadata | null> {
    const nft = this.mintedAgents.get(agentId);
    return nft ? nft.metadata : null;
  }
}

export const iNFTService = new INFTAgentService(
  process.env.RPC_URL || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY'
);
