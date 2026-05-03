// Agent Activity Feed - Real-time agent thoughts and decisions

export interface AgentActivity {
  id: string;
  timestamp: Date;
  type: 'thinking' | 'analysis' | 'decision' | 'action' | 'success' | 'error' | 'monitoring';
  message: string;
  details?: any;
  strategyId?: string;
}

type ActivityListener = (activity: AgentActivity) => void;

const activities: AgentActivity[] = [];
const listeners: ActivityListener[] = [];
let activityId = 0;

export function addActivity(
  type: AgentActivity['type'],
  message: string,
  details?: any,
  strategyId?: string
): AgentActivity {
  const activity: AgentActivity = {
    id: `act_${++activityId}`,
    timestamp: new Date(),
    type,
    message,
    details,
    strategyId
  };

  activities.unshift(activity); // Add to beginning
  
  // Keep only last 100 activities
  if (activities.length > 100) {
    activities.pop();
  }

  // Notify all listeners
  listeners.forEach(listener => listener(activity));

  // Console log with emoji
  const emoji = {
    thinking: '🤔',
    analysis: '📊',
    decision: '💡',
    action: '⚡',
    success: '✅',
    error: '❌',
    monitoring: '👁️'
  }[type];

  console.log(`${emoji} [Agent] ${message}`);

  return activity;
}

export function getActivities(limit = 50): AgentActivity[] {
  return activities.slice(0, limit);
}

export function subscribeToActivities(listener: ActivityListener): () => void {
  listeners.push(listener);
  
  // Return unsubscribe function
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
}

export function clearActivities(): void {
  activities.length = 0;
}