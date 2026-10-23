import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import * as authCtrl from '../controllers/auth.controller';
import * as customerCtrl from '../controllers/customer.controller';
import * as leadCtrl from '../controllers/lead.controller';
import * as importCtrl from '../controllers/import.controller';
import * as analyticsCtrl from '../controllers/analytics.controller';
import { sseBroadcaster } from '../services/broadcaster';
import { requireAuth, requireManager, requireSelfOrManager, resolveSseTicket } from '../middleware/auth';
import { pinLoginIpLimiter, pinLoginLimiter } from '../middleware/security';

const router = Router();
const ALLOWED_IMPORT_EXTENSIONS = ['.csv', '.txt', '.xlsx', '.xls'];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    cb(null, ALLOWED_IMPORT_EXTENSIONS.includes(path.extname(file.originalname).toLowerCase()));
  }
});

// 1. SSE Realtime Stream (authenticated with a short-lived ticket from /auth/sse-ticket)
router.get('/events', (req, res) => {
  const staff = resolveSseTicket(String(req.query.ticket || ''));
  if (!staff) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  sseBroadcaster.addClient(clientId, res, staff.id);

  req.on('close', () => {
    sseBroadcaster.removeClient(clientId);
  });
});

// 2. Public auth endpoints
router.post('/auth/pin-login', pinLoginIpLimiter, pinLoginLimiter, authCtrl.pinLogin);
router.get('/auth/staff-directory', authCtrl.getStaffDirectory);

// Everything below requires a valid session token
router.use(requireAuth);

// 3. Auth & Staff Presence
router.get('/auth/me', authCtrl.getMe);
router.post('/auth/sse-ticket', authCtrl.getSseTicket);
router.get('/auth/staff-list', authCtrl.getStaffList);
router.put('/auth/staff/:id/status', authCtrl.updateStaffStatus);

// 4. Customers
router.get('/customers/search', customerCtrl.searchCustomers);
router.get('/customers/:id', customerCtrl.getCustomerProfile);
router.post('/customers', customerCtrl.createCustomer);
router.put('/customers/:id', customerCtrl.updateCustomer);
router.delete('/customers/:id', requireManager, customerCtrl.deleteCustomer);
router.post('/customers/:id/preferences', customerCtrl.addPreference);
router.delete('/customers/:id/preferences/:prefId', customerCtrl.deletePreference);
router.post('/customers/:id/visits', customerCtrl.logVisit);

// 5. Leads & Sales Floor
router.post('/leads/assign', leadCtrl.assignLead);
router.get('/leads/active', leadCtrl.getActiveLeads);
router.get('/leads/my-leads/:staffId', requireSelfOrManager('staffId'), leadCtrl.getMyLeads);
router.put('/leads/:id/status', leadCtrl.updateLeadStatus);
router.post('/leads/:id/close', leadCtrl.closeLead);
router.get('/leads/recommend-rep', leadCtrl.getRecommendedRep);

// 6. Universal Excel / CSV Billing Import (managers only)
router.get('/imports/templates', requireManager, importCtrl.getTemplates);
router.post('/imports/templates', requireManager, importCtrl.saveTemplate);
router.post('/imports/preview', requireManager, upload.single('file'), importCtrl.previewFile);
router.post('/imports/upload', requireManager, upload.single('file'), importCtrl.uploadAndImport);
router.get('/imports/batches', requireManager, importCtrl.getBatches);
router.get('/imports/review-queue', requireManager, importCtrl.getReviewQueue);
router.post('/imports/review-queue/:id/resolve', requireManager, importCtrl.resolveReviewItem);
router.get('/imports/sample-templates', requireManager, importCtrl.getSampleTemplates);

// 7. Analytics & Management
router.get('/analytics/kpis', requireManager, analyticsCtrl.getKpis);
router.get('/analytics/rep-performance', requireManager, analyticsCtrl.getRepPerformance);
router.get('/analytics/trends', requireManager, analyticsCtrl.getTrends);
router.get('/analytics/reminders', requireManager, analyticsCtrl.getRemindersAndLapsed);
router.get('/branches', analyticsCtrl.getBranches);

export default router;
