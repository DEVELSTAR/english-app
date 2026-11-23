import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { testConnection } from './config/db.js';
import authRoutes from './routes/auth.js';
import lessonsRoutes from './routes/lessons.js';
import categoriesRoutes from './routes/categories.js';
import notesRoutes from './routes/notes.js';
import notificationsRoutes from './routes/notifications.js';
import aiRoutes, { getGeminiApiKey } from './routes/ai.js';
import historyRoutes from './routes/history.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from project root regardless of Passenger working directory
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'FluentEdge English API',
    uptime: process.uptime(),
    gemini_configured: Boolean(getGeminiApiKey()),
  });
});

// Diagnostic DB Status API (no sensitive info exposed)
app.get('/api/db-status', async (req, res) => {
  const ok = await testConnection();
  res.json({
    connected: ok,
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER ? `${process.env.DB_USER.slice(0, 3)}***` : 'missing (defaults to root)',
    database: process.env.DB_NAME || 'not set',
  });
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/lessons', lessonsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/history', historyRoutes);

// In Production (or cPanel single-port): serve built React frontend files
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// SPA fallback for client-side routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head><title>FluentEdge Backend API</title></head>
          <body style="font-family:sans-serif;text-align:center;padding:50px;">
            <h2>FluentEdge API Server is Running</h2>
            <p>API endpoints are active under <code>/api</code>.</p>
            <p>To view the web app, run <code>npm run build</code> or start the Vite development server.</p>
          </body>
        </html>
      `);
    }
  });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`[FluentEdge Server] Server listening on port ${PORT}`);
  console.log(`[FluentEdge Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  await testConnection();
});
