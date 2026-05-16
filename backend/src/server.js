require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// ── Startup checks ────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET is not set in environment variables. Exiting.');
  process.exit(1);
}

const connectDB = require('./config/db');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Trust proxy (required on Render / Vercel / behind any load balancer) ──
// Allows express-rate-limit and req.ip to see the real client IP.
app.set('trust proxy', 1);

// ── CORS ─────────────────────────────────────────
// Accepts a comma-separated list in FRONTEND_URL plus all *.vercel.app preview deployments
// and localhost during development.
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile apps, curl, server-to-server) with no Origin header
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow any Vercel preview deployment (so PR previews keep working)
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Static uploads ────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── API Routes ────────────────────────────────────
app.use('/api', routes);

// ── Health check ─────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});
// Root route — useful for Render's default health probe and for quick "is it alive?" checks
app.get('/', (req, res) => {
  res.json({ name: 'EcoGarbage API', status: 'ok', docs: '/health' });
});

// ── 404 ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.path} non trouvée` });
});

// ── Error handler ─────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
});

// ── Start ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Serveur EcoGarbage démarré sur http://localhost:${PORT}`);
  console.log(`📋 Mode: ${process.env.NODE_ENV || 'development'}`);
});

connectDB();

module.exports = app;
