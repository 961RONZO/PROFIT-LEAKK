require('dotenv').config();
const express = require('express');
const cors = require('cors');
const uploadRouter = require('./routes/upload');
const auditRouter = require('./routes/audit');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json({ limit: '50mb' }));

app.use('/api/upload', uploadRouter);
app.use('/api/audit', auditRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Profit Leak Auditor backend running on port ${PORT}`);
});
