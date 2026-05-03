import { Strategy } from '../types';

const KEEPERHUB_API = 'https://api.keeperhub.com/v1';

function getHeaders() {
  return {
    'Authorization': `Bearer ${process.env.KEEPERHUB_API_KEY || ''}`,
    'Content-Type': 'application/json'
  };
}

interface KeeperTask {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  trigger: any;
  action: any;
  createdAt: string;
}

// In-memory store for development (when KeeperHub API is not available)
const taskStore: Map<string, KeeperTask> = new Map();

export async function createKeeperTask(strategy: Strategy): Promise<string> {
  const taskConfig = {
    name: strategy.name,
    trigger: mapTrigger(strategy),
    action: mapAction(strategy),
    network: 'sepolia',
    retries: 3
  };

  console.log('[KeeperHub] Creating task:', JSON.stringify(taskConfig, null, 2));

  try {
    const response = await fetch(`${KEEPERHUB_API}/tasks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(taskConfig)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[KeeperHub] API error: ${response.status} - ${errorText}`);
      throw new Error(`KeeperHub API error: ${response.status} ${errorText}`);
    }

    const data = await response.json() as any;
    const taskId = data.taskId || data.id;
    console.log(`[KeeperHub] Task created successfully: ${taskId}`);
    return taskId;
  } catch (error) {
    console.error('[KeeperHub] Failed to create task:', error);
    throw new Error(`KeeperHub API is unavailable: ${error instanceof Error ? error.message : 'Unknown error'}. Cannot create real task.`);
  }
}

export async function getKeeperTaskStatus(taskId: string): Promise<KeeperTask | null> {
  try {
    const response = await fetch(`${KEEPERHUB_API}/tasks/${taskId}`, {
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error(`KeeperHub error: ${response.status}`);
    }

    return await response.json() as KeeperTask;
  } catch (error) {
    console.error('KeeperHub get task error:', error);

    // Fallback: check local store
    return taskStore.get(taskId) || null;
  }
}

export async function pauseKeeperTask(taskId: string): Promise<void> {
  try {
    await fetch(`${KEEPERHUB_API}/tasks/${taskId}/pause`, {
      method: 'POST',
      headers: getHeaders()
    });
  } catch (error) {
    console.error('KeeperHub pause error:', error);

    // Fallback: update local store
    const task = taskStore.get(taskId);
    if (task) {
      task.status = 'paused';
      taskStore.set(taskId, task);
    }
  }
}

export async function resumeKeeperTask(taskId: string): Promise<void> {
  try {
    await fetch(`${KEEPERHUB_API}/tasks/${taskId}/resume`, {
      method: 'POST',
      headers: getHeaders()
    });
  } catch (error) {
    console.error('KeeperHub resume error:', error);

    // Fallback: update local store
    const task = taskStore.get(taskId);
    if (task) {
      task.status = 'active';
      taskStore.set(taskId, task);
    }
  }
}

export async function cancelKeeperTask(taskId: string): Promise<void> {
  try {
    await fetch(`${KEEPERHUB_API}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  } catch (error) {
    console.error('KeeperHub cancel error:', error);

    // Fallback: remove from local store
    taskStore.delete(taskId);
  }
}

export async function getAllKeeperTasks(): Promise<KeeperTask[]> {
  try {
    const response = await fetch(`${KEEPERHUB_API}/tasks`, {
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error(`KeeperHub error: ${response.status}`);
    }

    return await response.json() as KeeperTask[];
  } catch (error) {
    console.error('KeeperHub list tasks error:', error);

    // Fallback: return local store
    return Array.from(taskStore.values());
  }
}

function mapTrigger(strategy: Strategy): any {
  const params = strategy.trigger_params;

  switch (strategy.trigger_type) {
    case 'price':
      return {
        type: 'price',
        condition: {
          metric: `price/${params.token}`,
          operator: params.direction === 'below' ? 'lt' : 'gt',
          value: params.value
        }
      };
    case 'apr':
      return {
        type: 'metric',
        condition: {
          metric: `apr/${params.token}`,
          operator: params.direction === 'above' ? 'gt' : 'lt',
          value: params.value
        }
      };
    default:
      return {
        type: 'price',
        condition: {
          metric: `price/${params.token}`,
          operator: params.direction === 'below' ? 'lt' : 'gt',
          value: params.value
        }
      };
  }
}

function mapAction(strategy: Strategy): any {
  const params = strategy.action_params;

  // For alert strategies, create a webhook/notification action instead of swap
  if (strategy.action_type === 'alert') {
    console.log('[KeeperHub] Creating alert action (webhook)');
    return {
      type: 'webhook',
      url: process.env.ALERT_WEBHOOK_URL || 'https://example.com/webhook',
      payload: {
        strategyId: strategy.id,
        strategyName: strategy.name,
        trigger: strategy.trigger_type,
        message: `Alert: ${strategy.name} triggered!`
      }
    };
  }

  // For swap strategies, create a contract call action
  console.log('[KeeperHub] Creating swap action (contract_call)');
  return {
    type: 'contract_call',
    target: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E', // Uniswap SwapRouter02 on Sepolia
    function: 'exactInputSingle',
    params: {
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amount
    }
  };
}
