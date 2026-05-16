require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');

// ── Startup checks ────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set in environment variables. Exiting.');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' &&
    process.env.JWT_SECRET === 'eco_garbage_super_secret_jwt_key_2026_changeme') {
  console.error('FATAL: You are in production with the default JWT_SECRET. Set a strong unique secret in your hosting provider env vars.');
  process.exit(1);
}

const connectDB = require('./config/db');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Trust proxy (required behind Render/Heroku/Nginx for correct IPs and rate limiting) ─
app.set('trust proxy', 1);

// ── CORS (supports multiple comma-separated origins for prod) ──────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow same-origin / curl / mobile webview (no origin header)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return cb(null, true);
    }
    return cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(helmet({
  contentSecurityPolicy: false,           // SPA is hosted elsewhere; let the static host set its own CSP
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // /uploads needs to be readable from the frontend domain
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Static uploads ──────────────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── API Routes ──────────────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── Health check ────────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});
app.get('/', (req, res) => {
  res.json({ name: 'eco-garbage-api', status: 'running', docs: '/health' });
});

// ── 404 ─────────────────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.path} non trouvee` });
});

// ── Error handler ───────────────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Erreur interne du serveur' : (err.message || 'Erreur interne du serveur'),
  });
});

// ── Start ───────────────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur EcoGarbage demarre sur le port ${PORT}`);
  console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS autorise pour: ${allowedOrigins.join(', ')}`);
});

connectDB();

module.exports = app;
