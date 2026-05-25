import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { connectRedis } from './utils/redis';
import { logger } from './utils/logger';
import authRoutes from './routes/authRoutes';
import onboardingRoutes from './routes/onboardingRoutes';
import bankRoutes from './routes/bankRoutes';
import fundRoutes from './routes/fundRoutes';
import portfolioRoutes from './routes/portfolioRoutes';
import sipRoutes from './routes/sipRoutes';
import goalRoutes from './routes/goalRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import notificationRoutes from './routes/notificationRoutes';
import distributorRoutes from './routes/distributorRoutes';
import { startNavCronJob } from './jobs/navUpdateJob';
import { startSipProcessorJob } from './jobs/sipProcessorJob';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 3000;

// Trust Render/Heroku reverse proxy so express-rate-limit can read the real IP
app.set('trust proxy', 1);

// ─── Security Middleware ───────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10kb' }));   // Limit payload size
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ──────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'blue-sparrow-mf-api', ts: new Date().toISOString() });
});

// ─── Routes ────────────────────────────────────────────────
app.use('/api/auth',           authRoutes);
app.use('/api/onboarding',     onboardingRoutes);
app.use('/api/bank',           bankRoutes);
app.use('/api/funds',          fundRoutes);
app.use('/api/portfolio',      portfolioRoutes);
app.use('/api/sip',            sipRoutes);
app.use('/api/goals',          goalRoutes);
app.use('/api/analytics',      analyticsRoutes);
app.use('/api/notifications',  notificationRoutes);
app.use('/api/distributor',    distributorRoutes);

// ─── 404 Handler ──────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ─── Startup ───────────────────────────────────────────────
async function start() {
  try {
    await connectRedis();
    startNavCronJob();
    startSipProcessorJob();
    app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
