import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { distributorClientUpload } from '../middleware/distributorUploadMiddleware';
import * as ctrl from '../controllers/distributorController';

const router = Router();

// ─── Public routes (no auth) ──────────────────────────────
router.post('/register', ctrl.registerDistributor);
router.post('/login',    ctrl.loginDistributor);

// All other distributor routes require authentication
router.use(authenticate);

// ─── Profile ──────────────────────────────────────────────
router.get('/profile',     ctrl.getProfile);
router.post('/profile',    ctrl.upsertProfile);

// ─── Dashboard ────────────────────────────────────────────
router.get('/dashboard',   ctrl.getDashboard);

// ─── Clients ──────────────────────────────────────────────
router.get('/clients',              ctrl.listClients);
router.post('/clients',             distributorClientUpload, ctrl.createClient);
router.get('/clients/:clientId',    ctrl.getClientDetail);

// ─── Reports ──────────────────────────────────────────────
router.get('/reports/aum',          ctrl.getAumReport);
router.get('/reports/sip',          ctrl.getSipReport);
router.get('/reports/monthly',      ctrl.getMonthlySummary);

// ─── Model Portfolios ─────────────────────────────────────
router.get('/model-portfolios',           ctrl.listModelPortfolios);
router.post('/model-portfolios',          ctrl.createModelPortfolio);
router.put('/model-portfolios/:id',       ctrl.updateModelPortfolio);
router.delete('/model-portfolios/:id',    ctrl.deleteModelPortfolio);
router.post('/model-portfolios/:id/assign', ctrl.assignModelPortfolio);

// ─── Audit Logs ───────────────────────────────────────────
router.get('/audit-logs',   ctrl.getAuditLogs);

export default router;
