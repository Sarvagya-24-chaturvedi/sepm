const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const staffOrderRoutes = require('./routes/staffOrderRoutes'); // NEW (Increment 3)
const staffRecordRoutes = require('./routes/staffRecordRoutes'); // NEW (Increment 4)
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Trust reverse proxy (Render, Railway, Vercel, Nginx) for secure cookies & rate limiting
app.set('trust proxy', 1);

const allowedOrigins = [
  ...(process.env.CLIENT_URL || 'http://localhost:5173').split(','),
  process.env.RENDER_EXTERNAL_URL || '',
]
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(
  '/api',
  cors((req, callback) => {
    const origin = req.header('Origin');
    if (!origin) {
      return callback(null, { origin: true, credentials: true });
    }
    const normalized = origin.replace(/\/+$/, '');
    const sameOrigin = `${req.protocol}://${req.get('host')}`;
    if (normalized === sameOrigin || allowedOrigins.includes(normalized)) {
      return callback(null, {
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      });
    }
    const err = new Error('Not allowed by CORS');
    err.statusCode = 403;
    return callback(err);
  })
);
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/staff/orders', staffOrderRoutes); // NEW (Increment 3)
app.use('/api/staff/records', staffRecordRoutes); // NEW (Increment 4)

app.use('/api', notFoundHandler);

const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(path.join(clientDistPath, 'index.html'))) {
  app.use(express.static(clientDistPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  app.use(notFoundHandler);
}

app.use(errorHandler);

module.exports = app;
