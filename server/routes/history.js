import { Router } from 'express';
import pool from '../config/db.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();

// 1. Fetch Audit History Logs (Admin Only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { user_id, resource_type, action, search } = req.query;
    let sql = 'SELECT * FROM activity_logs WHERE 1=1';
    const params = [];

    if (user_id && user_id !== 'all') {
      sql += ' AND user_id = ?';
      params.push(parseInt(user_id, 10));
    }

    if (resource_type && resource_type !== 'all') {
      sql += ' AND resource_type = ?';
      params.push(resource_type);
    }

    if (action && action !== 'all') {
      sql += ' AND action = ?';
      params.push(action);
    }

    if (search && search.trim()) {
      sql += ' AND (details LIKE ? OR user_name LIKE ? OR user_email LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    sql += ' ORDER BY created_at DESC LIMIT 300';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Fetch activity history error:', err);
    res.status(500).json({ error: 'Failed to fetch activity logs.' });
  }
});

// 2. Record New Activity
router.post('/', requireAuth, async (req, res) => {
  try {
    const { action, resource_type, resource_id, resource_title, details } = req.body;
    const logId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await pool.query(
      `INSERT INTO activity_logs (id, user_id, user_name, user_email, user_role, action, resource_type, resource_id, resource_title, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        logId,
        req.user.id,
        req.user.name,
        req.user.email,
        req.user.role,
        action,
        resource_type,
        resource_id ? String(resource_id) : null,
        resource_title || null,
        details || '',
      ]
    );

    res.status(201).json({ success: true, id: logId });
  } catch (err) {
    console.error('Record activity error:', err);
    res.status(500).json({ error: 'Failed to record activity log.' });
  }
});

export default router;
