import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '../../data/sentinelswap.db');

let db: Database.Database | null = null;
let useInMemory = false;

// In-memory fallback for serverless environments
const inMemoryStrategies: any[] = [];
const inMemoryTransactions: any[] = [];

export function getDatabase(): Database.Database | null {
  if (useInMemory) return null;
  
  if (!db) {
    try {
      const fs = require('fs');
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      db = new Database(DB_PATH);
      db.pragma('journal_mode = WAL');
      initializeDatabase();
    } catch (error) {
      console.warn('SQLite not available, using in-memory storage:', error);
      useInMemory = true;
      return null;
    }
  }
  return db;
}

function initializeDatabase(): void {
  const database = getDatabase();
  if (!database) return;

  database.exec(`
    CREATE TABLE IF NOT EXISTS strategies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      prompt TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      trigger_params TEXT NOT NULL,
      action_type TEXT NOT NULL,
      action_params TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      keeper_task_id TEXT,
      wallet_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      strategy_id TEXT REFERENCES strategies(id),
      tx_hash TEXT,
      status TEXT DEFAULT 'pending',
      action_type TEXT,
      action_details TEXT,
      gas_used TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Strategy CRUD operations
export function createStrategy(strategy: {
  id: string;
  name: string;
  prompt: string;
  trigger_type: string;
  trigger_params: object;
  action_type: string;
  action_params: object;
  wallet_address?: string;
}): void {
  const database = getDatabase();
  if (database) {
    const stmt = database.prepare(`
      INSERT INTO strategies (id, name, prompt, trigger_type, trigger_params, action_type, action_params, wallet_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      strategy.id,
      strategy.name,
      strategy.prompt,
      strategy.trigger_type,
      JSON.stringify(strategy.trigger_params),
      strategy.action_type,
      JSON.stringify(strategy.action_params),
      strategy.wallet_address || null
    );
  } else {
    inMemoryStrategies.push({
      ...strategy,
      trigger_params: JSON.stringify(strategy.trigger_params),
      action_params: JSON.stringify(strategy.action_params),
      status: 'active',
      keeper_task_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
}

export function getStrategy(id: string): any {
  const database = getDatabase();
  if (database) {
    const stmt = database.prepare('SELECT * FROM strategies WHERE id = ?');
    const row = stmt.get(id) as any;
    if (row) {
      row.trigger_params = JSON.parse(row.trigger_params);
      row.action_params = JSON.parse(row.action_params);
    }
    return row;
  } else {
    const row = inMemoryStrategies.find(s => s.id === id);
    if (row) {
      return {
        ...row,
        trigger_params: JSON.parse(row.trigger_params),
        action_params: JSON.parse(row.action_params)
      };
    }
    return null;
  }
}

export function getAllStrategies(): any[] {
  const database = getDatabase();
  if (database) {
    const stmt = database.prepare('SELECT * FROM strategies ORDER BY created_at DESC');
    const rows = stmt.all() as any[];
    return rows.map(row => ({
      ...row,
      trigger_params: JSON.parse(row.trigger_params),
      action_params: JSON.parse(row.action_params)
    }));
  } else {
    return inMemoryStrategies.map(row => ({
      ...row,
      trigger_params: JSON.parse(row.trigger_params),
      action_params: JSON.parse(row.action_params)
    }));
  }
}

export function updateStrategyStatus(id: string, status: string, keeper_task_id?: string): void {
  const database = getDatabase();
  if (database) {
    const stmt = database.prepare(`
      UPDATE strategies SET status = ?, keeper_task_id = COALESCE(?, keeper_task_id), updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(status, keeper_task_id || null, id);
  } else {
    const idx = inMemoryStrategies.findIndex(s => s.id === id);
    if (idx !== -1) {
      inMemoryStrategies[idx].status = status;
      if (keeper_task_id) inMemoryStrategies[idx].keeper_task_id = keeper_task_id;
      inMemoryStrategies[idx].updated_at = new Date().toISOString();
    }
  }
}

export function deleteStrategy(id: string): void {
  const database = getDatabase();
  if (database) {
    const stmt = database.prepare('DELETE FROM strategies WHERE id = ?');
    stmt.run(id);
  } else {
    const idx = inMemoryStrategies.findIndex(s => s.id === id);
    if (idx !== -1) inMemoryStrategies.splice(idx, 1);
  }
}

// Transaction operations
export function createTransaction(tx: {
  id: string;
  strategy_id: string;
  tx_hash?: string;
  status: string;
  action_type: string;
  action_details: object;
  gas_used?: string;
}): void {
  const database = getDatabase();
  if (database) {
    const stmt = database.prepare(`
      INSERT INTO transactions (id, strategy_id, tx_hash, status, action_type, action_details, gas_used)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      tx.id,
      tx.strategy_id,
      tx.tx_hash || null,
      tx.status,
      tx.action_type,
      JSON.stringify(tx.action_details),
      tx.gas_used || null
    );
  } else {
    inMemoryTransactions.push({
      ...tx,
      action_details: JSON.stringify(tx.action_details),
      created_at: new Date().toISOString()
    });
  }
}

export function getTransactionsByStrategy(strategy_id: string): any[] {
  const database = getDatabase();
  if (database) {
    const stmt = database.prepare('SELECT * FROM transactions WHERE strategy_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(strategy_id) as any[];
    return rows.map(row => ({
      ...row,
      action_details: JSON.parse(row.action_details)
    }));
  } else {
    return inMemoryTransactions
      .filter(t => t.strategy_id === strategy_id)
      .map(row => ({
        ...row,
        action_details: JSON.parse(row.action_details)
      }));
  }
}

export function getAllTransactions(): any[] {
  const database = getDatabase();
  if (database) {
    const stmt = database.prepare(`
      SELECT t.*, s.name as strategy_name 
      FROM transactions t 
      LEFT JOIN strategies s ON t.strategy_id = s.id 
      ORDER BY t.created_at DESC
    `);
    const rows = stmt.all() as any[];
    return rows.map(row => ({
      ...row,
      action_details: JSON.parse(row.action_details)
    }));
  } else {
    return inMemoryTransactions.map(row => {
      const strategy = inMemoryStrategies.find(s => s.id === row.strategy_id);
      return {
        ...row,
        strategy_name: strategy?.name || 'Unknown',
        action_details: JSON.parse(row.action_details)
      };
    });
  }
}

export function updateTransactionStatus(id: string, status: string, tx_hash?: string, gas_used?: string): void {
  const database = getDatabase();
  if (database) {
    const stmt = database.prepare(`
      UPDATE transactions SET status = ?, tx_hash = COALESCE(?, tx_hash), gas_used = COALESCE(?, gas_used)
      WHERE id = ?
    `);
    stmt.run(status, tx_hash || null, gas_used || null, id);
  } else {
    const idx = inMemoryTransactions.findIndex(t => t.id === id);
    if (idx !== -1) {
      inMemoryTransactions[idx].status = status;
      if (tx_hash) inMemoryTransactions[idx].tx_hash = tx_hash;
      if (gas_used) inMemoryTransactions[idx].gas_used = gas_used;
    }
  }
}