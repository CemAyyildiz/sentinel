'use client';

import { useEffect, useState } from 'react';
import { BadgeDollarSign, Sparkles, RefreshCw, ShieldCheck, Wallet, Layers3 } from 'lucide-react';

interface INFTPanelProps {
  api_url: string;
}

interface MintedAgent {
  tokenId: string;
  metadata: {
    agentId: string;
    agentName: string;
    role: 'architect' | 'executor' | 'monitor';
    memoryPointer: string;
    owner: string;
  };
  mintedAt: number;
}

export default function INFTPanel({ api_url }: INFTPanelProps) {
  const [agents, setAgents] = useState<MintedAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'connected' | 'disconnected'>('disconnected');

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${api_url}/inft/agents`);
      const data = await res.json();
      if (data.success) {
        setAgents(data.agents || []);
        setStatus('connected');
      }
    } catch (error) {
      console.error('Failed to fetch iNFT agents:', error);
      setStatus('disconnected');
      setAgents([
        {
          tokenId: 'demo-token-001',
          mintedAt: Date.now(),
          metadata: {
            agentId: 'architect-agent-001',
            agentName: 'Architecture',
            role: 'architect',
            memoryPointer: 'zg-storage://agent-architect-001',
            owner: '0x0000000000000000000000000000000000000000'
          }
        }
      ]);
    }
  };

  const handleMintDemo = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${api_url}/inft/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: `agent-${Date.now()}`,
          agentName: 'DemoAgent',
          role: 'executor',
          owner: '0x0000000000000000000000000000000000000000',
          memoryPointer: `zg-storage://demo-${Date.now()}`
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchAgents();
      }
    } catch (error) {
      console.error('Failed to mint iNFT:', error);
    }
    setLoading(false);
  };

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl overflow-hidden">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-fuchsia-400" />
            iNFT Agents
          </h3>
          <span className={`text-xs px-2 py-1 rounded-full ${status === 'connected' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
            {status}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">ERC-7857 tokenized agents with embedded intelligence</p>
      </div>

      <div className="p-4 space-y-3">
        <button
          onClick={handleMintDemo}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-2 text-sm text-fuchsia-200 hover:bg-fuchsia-500/20 transition-colors disabled:opacity-60"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BadgeDollarSign className="w-4 h-4" />}
          Mint Demo iNFT
        </button>

        {agents.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-center text-sm text-gray-400">
            No iNFT agents minted yet
          </div>
        ) : (
          <div className="space-y-2">
            {agents.map((agent) => (
              <div key={agent.tokenId} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{agent.metadata.agentName}</p>
                    <p className="text-xs text-gray-400 font-mono">{agent.metadata.agentId}</p>
                  </div>
                  <div className="rounded-full bg-fuchsia-500/20 px-2 py-1 text-[10px] uppercase tracking-wide text-fuchsia-300">
                    {agent.metadata.role}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-400">
                  <div className="rounded-lg bg-white/5 p-2">
                    <div className="flex items-center gap-1 text-gray-500">
                      <ShieldCheck className="w-3 h-3" />
                      Token ID
                    </div>
                    <p className="mt-1 truncate font-mono text-gray-200">{agent.tokenId}</p>
                  </div>
                  <div className="rounded-lg bg-white/5 p-2">
                    <div className="flex items-center gap-1 text-gray-500">
                      <Layers3 className="w-3 h-3" />
                      Memory
                    </div>
                    <p className="mt-1 truncate font-mono text-gray-200">{agent.metadata.memoryPointer}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                  <span className="flex items-center gap-1"><Wallet className="w-3 h-3" /> {agent.metadata.owner}</span>
                  <span>{new Date(agent.mintedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
