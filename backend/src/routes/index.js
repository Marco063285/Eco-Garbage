const express = require('express');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');

const auth = require('../controllers/authController');
const req_ = require('../controllers/requestController');
const admin = require('../controllers/adminController');
const misc = require('../controllers/miscController');

const collectorUploadDir = path.join(__dirname, '..', 'uploads', 'collectors');
if (!fs.existsSync(collectorUploadDir)) fs.mkdirSync(collectorUploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: collectorUploadDir,
    filename: (req, file, cb) => {
      const safeName = file.originalname.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9.-]/g, '');
      cb(null, `${Date.now()}-${safeName}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowed = {
      'image/jpeg': true,
      'image/png': true,
      'image/jpg': true,
      'video/mp4': true,
      'video/webm': true,
      'video/quicktime': true,
    };
    cb(null, !!allowed[file.mimetype]);
  },
  limits: { fileSize: 60 * 1024 * 1024 },
});


const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de tentatives. Réessayez dans 15 minutes.' },
});


router.post('/auth/register', authLimiter, upload.fields([
  { name: 'id_front', maxCount: 1 },
  { name: 'id_back', maxCount: 1 },
  { name: 'selfie_photo', maxCount: 1 },
  { name: 'selfie_video', maxCount: 1 },
]), auth.register);
router.post('/auth/login', authLimiter, auth.login);
router.get('/auth/verify-email', auth.verifyEmail);
router.post('/auth/resend-verification', authLimiter, auth.resendVerification);
router.post('/auth/forgot-password', authLimiter, auth.forgotPassword);
router.post('/auth/reset-password', authLimiter, auth.resetPassword);
router.get('/auth/me', authMiddleware, auth.getMe);
router.put('/auth/profile', authMiddleware, auth.updateProfile);
router.put('/auth/password', authMiddleware, auth.changePassword);


router.get('/categories', misc.getCategories);


router.get('/requests', authMiddleware, req_.getRequests);
router.post('/requests', authMiddleware, requireRole('user'), req_.createRequest);
router.post('/requests/estimate', authMiddleware, requireRole('user'), req_.estimatePrice);
router.get('/requests/:uuid', authMiddleware, req_.getRequestById);
router.put('/requests/:uuid/status', authMiddleware, requireRole('collector', 'admin'), req_.updateStatus);
router.put('/requests/:uuid/location', authMiddleware, requireRole('collector'), req_.updateLocation);
router.put('/requests/:uuid/assign', authMiddleware, requireRole('admin'), req_.assignCollector);
router.put('/requests/:uuid/archive', authMiddleware, requireRole('user', 'collector'), req_.archiveRequest);
router.put('/requests/:uuid/restore', authMiddleware, requireRole('user', 'collector'), req_.restoreRequest);
router.delete('/requests/:uuid', authMiddleware, requireRole('user'), req_.cancelRequest);


router.get('/notifications', authMiddleware, misc.getNotifications);
router.put('/notifications/read-all', authMiddleware, misc.markAllRead);


router.post('/ratings', authMiddleware, requireRole('user'), misc.createRating);


router.get('/complaints/mine', authMiddleware, misc.getMyComplaints);
router.post('/complaints', authMiddleware, misc.createComplaint);


router.get('/payments', authMiddleware, misc.getPayments);
router.post('/payments/pay', authMiddleware, misc.payRequest);


router.get('/collector/tasks', authMiddleware, requireRole('collector'), misc.getCollectorTasks);
router.get('/collector/available-requests', authMiddleware, requireRole('collector'), misc.getAvailableCollectorRequests);
router.put('/collector/availability', authMiddleware, requireRole('collector'), misc.updateCollectorAvailability);
router.put('/collector/location', authMiddleware, requireRole('collector'), misc.updateCollectorLocation);
router.get('/collector/stats', authMiddleware, requireRole('collector'), misc.getCollectorStats);


router.get('/admin/dashboard', authMiddleware, requireRole('admin'), admin.getDashboard);
router.get('/admin/users', authMiddleware, requireRole('admin'), admin.getUsers);
router.get('/admin/collectors/:id', authMiddleware, requireRole('admin'), admin.getCollectorDetails);
router.post('/admin/users', authMiddleware, requireRole('admin'), admin.createUser);
router.put('/admin/users/:id/status', authMiddleware, requireRole('admin'), admin.toggleUserStatus);
router.delete('/admin/users/:id', authMiddleware, requireRole('admin'), admin.deleteUser);
router.get('/admin/complaints', authMiddleware, requireRole('admin'), admin.getComplaints);
router.put('/admin/complaints/:uuid', authMiddleware, requireRole('admin'), admin.respondComplaint);
router.get('/admin/reports', authMiddleware, requireRole('admin'), admin.getReports);
router.get('/admin/categories', authMiddleware, requireRole('admin'), admin.getCategories);
router.post('/admin/categories', authMiddleware, requireRole('admin'), admin.createCategory);
router.put('/admin/categories/:id', authMiddleware, requireRole('admin'), admin.updateCategory);
router.get('/admin/requests', authMiddleware, requireRole('admin'), req_.getRequests);

module.exports = router;
