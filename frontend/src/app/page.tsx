'use client';

import { useState, useEffect, useRef } from 'react';
import { Shield, Zap, Activity, Clock, ChevronRight, Sparkles, Send, Wallet, History, CheckCircle, XCircle, AlertCircle, Loader2, Copy, ExternalLink, RefreshCw, MessageSquare, TrendingUp, Pause, Play, Trash2, ArrowRight, Eye, Bot, Cpu, Network, ArrowDown, CircleDot } from 'lucide-react';

const API_URL = '/api';

interface Strategy {
  id: string;
  name: string;
  prompt: string;
  trigger_type: string;
  trigger_params: any;
  action_type: string;
  action_params: any;
  status: string;
  keeper_task_id: string | null;
  created_at: string;
}

interface Transaction {
  id: string;
  strategy_id: string;
  strategy_name: string;
  tx_hash: string | null;
  status: string;
  action_type: string;
  action_details: any;
  gas_used: string | null;
  created_at: string;
}

interface ParsedStrategy {
  id: string;
  name: string;
  trigger: {
    type: string;
    token: string;
    direction: string;
    value: number;
  };
  action: {
    type: string;
    tokenIn: string;
    tokenOut: string;
    amount: string;
  };
  estimatedRoute?: {
    quote: string;
    gasEstimate: string;
    priceImpact: string;
  };
  confidence: number;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'system' | 'strategy' | 'parsing';
  content: string;
  strategy?: ParsedStrategy;
  timestamp: Date;
  inferenceData?: {
    model: string;
    latency: number;
    confidence: number;
  };
}

interface KeeperStatus {
  strategyId: string;
  strategyName: string;
  lastCheck: Date;
  currentPrice: number;
  targetPrice: number;
  direction: string;
  progress: number;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'create' | 'strategies' | 'history'>('create');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'system',
      content: 'Welcome to SentinelSwap! Describe your DeFi strategy in plain English. I\'ll use 0G AI to parse your intent, validate routes via Uniswap, and deploy an autonomous agent via KeeperHub.',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [ethPrice, setEthPrice] = useState<number>(2400);
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [keeperStatuses, setKeeperStatuses] = useState<KeeperStatus[]>([]);
  const [showInference, setShowInference] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStrategies();
    fetchTransactions();
    fetchPrice();
    checkWalletConnection();
    
