'use client';

import { useState, useEffect, useRef } from 'react';
import { Activity, Brain, Zap, CheckCircle, XCircle, Eye, TrendingUp, Wifi, WifiOff } from 'lucide-react';

interface AgentActivity {
  id: string;
  timestamp: string;
  type: 'thinking' | 'analysis' | 'decision' | 'action' | 'success' | 'error' | 'monitoring';
  message: string;
  details?: any;
  strategyId?: string;
}

interface AgentDashboardProps {
  api_url: string;
}

export default function AgentDashboard({ api_url }: AgentDashboardProps) {
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState({
    checksPerformed: 0,
    strategiesExecuted: 0,
    activeStrategies: 0
  });
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Connect to WebSocket - use root path, not /api
    const wsUrl = api_url.replace('http', 'ws').replace('/api', '');
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('🔌 WebSocket connected');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'initial') {
        setActivities(data.activities);
      } else if (data.type === 'activity') {
        setActivities(prev => [data.activity, ...prev.slice(0, 99)]);
      }
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };

    // Fetch agent state
    fetchAgentState();

    return () => {
      ws.close();
    };
  }, [api_url]);

  useEffect(() => {
    // Auto-scroll to top when new activity arrives
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [activities]);

  const fetchAgentState = async () => {
    try {
      const res = await fetch(`${api_url}/agent/state`);
      const data = await res.json();
      setStats({
        checksPerformed: data.checksPerformed || 0,
        strategiesExecuted: data.strategiesExecuted || 0,
        activeStrategies: data.activeStrategies || 0
      });
    } catch (err) {
      console.error('Failed to fetch agent state:', err);
    }
  };

  const getActivityIcon = (type: AgentActivity['type']) => {
    switch (type) {
      case 'thinking':
        return <Brain className="w-4 h-4 text-purple-400 animate-pulse" />;
      case 'analysis':
        return <TrendingUp className="w-4 h-4 text-blue-400" />;
      case 'decision':
        return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'action':
        return <Activity className="w-4 h-4 text-orange-400 animate-pulse" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'monitoring':
        return <Eye className="w-4 h-4 text-gray-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActivityColor = (type: AgentActivity['type']) => {
    switch (type) {
      case 'thinking':
        return 'border-purple-500/30 bg-purple-500/5';
      case 'analysis':
        return 'border-blue-500/30 bg-blue-500/5';
      case 'decision':
        return 'border-yellow-500/30 bg-yellow-500/5';
      case 'action':
        return 'border-orange-500/30 bg-orange-500/5';
      case 'success':
        return 'border-green-500/30 bg-green-500/5';
      case 'error':
        return 'border-red-500/30 bg-red-500/5';
      case 'monitoring':
        return 'border-gray-500/30 bg-gray-500/5';
      default:
        return 'border-gray-500/30 bg-gray-500/5';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            Agent Activity Feed
          </h3>
          <div className="flex items-center gap-2">
            {connected ? (
              <div className="flex items-center gap-1 text-green-400 text-xs">
                <Wifi className="w-3 h-3" />
                <span>Live</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-400 text-xs">
                <WifiOff className="w-3 h-3" />
                <span>Disconnected</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-black/30 rounded-lg p-2 text-center">
            <p className="text-xs text-gray-400">Checks</p>
            <p className="text-lg font-bold font-mono text-blue-400">{stats.checksPerformed}</p>
          </div>
          <div className="bg-black/30 rounded-lg p-2 text-center">
            <p className="text-xs text-gray-400">Executed</p>
            <p className="text-lg font-bold font-mono text-green-400">{stats.strategiesExecuted}</p>
          </div>
          <div className="bg-black/30 rounded-lg p-2 text-center">
            <p className="text-xs text-gray-400">Active</p>
            <p className="text-lg font-bold font-mono text-purple-400">{stats.activeStrategies}</p>
          </div>
        </div>
      </div>

      {/* Activity List */}
      <div ref={scrollRef} className="h-[400px] overflow-y-auto p-4 space-y-2">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Activity className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Waiting for agent activity...</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className={`rounded-lg p-3 border transition-all ${getActivityColor(activity.type)}`}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5">{getActivityIcon(activity.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white break-words">{activity.message}</p>
                  {activity.details && (
                    <details className="mt-1">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                        View details
                      </summary>
                      <pre className="mt-1 text-xs text-gray-400 bg-black/30 rounded p-2 overflow-x-auto">
                        {JSON.stringify(activity.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {formatTime(activity.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 text-center">
        <p className="text-xs text-gray-500">
          Agent checks every 30 seconds • Real-time updates via WebSocket
        </p>
      </div>
    </div>
  );
}