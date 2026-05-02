'use client';

import { useState, useEffect } from 'react';
import { Shield, Zap, Activity, Clock, ChevronRight, Sparkles, Send, Wallet, History, CheckCircle, XCircle, AlertCircle, Loader2, Copy, ExternalLink, RefreshCw, MessageSquare, TrendingUp, Pause, Play, Trash2, ArrowRight } from 'lucide-react';

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
  type: 'user' | 'system' | 'strategy';
  content: string;
  strategy?: ParsedStrategy;
  timestamp: Date;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'create' | 'strategies' | 'history'>('create');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'system',
      content: 'Welcome to SentinelSwap! Describe your DeFi strategy in plain English, and I\'ll parse it into an executable autonomous agent.',
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

  useEffect(() => {
    fetchStrategies();
    fetchTransactions();
    fetchPrice();
    checkWalletConnection();
  }, []);

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

    try {
      const res = await fetch(`${API_URL}/strategies/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      
      const systemMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'strategy',
        content: `I've parsed your strategy: "${data.name}"`,
        strategy: data,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, systemMessage]);
      showToast('success', 'Strategy parsed successfully!');
    } catch (err) {
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
        content: `Strategy "${strategy.name}" deployed successfully! The autonomous agent will monitor conditions and execute when triggered.`,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, successMessage]);
      fetchStrategies();
      showToast('success', 'Strategy deployed!');
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
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg animate-slide-in ${
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00FF88] to-[#00CC6A] flex items-center justify-center">
              <Shield className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold">SentinelSwap</h1>
              <p className="text-xs text-gray-400">Autonomous DeFi Agent</p>
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
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#00FF88] text-black font-semibold hover:bg-[#00CC6A] transition-colors"
              >
                <Wallet className="w-4 h-4" />
                <span className="text-sm">Connect Wallet</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
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
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Active</p>
                <p className="text-2xl font-bold font-mono text-[#00FF88]">{activeStrategies}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#00FF88]/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#00FF88]" />
              </div>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Executed</p>
                <p className="text-2xl font-bold font-mono text-blue-400">{totalExecuted}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
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
                  ? 'bg-[#00FF88] text-black'
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
            <div className="lg:col-span-2 bg-white/5 rounded-2xl border border-white/10 flex flex-col h-[600px]">
              {/* Chat Header */}
              <div className="p-4 border-b border-white/10">
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#00FF88]" />
                  AI Strategy Parser
                </h3>
                <p className="text-sm text-gray-400 mt-1">Describe your strategy in natural language</p>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-4 ${
                      msg.type === 'user' 
                        ? 'bg-[#00FF88] text-black' 
                        : msg.type === 'strategy'
                        ? 'bg-white/10 border border-[#00FF88]/30'
                        : 'bg-white/10'
                    }`}>
                      <p className="text-sm">{msg.content}</p>
                      
                      {/* Strategy Card */}
                      {msg.strategy && (
                        <div className="mt-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-black/20 rounded-lg p-3">
                              <div className="text-xs text-gray-400 mb-1">Trigger</div>
                              <div className="font-medium text-sm">
                                {msg.strategy.trigger.token} {msg.strategy.trigger.direction} ${msg.strategy.trigger.value.toLocaleString()}
                              </div>
                            </div>
                            <div className="bg-black/20 rounded-lg p-3">
                              <div className="text-xs text-gray-400 mb-1">Action</div>
                              <div className="font-medium text-sm">
                                {msg.strategy.action.type === 'swap' ? 'Swap' : msg.strategy.action.type} {msg.strategy.action.amount} {msg.strategy.action.tokenIn} → {msg.strategy.action.tokenOut}
                              </div>
                            </div>
                          </div>
                          
                          {msg.strategy.estimatedRoute && (
                            <div className="bg-black/20 rounded-lg p-3">
                              <div className="text-xs text-gray-400 mb-2">Estimated Route</div>
                              <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                  <div className="text-xs text-gray-500">Quote</div>
                                  <div className="font-medium text-sm text-[#00FF88]">
                                    {(parseFloat(msg.strategy.estimatedRoute.quote) / 1e18).toFixed(4)} {msg.strategy.action.tokenOut}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500">Gas</div>
                                  <div className="font-medium text-sm text-yellow-400">
                                    {msg.strategy.estimatedRoute.gasEstimate}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500">Impact</div>
                                  <div className="font-medium text-sm text-blue-400">
                                    {msg.strategy.estimatedRoute.priceImpact}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 text-sm text-[#00FF88]">
                            <div className="w-2 h-2 rounded-full bg-[#00FF88]"></div>
                            Confidence: {(msg.strategy.confidence * 100).toFixed(0)}%
                          </div>
                          
                          <button
                            onClick={() => handleDeploy(msg.strategy!)}
                            disabled={loading}
                            className="w-full py-3 rounded-xl bg-[#00FF88] text-black font-semibold hover:bg-[#00CC6A] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                          >
                            {loading ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <>
                                <Shield className="w-5 h-5" />
                                Deploy Autonomous Agent
                              </>
                            )}
                          </button>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500 mt-2">
                        {msg.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 rounded-2xl p-4">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[#00FF88]" />
                        <span className="text-sm text-gray-400">Parsing strategy...</span>
                      </div>
                    </div>
                  </div>
                )}
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
                    className="px-6 py-3 rounded-xl bg-[#00FF88] text-black font-semibold hover:bg-[#00CC6A] disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Example Prompts */}
            <div className="space-y-6">
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#00FF88]" />
                  Example Strategies
                </h3>
                <div className="space-y-3">
                  {examplePrompts.map((example, i) => (
                    <button
                      key={i}
                      onClick={() => setInputValue(example)}
                      className="w-full text-left p-3 rounded-lg bg-black/30 border border-white/10 hover:border-[#00FF88]/30 transition-colors text-sm text-gray-300 hover:text-white"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#00FF88]" />
                  How It Works
                </h3>
                <div className="space-y-4 text-sm text-gray-400">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#00FF88]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs text-[#00FF88]">1</span>
                    </div>
                    <p>Describe your strategy in plain English</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#00FF88]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs text-[#00FF88]">2</span>
                    </div>
                    <p>0G AI parses your intent into executable parameters</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#00FF88]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs text-[#00FF88]">3</span>
                    </div>
                    <p>Uniswap validates the trade and estimates routing</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#00FF88]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs text-[#00FF88]">4</span>
                    </div>
                    <p>KeeperHub monitors conditions and executes when triggered</p>
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
              <div className="bg-white/5 rounded-2xl p-12 text-center border border-white/10">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-300 mb-2">No Active Strategies</h3>
                <p className="text-sm text-gray-500">Create your first autonomous strategy to get started.</p>
              </div>
            ) : (
              strategies.map((strategy, index) => (
                <div key={strategy.id} className="bg-white/5 rounded-2xl p-6 border border-white/10 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{strategy.name}</h3>
                      <p className="text-sm text-gray-400 mt-1 font-mono">{strategy.prompt}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      strategy.status === 'active' ? 'bg-[#00FF88]/20 text-[#00FF88]' :
                      strategy.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                      strategy.status === 'executed' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {strategy.status === 'active' && <span className="inline-block w-2 h-2 rounded-full bg-[#00FF88] mr-2 animate-pulse"></span>}
                      {strategy.status}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-black/30">
                      <div className="text-xs text-gray-500">Trigger</div>
                      <div className="font-medium text-sm font-mono">
                        {strategy.trigger_params?.token} {strategy.trigger_params?.direction} ${strategy.trigger_params?.value}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/30">
                      <div className="text-xs text-gray-500">Action</div>
                      <div className="font-medium text-sm font-mono">
                        {strategy.action_params?.amount} {strategy.action_params?.tokenIn} → {strategy.action_params?.tokenOut}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/30">
                      <div className="text-xs text-gray-500">Type</div>
                      <div className="font-medium text-sm capitalize">{strategy.trigger_type}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/30">
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
              <div className="bg-white/5 rounded-2xl p-12 text-center border border-white/10">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <History className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-300 mb-2">No Transactions Yet</h3>
                <p className="text-sm text-gray-500">Your transaction history will appear here.</p>
              </div>
            ) : (
              transactions.map((tx, index) => (
                <div key={tx.id} className="bg-white/5 rounded-2xl p-6 border border-white/10 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
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
                    <div className="p-3 rounded-lg bg-black/30">
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
                    <div className="p-3 rounded-lg bg-black/30">
                      <div className="text-xs text-gray-500">Gas Used</div>
                      <div className="font-medium text-sm font-mono">{tx.gas_used || 'N/A'}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/30">
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
            <span>Powered by 0G AI + Uniswap + KeeperHub</span>
          </div>
        </div>
      </footer>
    </div>
  );
}