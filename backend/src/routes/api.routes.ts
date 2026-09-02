import { Router } from 'express';
import multer from 'multer';
import * as authCtrl from '../controllers/auth.controller';
import * as customerCtrl from '../controllers/customer.controller';
import * as leadCtrl from '../controllers/lead.controller';
import * as importCtrl from '../controllers/import.controller';
import * as analyticsCtrl from '../controllers/analytics.controller';
import { sseBroadcaster } from '../services/broadcaster';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// 1. SSE Realtime Stream
router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const staffId = req.query.staffId ? String(req.query.staffId) : undefined;

  sseBroadcaster.addClient(clientId, res, staffId);

  req.on('close', () => {
    sseBroadcaster.removeClient(clientId);
  });
});

// 2. Auth & Staff Presence
router.post('/auth/pin-login', authCtrl.pinLogin);
router.get('/auth/staff-list', authCtrl.getStaffList);
router.put('/auth/staff/:id/status', authCtrl.updateStaffStatus);

// 3. Customers
router.get('/customers/search', customerCtrl.searchCustomers);
router.get('/customers/:id', customerCtrl.getCustomerProfile);
router.post('/customers', customerCtrl.createCustomer);
router.put('/customers/:id', customerCtrl.updateCustomer);
router.delete('/customers/:id', customerCtrl.deleteCustomer);
router.post('/customers/:id/preferences', customerCtrl.addPreference);
router.delete('/customers/:id/preferences/:prefId', customerCtrl.deletePreference);
router.post('/customers/:id/visits', customerCtrl.logVisit);

// 4. Leads & Sales Floor
router.post('/leads/assign', leadCtrl.assignLead);
router.get('/leads/active', leadCtrl.getActiveLeads);
router.get('/leads/my-leads/:staffId', leadCtrl.getMyLeads);
router.put('/leads/:id/status', leadCtrl.updateLeadStatus);
router.post('/leads/:id/close', leadCtrl.closeLead);
router.get('/leads/recommend-rep', leadCtrl.getRecommendedRep);

// 5. Universal Excel / CSV Billing Import
router.get('/imports/templates', importCtrl.getTemplates);
router.post('/imports/templates', importCtrl.saveTemplate);
router.post('/imports/preview', upload.single('file'), importCtrl.previewFile);
router.post('/imports/upload', upload.single('file'), importCtrl.uploadAndImport);
router.get('/imports/batches', importCtrl.getBatches);
router.get('/imports/review-queue', importCtrl.getReviewQueue);
router.post('/imports/review-queue/:id/resolve', importCtrl.resolveReviewItem);
router.get('/imports/sample-templates', importCtrl.getSampleTemplates);

// 6. Analytics & Management
router.get('/analytics/kpis', analyticsCtrl.getKpis);
router.get('/analytics/rep-performance', analyticsCtrl.getRepPerformance);
router.get('/analytics/trends', analyticsCtrl.getTrends);
router.get('/analytics/reminders', analyticsCtrl.getRemindersAndLapsed);
router.get('/branches', analyticsCtrl.getBranches);

export default router;
