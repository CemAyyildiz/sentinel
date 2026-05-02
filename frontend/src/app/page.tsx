'use client';

import { useState, useEffect } from 'react';
import { Zap, Shield, TrendingUp, Clock, ChevronRight, Sparkles, Activity, Wallet, History, Settings, CheckCircle, XCircle, AlertCircle, Loader2, Copy, ExternalLink, RefreshCw } from 'lucide-react';

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

export default function Home() {
  const [activeTab, setActiveTab] = useState<'create' | 'strategies' | 'history'>('create');
  const [prompt, setPrompt] = useState('');
  const [parsedStrategy, setParsedStrategy] = useState<ParsedStrategy | null>(null);
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

  const handleParse = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/strategies/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      setParsedStrategy(data);
      showToast('success', 'Strategy parsed successfully!');
    } catch (err) {
      showToast('error', 'Failed to parse strategy');
    }
    setLoading(false);
  };

  const handleDeploy = async () => {
    if (!parsedStrategy) return;
    setLoading(true);
    try {
      const deployRes = await fetch(`${API_URL}/strategies/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyId: parsedStrategy.id,
          walletAddress: walletAddress || undefined
        })
      });

      if (!deployRes.ok) throw new Error('Failed to deploy');

      setParsedStrategy(null);
      setPrompt('');
      fetchStrategies();
      setActiveTab('strategies');
      showToast('success', 'Strategy deployed successfully!');
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
    "ETH düşünce sat, AAVE yatır",
    "ETH $3000 gelirse AAVE çek, ETH al",
    "USDC yatır AAVE'ye"
  ];

  const activeStrategies = strategies.filter(s => s.status === 'active').length;
  const totalExecuted = transactions.filter(t => t.status === 'success').length;

  return (
    <div className="min-h-screen">
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
      <header className="border-b border-dark-700/50 glass sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">SentinelSwap</h1>
              <p className="text-xs text-dark-400">Autonomous DeFi Agent</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg bg-dark-800/50 border border-dark-700/50 hover:bg-dark-700/50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-dark-300 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800/50 border border-dark-700/50">
              <div className="w-2 h-2 rounded-full bg-green-500 live-pulse"></div>
              <span className="text-sm text-dark-300">ETH ${ethPrice.toLocaleString()}</span>
            </div>
            {isConnected ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30">
                <Wallet className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-300">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
              >
                <Wallet className="w-4 h-4" />
                <span className="text-sm font-medium">Connect Wallet</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-dark-400">Total Strategies</p>
                <p className="text-2xl font-bold">{strategies.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary-400" />
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-dark-400">Active</p>
                <p className="text-2xl font-bold text-green-400">{activeStrategies}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-dark-400">Executed</p>
                <p className="text-2xl font-bold text-blue-400">{totalExecuted}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-dark-400">ETH Price</p>
                <p className="text-2xl font-bold">${ethPrice.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            <span className="gradient-text">AI-Powered</span> DeFi Strategies
          </h2>
          <p className="text-dark-400 max-w-2xl mx-auto">
            Describe your trading strategy in plain English. Our AI parses it, estimates routes via Uniswap,
            and deploys it as an autonomous agent on-chain.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {[
            { id: 'create', icon: Sparkles, label: 'Create Strategy' },
            { id: 'strategies', icon: Activity, label: `My Strategies (${strategies.length})` },
            { id: 'history', icon: History, label: `History (${transactions.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white glow-primary'
                  : 'bg-dark-800/50 text-dark-300 hover:bg-dark-700/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Create Strategy Tab */}
        {activeTab === 'create' && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="space-y-6">
              <div className="glass rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary-400" />
                  Describe Your Strategy
                </h3>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., Buy ETH with 500 USDC when ETH drops below $2,400"
                  className="w-full h-32 bg-dark-900/50 border border-dark-700/50 rounded-xl p-4 text-dark-100 placeholder:text-dark-500 outline-none focus:border-primary-500/50 resize-none transition-colors"
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  {examplePrompts.map((example, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(example)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-dark-800/50 text-dark-400 hover:text-dark-200 hover:bg-dark-700/50 transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleParse}
                  disabled={loading || !prompt.trim()}
                  className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-accent-600 text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Parse Strategy
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Preview Section */}
            <div className="space-y-6">
              {parsedStrategy ? (
                <div className="glass rounded-2xl p-6 glow-accent animate-fade-in">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-accent-400" />
                    Parsed Strategy
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-dark-900/50">
                      <div className="text-sm text-dark-400 mb-1">Name</div>
                      <div className="text-lg font-semibold">{parsedStrategy.name}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-dark-900/50">
                        <div className="text-sm text-dark-400 mb-1">Trigger</div>
                        <div className="font-medium">
                          {parsedStrategy.trigger.token} {parsedStrategy.trigger.direction} ${parsedStrategy.trigger.value.toLocaleString()}
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-dark-900/50">
                        <div className="text-sm text-dark-400 mb-1">Action</div>
                        <div className="font-medium">
                          {parsedStrategy.action.type === 'swap' ? 'Swap' : parsedStrategy.action.type} {parsedStrategy.action.amount} {parsedStrategy.action.tokenIn} → {parsedStrategy.action.tokenOut}
                        </div>
                      </div>
                    </div>
                    {parsedStrategy.estimatedRoute && (
                      <div className="p-4 rounded-xl bg-dark-900/50">
                        <div className="text-sm text-dark-400 mb-2">Estimated Route</div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-xs text-dark-500">Quote</div>
                            <div className="font-medium text-green-400">
                              {(parseFloat(parsedStrategy.estimatedRoute.quote) / 1e18).toFixed(4)} {parsedStrategy.action.tokenOut}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-dark-500">Gas</div>
                            <div className="font-medium text-yellow-400">
                              {parsedStrategy.estimatedRoute.gasEstimate}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-dark-500">Impact</div>
                            <div className="font-medium text-blue-400">
                              {parsedStrategy.estimatedRoute.priceImpact}%
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-sm text-green-400">
                        Confidence: {(parsedStrategy.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <button
                      onClick={handleDeploy}
                      disabled={loading}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Shield className="w-5 h-5" />
                          Deploy Strategy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="glass rounded-2xl p-6 flex flex-col items-center justify-center h-80 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-dark-800/50 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-dark-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-dark-300 mb-2">No Strategy Parsed</h3>
                  <p className="text-sm text-dark-500 max-w-xs">
                    Enter a natural language trading strategy and click "Parse Strategy" to see the AI-generated preview.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Strategies Tab */}
        {activeTab === 'strategies' && (
          <div className="space-y-4">
            {strategies.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-dark-800/50 flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-dark-500" />
                </div>
                <h3 className="text-lg font-semibold text-dark-300 mb-2">No Strategies Yet</h3>
                <p className="text-sm text-dark-500">Create your first strategy to get started.</p>
              </div>
            ) : (
              strategies.map((strategy, index) => (
                <div key={strategy.id} className="glass rounded-2xl p-6 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{strategy.name}</h3>
                      <p className="text-sm text-dark-400 mt-1">{strategy.prompt}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      strategy.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      strategy.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                      strategy.status === 'executed' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {strategy.status}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-dark-900/50">
                      <div className="text-xs text-dark-500">Trigger</div>
                      <div className="font-medium text-sm">
                        {strategy.trigger_params?.token} {strategy.trigger_params?.direction} ${strategy.trigger_params?.value}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-dark-900/50">
                      <div className="text-xs text-dark-500">Action</div>
                      <div className="font-medium text-sm">
                        {strategy.action_params?.amount} {strategy.action_params?.tokenIn} → {strategy.action_params?.tokenOut}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-dark-900/50">
                      <div className="text-xs text-dark-500">Type</div>
                      <div className="font-medium text-sm capitalize">{strategy.trigger_type}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-dark-900/50">
                      <div className="text-xs text-dark-500">Created</div>
                      <div className="font-medium text-sm">
                        {new Date(strategy.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {strategy.status === 'active' && (
                      <button
                        onClick={() => handlePause(strategy.id)}
                        className="px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 text-sm font-medium hover:bg-yellow-500/30 transition-colors"
                      >
                        Pause
                      </button>
                    )}
                    {strategy.status === 'paused' && (
                      <button
                        onClick={() => handleResume(strategy.id)}
                        className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 text-sm font-medium hover:bg-green-500/30 transition-colors"
                      >
                        Resume
                      </button>
                    )}
                    <button
                      onClick={() => handleExecute(strategy.id)}
                      className="px-4 py-2 rounded-lg bg-primary-500/20 text-primary-400 text-sm font-medium hover:bg-primary-500/30 transition-colors"
                    >
                      Execute Now
                    </button>
                    <button
                      onClick={() => handleDelete(strategy.id)}
                      className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors"
                    >
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
              <div className="glass rounded-2xl p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-dark-800/50 flex items-center justify-center mx-auto mb-4">
                  <History className="w-8 h-8 text-dark-500" />
                </div>
                <h3 className="text-lg font-semibold text-dark-300 mb-2">No Transactions Yet</h3>
                <p className="text-sm text-dark-500">Your transaction history will appear here.</p>
              </div>
            ) : (
              transactions.map((tx, index) => (
                <div key={tx.id} className="glass rounded-2xl p-6 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">{tx.strategy_name || 'Unknown Strategy'}</h3>
                      <p className="text-sm text-dark-400 mt-1 capitalize">{tx.action_type}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      tx.status === 'success' ? 'bg-green-500/20 text-green-400' :
                      tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {tx.status}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg bg-dark-900/50">
                      <div className="text-xs text-dark-500">TX Hash</div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm truncate">
                          {tx.tx_hash ? `${tx.tx_hash.slice(0, 10)}...${tx.tx_hash.slice(-8)}` : 'N/A'}
                        </span>
                        {tx.tx_hash && (
                          <button
                            onClick={() => copyToClipboard(tx.tx_hash!)}
                            className="p-1 hover:bg-dark-700/50 rounded transition-colors"
                          >
                            <Copy className="w-3 h-3 text-dark-400" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-dark-900/50">
                      <div className="text-xs text-dark-500">Gas Used</div>
                      <div className="font-medium text-sm">{tx.gas_used || 'N/A'}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-dark-900/50">
                      <div className="text-xs text-dark-500">Time</div>
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
      <footer className="border-t border-dark-700/50 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between text-sm text-dark-500">
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