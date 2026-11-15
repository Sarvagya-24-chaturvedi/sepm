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

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
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

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
