const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');

const auth = require('../controllers/authController');
const req_ = require('../controllers/requestController');
const admin = require('../controllers/adminController');
const misc = require('../controllers/miscController');

// ── AUTH ──────────────────────────────────────────
router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);
router.get('/auth/verify-email', auth.verifyEmail);
router.get('/auth/me', authMiddleware, auth.getMe);
router.put('/auth/profile', authMiddleware, auth.updateProfile);
router.put('/auth/password', authMiddleware, auth.changePassword);

// ── CATEGORIES (public) ───────────────────────────
router.get('/categories', misc.getCategories);

// ── PICKUP REQUESTS ───────────────────────────────
router.get('/requests', authMiddleware, req_.getRequests);
router.post('/requests', authMiddleware, requireRole('user'), req_.createRequest);
router.get('/requests/:uuid', authMiddleware, req_.getRequestById);
router.put('/requests/:uuid/status', authMiddleware, requireRole('collector', 'admin'), req_.updateStatus);
router.put('/requests/:uuid/assign', authMiddleware, requireRole('admin'), req_.assignCollector);
router.delete('/requests/:uuid', authMiddleware, requireRole('user'), req_.cancelRequest);

// ── NOTIFICATIONS ─────────────────────────────────
router.get('/notifications', authMiddleware, misc.getNotifications);
router.put('/notifications/read-all', authMiddleware, misc.markAllRead);

// ── RATINGS ───────────────────────────────────────
router.post('/ratings', authMiddleware, requireRole('user'), misc.createRating);

// ── COMPLAINTS ────────────────────────────────────
router.get('/complaints/mine', authMiddleware, misc.getMyComplaints);
router.post('/complaints', authMiddleware, misc.createComplaint);

// ── PAYMENTS ──────────────────────────────────────
router.get('/payments', authMiddleware, misc.getPayments);
router.post('/payments/pay', authMiddleware, misc.payRequest);

// ── COLLECTOR ─────────────────────────────────────
router.get('/collector/tasks', authMiddleware, requireRole('collector'), misc.getCollectorTasks);
router.put('/collector/availability', authMiddleware, requireRole('collector'), misc.updateCollectorAvailability);
router.get('/collector/stats', authMiddleware, requireRole('collector'), misc.getCollectorStats);

// ── ADMIN ─────────────────────────────────────────
router.get('/admin/dashboard', authMiddleware, requireRole('admin'), admin.getDashboard);
router.get('/admin/users', authMiddleware, requireRole('admin'), admin.getUsers);
router.put('/admin/users/:id/status', authMiddleware, requireRole('admin'), admin.toggleUserStatus);
router.get('/admin/complaints', authMiddleware, requireRole('admin'), admin.getComplaints);
router.put('/admin/complaints/:uuid', authMiddleware, requireRole('admin'), admin.respondComplaint);
router.get('/admin/reports', authMiddleware, requireRole('admin'), admin.getReports);
router.get('/admin/categories', authMiddleware, requireRole('admin'), admin.getCategories);
router.post('/admin/categories', authMiddleware, requireRole('admin'), admin.createCategory);
router.put('/admin/categories/:id', authMiddleware, requireRole('admin'), admin.updateCategory);
router.get('/admin/requests', authMiddleware, requireRole('admin'), req_.getRequests);

module.exports = router;
