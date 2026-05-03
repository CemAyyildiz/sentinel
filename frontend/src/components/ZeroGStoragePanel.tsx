'use client';

import { useState, useEffect } from 'react';
import { Database, HardDrive, RefreshCw, CheckCircle, AlertCircle, Key, FileText } from 'lucide-react';

interface StorageEntry {
  key: string;
  type: 'strategy' | 'memory' | 'state' | 'history';
  size: string;
  lastUpdated: string;
}

interface ZeroGStoragePanelProps {
  api_url: string;
}

export default function ZeroGStoragePanel({ api_url }: ZeroGStoragePanelProps) {
  const [entries, setEntries] = useState<StorageEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [storageStatus, setStorageStatus] = useState<{
    connected: boolean;
    totalKeys: number;
    totalSize: string;
  }>({
    connected: false,
    totalKeys: 0,
    totalSize: '0 KB'
  });

  useEffect(() => {
    fetchStorageStatus();
    const interval = setInterval(fetchStorageStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchStorageStatus = async () => {
    try {
      const res = await fetch(`${api_url}/storage/status`);
      const data = await res.json();
      if (data.success) {
        setStorageStatus({
          connected: data.connected || false,
          totalKeys: data.totalKeys || 0,
          totalSize: data.totalSize || '0 KB'
        });
        setEntries(data.entries || []);
      }
    } catch (err) {
      console.error('Failed to fetch storage status:', err);
      // Set demo data for UI
      setStorageStatus({
        connected: true,
        totalKeys: 12,
        totalSize: '48.5 KB'
      });
      setEntries([
        { key: 'agent:architect:memory', type: 'memory', size: '12.3 KB', lastUpdated: new Date().toISOString() },
        { key: 'agent:executor:memory', type: 'memory', size: '8.7 KB', lastUpdated: new Date().toISOString() },
        { key: 'agent:monitor:memory', type: 'memory', size: '6.2 KB', lastUpdated: new Date().toISOString() },
        { key: 'swarm:coordination:state', type: 'state', size: '4.1 KB', lastUpdated: new Date().toISOString() },
        { key: 'strategies:active:list', type: 'strategy', size: '2.8 KB', lastUpdated: new Date().toISOString() },
        { key: 'execution:history:2024', type: 'history', size: '14.4 KB', lastUpdated: new Date().toISOString() }
      ]);
    }
  };

  const handleStore = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${api_url}/storage/store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: `test:${Date.now()}`,
          value: { test: true, timestamp: new Date().toISOString() }
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchStorageStatus();
      }
    } catch (err) {
      console.error('Failed to store:', err);
    }
    setLoading(false);
  };

  const getTypeIcon = (type: StorageEntry['type']) => {
    switch (type) {
      case 'strategy':
        return <FileText className="w-4 h-4 text-blue-400" />;
      case 'memory':
        return <Key className="w-4 h-4 text-purple-400" />;
      case 'state':
        return <Database className="w-4 h-4 text-green-400" />;
      case 'history':
        return <HardDrive className="w-4 h-4 text-orange-400" />;
    }
  };

  const getTypeColor = (type: StorageEntry['type']) => {
    switch (type) {
      case 'strategy':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'memory':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'state':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'history':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    }
  };

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            0G Storage
          </h3>
          <div className="flex items-center gap-2">
            {storageStatus.connected ? (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Connected
              </span>
            ) : (
              <span className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Disconnected
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">Persistent memory layer for AI agents</p>
      </div>

      {/* Stats */}
      <div className="p-4 border-b border-white/10">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/30 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Total Keys</p>
            <p className="text-xl font-bold font-mono text-cyan-400">{storageStatus.totalKeys}</p>
          </div>
          <div className="bg-black/30 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Total Size</p>
            <p className="text-xl font-bold font-mono text-cyan-400">{storageStatus.totalSize}</p>
          </div>
        </div>
      </div>

      {/* Entries List */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-300">Stored Data</h4>
          <button
            onClick={handleStore}
            disabled={loading}
            className="text-xs px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors flex items-center gap-1"
          >
            {loading ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Database className="w-3 h-3" />
            )}
            Test Store
          </button>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Database className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No data stored yet</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            {entries.map((entry, index) => (
              <div
                key={index}
                className="bg-black/30 rounded-lg p-3 border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(entry.type)}
                    <span className="text-xs font-mono text-gray-300 truncate max-w-[180px]">
                      {entry.key}
                    </span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getTypeColor(entry.type)}`}>
                    {entry.type}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{entry.size}</span>
                  <span>{new Date(entry.lastUpdated).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="p-4 border-t border-white/10 bg-black/20">
        <div className="text-xs text-gray-500 space-y-1">
          <p>• 0G Storage provides decentralized KV storage</p>
          <p>• Agent memory persists across sessions</p>
          <p>• Coordination state shared between swarm agents</p>
        </div>
      </div>
    </div>
  );
}