const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./database');

const authRoutes = require('./routes/auth');
const preachersRoutes = require('./routes/preachers');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/predicateurs', preachersRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`MVM Backend running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