    // Simulate keeper monitoring
    const interval = setInterval(() => {
      updateKeeperStatuses();
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const updateKeeperStatuses = () => {
    const activeStrategies = strategies.filter(s => s.status === 'active');
    const statuses: KeeperStatus[] = activeStrategies.map(s => ({
      strategyId: s.id,
      strategyName: s.name,
      lastCheck: new Date(),
      currentPrice: ethPrice + (Math.random() - 0.5) * 20,
      targetPrice: s.trigger_params?.value || 2400,
      direction: s.trigger_params?.direction || 'below',
      progress: Math.min(100, Math.random() * 100)
    }));
    setKeeperStatuses(statuses);
  };

  const showToast = (type: Toast['type'], message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const checkWalletConnection = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsConnected(true);
        }
      } catch (err) {
        console.error('Wallet check error:', err);
      }
    }
  };

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsConnected(true);
          showToast('success', 'Wallet connected successfully!');
        }
      } catch (err) {
        showToast('error', 'Failed to connect wallet');
      }
    } else {
      showToast('error', 'Please install MetaMask');
    }
  };

  const fetchStrategies = async () => {
    try {
      const res = await fetch(`${API_URL}/strategies`);
      const data = await res.json();
      setStrategies(data);
    } catch (err) {
      console.error('Failed to fetch strategies:', err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API_URL}/history`);
      const data = await res.json();
      setTransactions(data);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    }
  };

  const fetchPrice = async () => {
    try {
      const res = await fetch(`${API_URL}/price`);
      const data = await res.json();
      setEthPrice(data.price);
    } catch (err) {
      console.error('Failed to fetch price:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStrategies(), fetchTransactions(), fetchPrice()]);
    setRefreshing(false);
    showToast('info', 'Data refreshed');
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    const prompt = inputValue;
    setInputValue('');
    setLoading(true);

    // Show 0G inference animation
    const parsingMessage: ChatMessage = {
      id: (Date.now() + 0.5).toString(),
      type: 'parsing',
      content: '0G AI is analyzing your strategy...',
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, parsingMessage]);

    // Simulate 0G inference delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const res = await fetch(`${API_URL}/strategies/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      
      // Remove parsing message and add result
      setChatMessages(prev => prev.filter(m => m.type !== 'parsing'));
      
      const systemMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'strategy',
        content: `Strategy parsed successfully!`,
        strategy: data,
        timestamp: new Date(),
        inferenceData: {
          model: 'llama-3.3-70b',
          latency: 1.2 + Math.random() * 0.5,
          confidence: data.confidence
        }
      };
      
      setChatMessages(prev => [...prev, systemMessage]);
      showToast('success', 'Strategy parsed by 0G AI!');
    } catch (err) {
      setChatMessages(prev => prev.filter(m => m.type !== 'parsing'));
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: 'Sorry, I couldn\'t parse that strategy. Please try rephrasing it.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
      showToast('error', 'Failed to parse strategy');
    }
    setLoading(false);
  };

  const handleDeploy = async (strategy: ParsedStrategy) => {
    setLoading(true);
    try {
      const deployRes = await fetch(`${API_URL}/strategies/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyId: strategy.id,
          walletAddress: walletAddress || undefined
        })
      });

      if (!deployRes.ok) throw new Error('Failed to deploy');

      const successMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'system',
        content: `✅ Strategy "${strategy.name}" deployed to KeeperHub! The autonomous agent will monitor conditions every 30 seconds and execute via Uniswap when triggered.`,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, successMessage]);
      fetchStrategies();
      showToast('success', 'Deployed to KeeperHub!');
    } catch (err) {
      showToast('error', 'Failed to deploy strategy');
    }
    setLoading(false);
  };

  const handlePause = async (id: string) => {
    try {
      await fetch(`${API_URL}/strategies/${id}/pause`, { method: 'PATCH' });
      fetchStrategies();
      showToast('success', 'Strategy paused');
    } catch (err) {
      showToast('error', 'Failed to pause strategy');
    }
  };

  const handleResume = async (id: string) => {
    try {
      await fetch(`${API_URL}/strategies/${id}/resume`, { method: 'PATCH' });
      fetchStrategies();
      showToast('success', 'Strategy resumed');
    } catch (err) {
      showToast('error', 'Failed to resume strategy');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_URL}/strategies/${id}`, { method: 'DELETE' });
      fetchStrategies();
      showToast('success', 'Strategy deleted');
    } catch (err) {
      showToast('error', 'Failed to delete strategy');
    }
  };

  const handleExecute = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/strategies/${id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: walletAddress || undefined })
      });
      const data = await res.json();
      showToast('success', `Transaction executed! Hash: ${data.txHash?.slice(0, 10)}...`);
      fetchStrategies();
      fetchTransactions();
    } catch (err) {
      showToast('error', 'Failed to execute strategy');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('info', 'Copied to clipboard');
  };

  const examplePrompts = [
    "Buy ETH with 500 USDC when ETH drops below $2,400",
    "Sell 1 ETH when price goes above $3,000",
    "Swap 1000 USDC to ETH at best rate",
    "Alert me when ETH/USDC pool APR exceeds 20%"
  ];

  const activeStrategies = strategies.filter(s => s.status === 'active').length;
  const totalExecuted = transactions.filter(t => t.status === 'success').length;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white relative overflow-hidden">
      {/* Background gradient mesh */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#00FF88]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg animate-slide-in backdrop-blur-xl ${
              toast.type === 'success' ? 'bg-green-500/20 border border-green-500/30' :
              toast.type === 'error' ? 'bg-red-500/20 border border-red-500/30' :
              'bg-blue-500/20 border border-blue-500/30'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-400" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 text-red-400" />}
            {toast.type === 'info' && <AlertCircle className="w-5 h-5 text-blue-400" />}
            <span className={`text-sm ${
              toast.type === 'success' ? 'text-green-300' :
              toast.type === 'error' ? 'text-red-300' :
              'text-blue-300'
            }`}>
              {toast.message}
            </span>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00FF88] to-[#00CC6A] flex items-center justify-center shadow-lg shadow-[#00FF88]/20">
              <Shield className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold">SentinelSwap</h1>
              <p className="text-xs text-gray-400">Autonomous DeFi Agent</p>
            </div>
          </div>
          
          {/* Partner Logos */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <div className="w-2 h-2 rounded-full bg-pink-500"></div>
              <span className="text-xs text-gray-400">Uniswap</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-xs text-gray-400">0G AI</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <span className="text-xs text-gray-400">KeeperHub</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-gray-300 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <div className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse"></div>
              <span className="text-sm text-gray-300 font-mono">ETH ${ethPrice.toLocaleString()}</span>
            </div>
            {isConnected ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#00FF88]/10 border border-[#00FF88]/30">
                <Wallet className="w-4 h-4 text-[#00FF88]" />
                <span className="text-sm text-[#00FF88] font-mono">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#00FF88] text-black font-semibold hover:bg-[#00CC6A] transition-colors shadow-lg shadow-[#00FF88]/20"
              >
                <Wallet className="w-4 h-4" />
                <span className="text-sm">Connect Wallet</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-xl hover:border-[#00FF88]/30 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Total Strategies</p>
                <p className="text-2xl font-bold font-mono">{strategies.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#00FF88]/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-[#00FF88]" />
              </div>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-xl hover:border-[#00FF88]/30 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Active (KeeperHub)</p>
                <p className="text-2xl font-bold font-mono text-[#00FF88]">{activeStrategies}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#00FF88]/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#00FF88] animate-pulse" />
              </div>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-xl hover:border-blue-500/30 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Executed (Uniswap)</p>
                <p className="text-2xl font-bold font-mono text-blue-400">{totalExecuted}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-xl hover:border-yellow-500/30 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">ETH Price</p>
                <p className="text-2xl font-bold font-mono">${ethPrice.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {[
            { id: 'create', icon: MessageSquare, label: 'Strategy Creator' },
            { id: 'strategies', icon: Activity, label: `Active Strategies (${strategies.length})` },
            { id: 'history', icon: History, label: `History (${transactions.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[#00FF88] text-black shadow-lg shadow-[#00FF88]/20'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Create Strategy Tab - Chat Interface */}
        {activeTab === 'create' && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Chat Section */}
            <div className="lg:col-span-2 bg-white/5 rounded-2xl border border-white/10 flex flex-col h-[600px] backdrop-blur-xl">
              {/* Chat Header */}
              <div className="p-4 border-b border-white/10">
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#00FF88]" />
                  AI Strategy Parser
                  <span className="ml-auto text-xs text-gray-500 flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    Powered by 0G Network
                  </span>
                </h3>
                <p className="text-sm text-gray-400 mt-1">Describe your strategy in natural language</p>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-4 ${
                      msg.type === 'user' 
                        ? 'bg-[#00FF88] text-black' 
                        : msg.type === 'strategy'
                        ? 'bg-white/10 border border-[#00FF88]/30'
                        : msg.type === 'parsing'
                        ? 'bg-blue-500/10 border border-blue-500/30'
                        : 'bg-white/10'
                    }`}>
                      {msg.type === 'parsing' ? (
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                              <Cpu className="w-4 h-4 text-blue-400 animate-pulse" />
                            </div>
                            <div className="absolute inset-0 rounded-full border-2 border-blue-500/50 animate-ping"></div>
                          </div>
                          <div>
                            <p className="text-sm text-blue-300 font-medium">0G AI Inference</p>
                            <p className="text-xs text-blue-400/70">Processing on decentralized network...</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm">{msg.content}</p>
                          
                          {/* 0G Inference Panel */}
                          {msg.inferenceData && (
                            <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                              <div className="flex items-center gap-2 mb-2">
                                <Cpu className="w-4 h-4 text-blue-400" />
                                <span className="text-xs font-medium text-blue-300">0G AI Inference</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                  <div className="text-xs text-gray-500">Model</div>
                                  <div className="text-xs font-mono text-blue-300">{msg.inferenceData.model}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500">Latency</div>
                                  <div className="text-xs font-mono text-blue-300">{msg.inferenceData.latency.toFixed(1)}s</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500">Confidence</div>
                                  <div className="text-xs font-mono text-blue-300">{(msg.inferenceData.confidence * 100).toFixed(0)}%</div>
                                </div>
                              </div>
                              <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
                                <Network className="w-3 h-3" />
                                <span>Decentralized inference ✓</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Strategy Card */}
                          {msg.strategy && (
                            <div className="mt-4 space-y-3">
                              {/* Trigger & Action */}
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                                  <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                                    <Zap className="w-3 h-3" />
                                    TRIGGER (KeeperHub)
                                  </div>
                                  <div className="font-medium text-sm">
                                    {msg.strategy.trigger.token} {msg.strategy.trigger.direction} ${msg.strategy.trigger.value.toLocaleString()}
                                  </div>
                                </div>
                                <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                                  <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                                    <ArrowRight className="w-3 h-3" />
                                    ACTION (Uniswap)
                                  </div>
                                  <div className="font-medium text-sm">
                                    {msg.strategy.action.amount} {msg.strategy.action.tokenIn} → {msg.strategy.action.tokenOut}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Uniswap Route Visualization */}
                              {msg.strategy.estimatedRoute && (
                                <div className="bg-black/30 rounded-lg p-4 border border-pink-500/20">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-2 h-2 rounded-full bg-pink-500"></div>
                                    <span className="text-xs font-medium text-pink-300">UNISWAP ROUTE</span>
                                  </div>
                                  
                                  {/* Route Flow */}
                                  <div className="flex items-center justify-between mb-4">
                                    <div className="text-center">
                                      <div className="text-lg font-bold">{msg.strategy.action.amount}</div>
                                      <div className="text-xs text-gray-400">{msg.strategy.action.tokenIn}</div>
                                    </div>
                                    <div className="flex-1 mx-4 relative">
                                      <div className="h-0.5 bg-gradient-to-r from-pink-500 to-purple-500"></div>
                                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#0a0a0f] px-2 py-1 rounded text-xs text-gray-400">
                                        V3 0.3% Pool
                                      </div>
                                      <ArrowRight className="absolute right-0 top-1/2 transform -translate-y-1/2 w-4 h-4 text-pink-400" />
                                    </div>
                                    <div className="text-center">
                                      <div className="text-lg font-bold text-[#00FF88]">
                                        {(parseFloat(msg.strategy.estimatedRoute.quote) / 1e18).toFixed(4)}
                                      </div>
                                      <div className="text-xs text-gray-400">{msg.strategy.action.tokenOut}</div>
                                    </div>
                                  </div>
                                  
                                  {/* Route Details */}
                                  <div className="grid grid-cols-3 gap-2 text-center border-t border-white/5 pt-3">
                                    <div>
                                      <div className="text-xs text-gray-500">Gas Estimate</div>
                                      <div className="text-sm font-mono text-yellow-400">{msg.strategy.estimatedRoute.gasEstimate}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500">Price Impact</div>
                                      <div className="text-sm font-mono text-blue-400">{msg.strategy.estimatedRoute.priceImpact}%</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500">Min Output</div>
                                      <div className="text-sm font-mono text-green-400">
                                        {((parseFloat(msg.strategy.estimatedRoute.quote) / 1e18) * 0.995).toFixed(4)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Deploy Button */}
                              <button
                                onClick={() => handleDeploy(msg.strategy!)}
                                disabled={loading}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00FF88] to-[#00CC6A] text-black font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#00FF88]/20"
                              >
                                {loading ? (
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                  <>
                                    <Shield className="w-5 h-5" />
                                    Deploy to KeeperHub
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-500 mt-2">
                            {msg.timestamp.toLocaleTimeString()}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Describe your strategy... e.g., 'Buy ETH when price drops below $2,400'"
                    className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 outline-none focus:border-[#00FF88]/50 transition-colors"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={loading || !inputValue.trim()}
                    className="px-6 py-3 rounded-xl bg-[#00FF88] text-black font-semibold hover:bg-[#00CC6A] disabled:opacity-50 transition-colors shadow-lg shadow-[#00FF88]/20"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* KeeperHub Monitor */}
              {keeperStatuses.length > 0 && (
                <div className="bg-white/5 rounded-2xl p-6 border border-purple-500/20 backdrop-blur-xl">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-purple-400" />
                    KeeperHub Monitor
                    <span className="ml-auto w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                  </h3>
                  <div className="space-y-4">
                    {keeperStatuses.map((status) => (
                      <div key={status.strategyId} className="bg-black/30 rounded-lg p-3 border border-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium truncate">{status.strategyName}</span>
                          <span className="text-xs text-purple-400 flex items-center gap-1">
                            <CircleDot className="w-3 h-3 animate-pulse" />
                            ACTIVE
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mb-2">
                          Condition: ETH {status.direction} ${status.targetPrice}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000"
                              style={{ width: `${status.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500">{status.progress.toFixed(0)}%</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Last check: {Math.floor((Date.now() - status.lastCheck.getTime()) / 1000)}s ago
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Example Prompts */}
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-xl">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#00FF88]" />
                  Example Strategies
                </h3>
                <div className="space-y-3">
                  {examplePrompts.map((example, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInputValue(example);
                        // Auto-send after setting value
                        setTimeout(() => {
                          const userMessage: ChatMessage = {
                            id: Date.now().toString(),
                            type: 'user',
                            content: example,
                            timestamp: new Date()
                          };
                          setChatMessages(prev => [...prev, userMessage]);
                          setLoading(true);

                          // Show 0G inference animation
                          const parsingMessage: ChatMessage = {
                            id: (Date.now() + 0.5).toString(),
                            type: 'parsing',
                            content: '0G AI is analyzing your strategy...',
                            timestamp: new Date()
                          };
                          setChatMessages(prev => [...prev, parsingMessage]);
                          setInputValue('');

                          // Simulate 0G inference delay
                          setTimeout(async () => {
                            try {
                              const res = await fetch(`${API_URL}/strategies/parse`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ prompt: example })
                              });
                              const data = await res.json();
                              
                              setChatMessages(prev => prev.filter(m => m.type !== 'parsing'));
                              
                              const systemMessage: ChatMessage = {
                                id: (Date.now() + 1).toString(),
                                type: 'strategy',
                                content: `Strategy parsed successfully!`,
                                strategy: data,
                                timestamp: new Date(),
                                inferenceData: {
                                  model: 'llama-3.3-70b',
                                  latency: 1.2 + Math.random() * 0.5,
                                  confidence: data.confidence
                                }
                              };
                              
                              setChatMessages(prev => [...prev, systemMessage]);
                              showToast('success', 'Strategy parsed by 0G AI!');
                            } catch (err) {
                              setChatMessages(prev => prev.filter(m => m.type !== 'parsing'));
                              const errorMessage: ChatMessage = {
                                id: (Date.now() + 1).toString(),
                                type: 'system',
                                content: 'Sorry, I couldn\'t parse that strategy. Please try rephrasing it.',
                                timestamp: new Date()
                              };
                              setChatMessages(prev => [...prev, errorMessage]);
                              showToast('error', 'Failed to parse strategy');
                            }
                            setLoading(false);
                          }, 1500);
                        }, 100);
                      }}
                      className="w-full text-left p-3 rounded-lg bg-black/30 border border-white/10 hover:border-[#00FF88]/30 transition-colors text-sm text-gray-300 hover:text-white"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              {/* How It Works */}
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-xl">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#00FF88]" />
                  How It Works
                </h3>
                <div className="space-y-4 text-sm text-gray-400">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs text-blue-400">1</span>
                    </div>
                    <div>
                      <p className="text-white">0G AI parses your intent</p>
                      <p className="text-xs text-gray-500">Decentralized LLM inference</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs text-pink-400">2</span>
                    </div>
                    <div>
                      <p className="text-white">Uniswap validates the route</p>
                      <p className="text-xs text-gray-500">Best price & minimal slippage</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs text-purple-400">3</span>
                    </div>
                    <div>
                      <p className="text-white">KeeperHub monitors 24/7</p>
                      <p className="text-xs text-gray-500">Autonomous execution when triggered</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Strategies Tab */}
        {activeTab === 'strategies' && (
          <div className="space-y-4">
            {strategies.length === 0 ? (
              <div className="bg-white/5 rounded-2xl p-12 text-center border border-white/10 backdrop-blur-xl">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-300 mb-2">No Active Strategies</h3>
                <p className="text-sm text-gray-500">Create your first autonomous strategy to get started.</p>
              </div>
            ) : (
              strategies.map((strategy, index) => (
                <div key={strategy.id} className="bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-xl animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{strategy.name}</h3>
                      <p className="text-sm text-gray-400 mt-1 font-mono">{strategy.prompt}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 ${
                      strategy.status === 'active' ? 'bg-[#00FF88]/20 text-[#00FF88]' :
                      strategy.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                      strategy.status === 'executed' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {strategy.status === 'active' && <span className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse"></span>}
                      {strategy.status}
                    </div>
                  </div>
                  
                  {/* Partner Integration Badges */}
                  <div className="flex gap-2 mb-4">
                    <span className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-300 flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      KeeperHub
                    </span>
                    <span className="px-2 py-1 rounded text-xs bg-pink-500/20 text-pink-300 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Uniswap
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                      <div className="text-xs text-gray-500">Trigger</div>
                      <div className="font-medium text-sm font-mono">
                        {strategy.trigger_params?.token} {strategy.trigger_params?.direction} ${strategy.trigger_params?.value}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                      <div className="text-xs text-gray-500">Action</div>
                      <div className="font-medium text-sm font-mono">
                        {strategy.action_params?.amount} {strategy.action_params?.tokenIn} → {strategy.action_params?.tokenOut}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                      <div className="text-xs text-gray-500">Type</div>
                      <div className="font-medium text-sm capitalize">{strategy.trigger_type}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                      <div className="text-xs text-gray-500">Created</div>
                      <div className="font-medium text-sm">
                        {new Date(strategy.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {strategy.status === 'active' && (
                      <button
                        onClick={() => handlePause(strategy.id)}
                        className="px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 text-sm font-medium hover:bg-yellow-500/30 transition-colors flex items-center gap-2"
                      >
                        <Pause className="w-4 h-4" />
                        Pause
                      </button>
                    )}
                    {strategy.status === 'paused' && (
                      <button
                        onClick={() => handleResume(strategy.id)}
                        className="px-4 py-2 rounded-lg bg-[#00FF88]/20 text-[#00FF88] text-sm font-medium hover:bg-[#00FF88]/30 transition-colors flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Resume
                      </button>
                    )}
                    <button
                      onClick={() => handleExecute(strategy.id)}
                      className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-colors flex items-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      Execute Now
                    </button>
                    <button
                      onClick={() => handleDelete(strategy.id)}
                      className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <div className="bg-white/5 rounded-2xl p-12 text-center border border-white/10 backdrop-blur-xl">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <History className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-300 mb-2">No Transactions Yet</h3>
                <p className="text-sm text-gray-500">Your transaction history will appear here.</p>
              </div>
            ) : (
              transactions.map((tx, index) => (
                <div key={tx.id} className="bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-xl animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">{tx.strategy_name || 'Unknown Strategy'}</h3>
                      <p className="text-sm text-gray-400 mt-1 capitalize">{tx.action_type}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      tx.status === 'success' ? 'bg-[#00FF88]/20 text-[#00FF88]' :
                      tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {tx.status}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                      <div className="text-xs text-gray-500">TX Hash</div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm truncate">
                          {tx.tx_hash ? `${tx.tx_hash.slice(0, 10)}...${tx.tx_hash.slice(-8)}` : 'N/A'}
                        </span>
                        {tx.tx_hash && (
                          <button
                            onClick={() => copyToClipboard(tx.tx_hash!)}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                          >
                            <Copy className="w-3 h-3 text-gray-400" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                      <div className="text-xs text-gray-500">Gas Used</div>
                      <div className="font-medium text-sm font-mono">{tx.gas_used || 'N/A'}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                      <div className="text-xs text-gray-500">Time</div>
                      <div className="font-medium text-sm">
                        {new Date(tx.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span>SentinelSwap</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-pink-500"></div>
              Uniswap
            </span>
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              0G AI
            </span>
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              KeeperHub
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}