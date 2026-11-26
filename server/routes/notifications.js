import express from 'express';
import pool from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// 1. Get user notifications + unread count
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch unread count
    const [countRows] = await pool.query(
      'SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    const unreadCount = countRows[0]?.unread || 0;

    // Fetch latest notifications with actor details
    const [notifications] = await pool.query(
      `SELECT n.id, n.user_id, n.actor_id, n.type, n.title, n.message, n.link, n.is_read, n.created_at,
              u.name as actor_name, u.profile_icon as actor_icon
       FROM notifications n
       LEFT JOIN users u ON n.actor_id = u.id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT 40`,
      [userId]
    );

    res.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        user_id: n.user_id,
        actor_id: n.actor_id,
        actor_name: n.actor_name || null,
        actor_icon: n.actor_icon || null,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        is_read: Boolean(n.is_read),
        created_at: n.created_at,
      })),
      unread_count: unreadCount,
    });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// 2. Mark a single notification as read
router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
});

// 3. Mark all notifications as read
router.put('/read-all', requireAuth, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: 'Failed to mark all as read.' });
  }
});

// 4. Clear all notifications for current user
router.delete('/', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM notifications WHERE user_id = ?', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Clear notifications error:', err);
    res.status(500).json({ error: 'Failed to clear notifications.' });
  }
});

export default router;
