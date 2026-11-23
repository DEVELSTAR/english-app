import pool from '../config/db.js';

/**
 * Create a single notification for a specific student.
 * Admins do not receive notifications per requirement.
 */
export async function createNotification({ user_id, actor_id = null, type, title, message, link = null }) {
  try {
    if (!user_id) return;
    // Do not notify a user about their own action
    if (actor_id && String(actor_id) === String(user_id)) return;

    // Check recipient role: only students (role = 0) receive notifications
    const [userRows] = await pool.query('SELECT role FROM users WHERE id = ?', [user_id]);
    if (userRows.length === 0 || userRows[0].role > 0) return;

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
 * Broadcast notification to all active students (role = 0).
 * Excludes the actor and all admin accounts.
 */
export async function notifyAllStudents({ actor_id = null, type, title, message, link = null }) {
  try {
    // Only select students (role = 0)
    const [students] = await pool.query(
      'SELECT id FROM users WHERE role = 0 AND id != ?',
      [actor_id || 0]
    );
    if (students.length === 0) return;

    // 7 columns: user_id, actor_id, type, title, message, link, is_read
    const values = students.map((s) => [s.id, actor_id, type, title, message, link, 0]);
    await pool.query(
      `INSERT INTO notifications (user_id, actor_id, type, title, message, link, is_read)
       VALUES ?`,
      [values]
    );
  } catch (err) {
    console.error('[Notification] Failed to broadcast notification:', err);
  }
}

// Backward-compatibility alias
export const notifyAllUsers = notifyAllStudents;
