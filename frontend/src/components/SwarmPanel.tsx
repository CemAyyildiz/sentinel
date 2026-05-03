'use client';

import { useState, useEffect } from 'react';
import { Bot, Cpu, Eye, Zap, Network, Shield, RefreshCw, CheckCircle, Clock, Activity } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  role: 'architect' | 'executor' | 'monitor';
  status: 'idle' | 'working' | 'completed' | 'error';
  ensName: string;
  lastActivity: string;
  tasksCompleted: number;
}

interface SwarmTask {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedTo: string;
  createdAt: string;
  completedAt?: string;
  result?: any;
}

interface SwarmPanelProps {
  api_url: string;
}

export default function SwarmPanel({ api_url }: SwarmPanelProps) {
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: 'architect-001',
      name: 'Architect',
      role: 'architect',
      status: 'idle',
      ensName: 'architect.sentinelswap.eth',
      lastActivity: new Date().toISOString(),
      tasksCompleted: 0
    },
    {
      id: 'executor-001',
      name: 'Executor',
      role: 'executor',
      status: 'idle',
      ensName: 'executor.sentinelswap.eth',
      lastActivity: new Date().toISOString(),
      tasksCompleted: 0
    },
    {
      id: 'monitor-001',
      name: 'Monitor',
      role: 'monitor',
      status: 'idle',
      ensName: 'monitor.sentinelswap.eth',
      lastActivity: new Date().toISOString(),
      tasksCompleted: 0
    }
  ]);

  const [tasks, setTasks] = useState<SwarmTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [swarmStatus, setSwarmStatus] = useState<any>(null);

  useEffect(() => {
    fetchSwarmStatus();
    const interval = setInterval(fetchSwarmStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchSwarmStatus = async () => {
    try {
      const res = await fetch(`${api_url}/swarm/status`);
      const data = await res.json();
      if (data.success) {
        setSwarmStatus(data);
        if (data.agents) {
          setAgents(data.agents);
        }
        if (data.recentTasks) {
          setTasks(data.recentTasks);
        }
      }
    } catch (err) {
      console.error('Failed to fetch swarm status:', err);
    }
  };

  const handleCreateTask = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${api_url}/swarm/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'strategy_analysis',
          description: 'Analyze current market conditions and suggest optimal strategy',
          priority: 'medium'
        })
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => [data.task, ...prev]);
        fetchSwarmStatus();
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    }
    setLoading(false);
  };

  const getAgentIcon = (role: Agent['role']) => {
    switch (role) {
      case 'architect':
        return <Cpu className="w-5 h-5 text-blue-400" />;
      case 'executor':
        return <Zap className="w-5 h-5 text-orange-400" />;
      case 'monitor':
        return <Eye className="w-5 h-5 text-purple-400" />;
    }
  };

  const getAgentColor = (role: Agent['role']) => {
    switch (role) {
      case 'architect':
        return 'from-blue-500/20 to-blue-600/10 border-blue-500/30';
      case 'executor':
        return 'from-orange-500/20 to-orange-600/10 border-orange-500/30';
      case 'monitor':
        return 'from-purple-500/20 to-purple-600/10 border-purple-500/30';
    }
  };

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'idle':
        return 'text-gray-400';
      case 'working':
        return 'text-yellow-400 animate-pulse';
      case 'completed':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
    }
  };

  const getTaskStatusIcon = (status: SwarmTask['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'in_progress':
        return <Activity className="w-4 h-4 text-yellow-400 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <Shield className="w-4 h-4 text-red-400" />;
    }
  };

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Network className="w-5 h-5 text-[#00FF88]" />
            Multi-Agent Swarm
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse"></div>
              {agents.filter(a => a.status === 'working').length} Active
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">Coordinated AI agents for DeFi operations</p>
      </div>

      {/* Agents Grid */}
      <div className="p-4 space-y-3">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className={`bg-gradient-to-r ${getAgentColor(agent.role)} rounded-xl p-4 border transition-all hover:scale-[1.02]`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-black/30 flex items-center justify-center">
                  {getAgentIcon(agent.role)}
                </div>
                <div>
                  <h4 className="font-medium text-sm">{agent.name}</h4>
                  <p className="text-xs text-gray-400 font-mono">{agent.ensName}</p>
                </div>
              </div>
              <div className={`text-xs font-medium ${getStatusColor(agent.status)}`}>
                {agent.status === 'working' && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                    Working
                  </span>
                )}
                {agent.status === 'idle' && 'Idle'}
                {agent.status === 'completed' && 'Completed'}
                {agent.status === 'error' && 'Error'}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Tasks: {agent.tasksCompleted}</span>
              <span>Last: {new Date(agent.lastActivity).toLocaleTimeString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Task Queue */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-300">Task Queue</h4>
          <button
            onClick={handleCreateTask}
            disabled={loading}
            className="text-xs px-3 py-1 rounded-lg bg-[#00FF88]/20 text-[#00FF88] hover:bg-[#00FF88]/30 transition-colors flex items-center gap-1"
          >
            {loading ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Zap className="w-3 h-3" />
            )}
            New Task
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No tasks in queue</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {tasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="bg-black/30 rounded-lg p-3 border border-white/5"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium truncate flex-1">{task.description}</span>
                  {getTaskStatusIcon(task.status)}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Assigned: {task.assignedTo}</span>
                  <span>{new Date(task.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Swarm Stats */}
      {swarmStatus && (
        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-gray-500">Total Tasks</p>
              <p className="text-lg font-bold font-mono text-blue-400">{swarmStatus.totalTasks || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Completed</p>
              <p className="text-lg font-bold font-mono text-green-400">{swarmStatus.completedTasks || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Success Rate</p>
              <p className="text-lg font-bold font-mono text-purple-400">
                {swarmStatus.totalTasks > 0 
                  ? `${((swarmStatus.completedTasks / swarmStatus.totalTasks) * 100).toFixed(0)}%`
                  : '0%'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}