import { Strategy } from '../types';
import { KeeperHub } from 'keeperhub-sdk';

// Lazy initialization for KeeperHub SDK
let kh: KeeperHub | null = null;

function getKeeperHub(): KeeperHub {
  if (!kh) {
    const apiKey = process.env.KEEPERHUB_API_KEY;
    if (!apiKey) {
      throw new Error('KEEPERHUB_API_KEY is not set in environment variables');
    }
    kh = new KeeperHub({ apiKey });
  }
  return kh;
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
    // Use KeeperHub SDK workflows module with correct node structure
    const triggerNodeId = 'trigger_1';
    const actionNodeId = 'action_1';
    
    const workflow = await getKeeperHub().workflows.create({
      name: taskConfig.name,
      description: `Automated task for ${strategy.name}`,
      nodes: [
        {
          id: triggerNodeId,
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: {
            label: 'Trigger',
            type: taskConfig.trigger.type,
            config: taskConfig.trigger
          }
        },
        {
          id: actionNodeId,
          type: 'action',
          position: { x: 300, y: 100 },
          data: {
            label: 'Action',
            type: taskConfig.action.type,
            config: taskConfig.action
          }
        }
      ],
      edges: [
        {
          id: 'edge_1',
          source: triggerNodeId,
          target: actionNodeId
        }
      ]
    });

    const taskId = workflow.id;
    console.log(`[KeeperHub] Task created successfully: ${taskId}`);
    
    // Store locally for tracking
    taskStore.set(taskId, {
      id: taskId,
      name: strategy.name,
      status: 'active',
      trigger: taskConfig.trigger,
      action: taskConfig.action,
      createdAt: new Date().toISOString()
    });

    return taskId;
  } catch (error) {
    console.error('[KeeperHub] Failed to create task:', error);
    
    // Fallback: create local task for demo
    const localId = `task_${Date.now()}`;
    taskStore.set(localId, {
      id: localId,
      name: strategy.name,
      status: 'active',
      trigger: taskConfig.trigger,
      action: taskConfig.action,
      createdAt: new Date().toISOString()
    });
    console.log(`[KeeperHub] Created local task: ${localId}`);
    return localId;
  }
}

export async function getKeeperTaskStatus(taskId: string): Promise<KeeperTask | null> {
  try {
    // Try SDK first
    const execution = await getKeeperHub().executions.get(taskId);
    return {
      id: execution.id,
      name: execution.workflowId || 'Unknown',
      status: execution.status as any,
      trigger: {},
      action: {},
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('KeeperHub get task error:', error);
    // Fallback: check local store
    return taskStore.get(taskId) || null;
  }
}

export async function pauseKeeperTask(taskId: string): Promise<void> {
  try {
    await getKeeperHub().executions.cancel(taskId);
    const task = taskStore.get(taskId);
    if (task) {
      task.status = 'paused';
      taskStore.set(taskId, task);
    }
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
    // Re-execute workflow
    await getKeeperHub().workflows.execute(taskId);
    const task = taskStore.get(taskId);
    if (task) {
      task.status = 'active';
      taskStore.set(taskId, task);
    }
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
    await getKeeperHub().executions.cancel(taskId);
    taskStore.delete(taskId);
  } catch (error) {
    console.error('KeeperHub cancel error:', error);
    // Fallback: remove from local store
    taskStore.delete(taskId);
  }
}

export async function getAllKeeperTasks(): Promise<KeeperTask[]> {
  try {
    const workflows = await getKeeperHub().workflows.list();
    return workflows.map((w: any) => ({
      id: w.id,
      name: w.name,
      status: w.status || 'active',
      trigger: {},
      action: {},
      createdAt: w.createdAt || new Date().toISOString()
    }));
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
