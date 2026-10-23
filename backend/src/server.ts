import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { getDb } from './db/database';
import { seedDatabase } from './db/seed';
import apiRouter from './routes/api.routes';
import { checkTursoHealth } from './services/turso.service';
import { initJwtSecret, migratePlaintextPins } from './services/auth.service';
import { apiLimiter, buildCors, buildHelmet } from './middleware/security';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Behind Render/Railway/etc. there is one proxy hop; needed for correct client IPs in rate limiting
app.set('trust proxy', process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : (process.env.NODE_ENV === 'production' ? 1 : 0));
app.disable('x-powered-by');

app.use(buildHelmet());
app.use(buildCors());

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health check (public; registered before the API router, which requires auth)
app.get('/api/health', async (req, res) => {
  const tursoHealth = await checkTursoHealth();
  res.json({
    status: 'ok',
    service: 'Retail CRM & Lead Management System',
    turso: { configured: tursoHealth.configured, connected: tursoHealth.connected },
    timestamp: new Date().toISOString()
  });
});

// Mount API routes
app.use('/api', apiLimiter, apiRouter);

// Serve frontend build if present (Unified Single-Service Deployment)
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
const altFrontendDist = path.resolve(__dirname, '../public');

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else if (fs.existsSync(altFrontendDist)) {
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
    migratePlaintextPins();
    initJwtSecret();

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
