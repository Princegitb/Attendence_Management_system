const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

dotenv.config();

const initDb = require('./db/init');
const seedDb = require('./db/seed');

const authRoutes = require('./routes/authRoutes');
const guardRoutes = require('./routes/guardRoutes');
const postRoutes = require('./routes/postRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const officerRoutes = require('./routes/officerRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const reportRoutes = require('./routes/reportRoutes');
const auditRoutes = require('./routes/auditRoutes');
const mediaRoutes = require('./routes/mediaRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Route Registration
app.use('/api/auth', authRoutes);
app.use('/api/guards', guardRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/officers', officerRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/media', mediaRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    system: 'Guard Attendance Management API',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Start Server & Auto-Seed Database
async function startServer() {
  await seedDb();

  app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 Guard Attendance API Server running on port ${PORT}`);
    console.log(`==================================================\n`);
  });
}

startServer();

module.exports = app;
