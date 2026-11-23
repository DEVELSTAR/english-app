import pool from '../config/db.js';

/**
 * Create a single notification for a specific user
 */
export async function createNotification({ user_id, actor_id = null, type, title, message, link = null }) {
  try {
    if (!user_id) return;
    // Do not notify a user about their own action
    if (actor_id && String(actor_id) === String(user_id)) return;

    await pool.query(
      `INSERT INTO notifications (user_id, actor_id, type, title, message, link, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
      [user_id, actor_id, type, title, message, link]
    );
  } catch (err) {
    console.error('[Notification] Failed to create notification:', err);
  }
}

/**
 * Broadcast notification to all other users (students & staff)
 */
export async function notifyAllUsers({ actor_id = null, type, title, message, link = null }) {
  try {
    const [users] = await pool.query('SELECT id FROM users WHERE id != ?', [actor_id || 0]);
    if (users.length === 0) return;

    const values = users.map((u) => [u.id, actor_id, type, title, message, link, 0]);
    await pool.query(
      `INSERT INTO notifications (user_id, actor_id, type, title, message, link, is_read, created_at)
       VALUES ?`,
      [values]
    );
  } catch (err) {
    console.error('[Notification] Failed to broadcast notification:', err);
  }
}
