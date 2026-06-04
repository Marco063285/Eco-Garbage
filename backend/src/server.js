require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET is not set in environment variables. Exiting.');
  process.exit(1);
}

const connectDB = require('./config/db');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});
app.get('/', (req, res) => {
  res.json({ name: 'EcoGarbage API', status: 'ok', docs: '/health' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.path} non trouvée` });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur EcoGarbage démarré sur http://localhost:${PORT}`);
  console.log(`📋 Mode: ${process.env.NODE_ENV || 'development'}`);
});

connectDB();

module.exports = app;
