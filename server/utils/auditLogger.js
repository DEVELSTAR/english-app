import pool from '../config/db.js';

/**
 * Automatically record administrative and student activity logs.
 * Actions: 'create' | 'update' | 'destroy' | 'reaction' | 'login' | 'signup'
 * Resource Types: 'lesson' | 'category' | 'note' | 'comment' | 'user' | 'auth'
 */
export async function logAudit({
  user,
  action,
  resource_type,
  resource_id = null,
  resource_title = null,
  details = '',
}) {
  try {
    if (!user) return;
    const logId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await pool.query(
      `INSERT INTO activity_logs (id, user_id, user_name, user_email, user_role, action, resource_type, resource_id, resource_title, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        logId,
        user.id,
        user.name,
        user.email_address || user.email || '',
        user.role ?? 0,
        action,
        resource_type,
        resource_id ? String(resource_id) : null,
        resource_title || null,
        details,
      ]
    );
  } catch (err) {
    console.error('[AuditLogger] Failed to record audit log:', err);
  }
}
