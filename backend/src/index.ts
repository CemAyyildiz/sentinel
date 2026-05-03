import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import strategyRoutes from './routes/strategies';
import historyRoutes from './routes/history';
import marketRoutes from './routes/market';
import agentRoutes from './routes/agent';
import { startAgent } from './services/agent';
import { getActivities, subscribeToActivities } from './services/agentActivity';

dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/strategies', strategyRoutes);
app.use('/api/history', historyRoutes);
app.use('/api', marketRoutes);
app.use('/api/agent', agentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'sentinelswap-backend',
    timestamp: new Date().toISOString()
  });
});

// Activity Feed API
app.get('/api/agent/activities', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  res.json(getActivities(limit));
});

// Start server with WebSocket support
const server = createServer(app);

// WebSocket Server for real-time updates
const wss = new WebSocketServer({ server });

// Store connected clients
const clients = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  console.log('🔌 WebSocket client connected');
  clients.add(ws);

  // Send initial activities
  ws.send(JSON.stringify({
    type: 'initial',
    activities: getActivities(20)
  }));

  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Broadcast activity to all connected clients
function broadcastActivity(activity: any) {
  const message = JSON.stringify({
    type: 'activity',
    activity
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Subscribe to agent activities and broadcast
subscribeToActivities((activity) => {
  broadcastActivity(activity);
});

server.listen(PORT, () => {
  console.log(`🚀 SentinelSwap Backend running on port ${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api`);
  console.log(`❤️  Health: http://localhost:${PORT}/api/health`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  
  // Start the autonomous agent
  startAgent();
});

export default app;
