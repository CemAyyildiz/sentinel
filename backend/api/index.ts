import express from 'express';
import cors from 'cors';
import strategyRoutes from '../src/routes/strategies';
import historyRoutes from '../src/routes/history';
import marketRoutes from '../src/routes/market';
import agentRoutes from '../src/routes/agent';
import swarmRoutes from '../src/routes/swarm';
import { getActivities } from '../src/services/agentActivity';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/strategies', strategyRoutes);
app.use('/history', historyRoutes);
app.use('/', marketRoutes);
app.use('/agent', agentRoutes);
app.use('/swarm', swarmRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'sentinelswap-backend',
    timestamp: new Date().toISOString()
  });
});

// Activity Feed API
app.get('/agent/activities', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  res.json(getActivities(limit));
});

export default app;