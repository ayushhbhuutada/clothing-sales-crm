import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { getDb } from './db/database';
import { seedDatabase } from './db/seed';
import apiRouter from './routes/api.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Mount API routes
app.use('/api', apiRouter);

import { checkTursoHealth } from './services/turso.service';

// Health check endpoint with Turso Cloud diagnostics
app.get('/api/health', async (req, res) => {
  const tursoHealth = await checkTursoHealth();
  res.json({
    status: 'ok',
    service: 'Retail CRM & Lead Management System',
    turso: tursoHealth,
    timestamp: new Date().toISOString()
  });
});

// Serve frontend build if present (Unified Single-Service Deployment)
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
const altFrontendDist = path.resolve(__dirname, '../public');

if (require('fs').existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else if (require('fs').existsSync(altFrontendDist)) {
  app.use(express.static(altFrontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(altFrontendDist, 'index.html'));
  });
}

async function startServer() {
  try {
    console.log('🔄 Initializing SQLite database...');
    await getDb();
    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 Retail CRM Backend is running on http://localhost:${PORT}`);
      console.log(`📡 Real-time SSE stream available at http://localhost:${PORT}/api/events`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
