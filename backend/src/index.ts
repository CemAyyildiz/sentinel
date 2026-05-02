import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import strategyRoutes from './routes/strategies';
import historyRoutes from './routes/history';
import marketRoutes from './routes/market';
import agentRoutes from './routes/agent';
import { startAgent } from './services/agent';

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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SentinelSwap Backend running on port ${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api`);
  console.log(`❤️  Health: http://localhost:${PORT}/api/health`);
  
  // Start the autonomous agent
  startAgent();
});

export default app;
