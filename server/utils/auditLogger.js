import pool from '../config/db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fluentedge_super_secret_jwt_key_2026';

/**
 * Automatically record student activity logs.
 * Actions: 'create' | 'update' | 'destroy' | 'reaction' | 'login' | 'signup' | 'chat'
 * Resource Types: 'lesson' | 'category' | 'note' | 'comment' | 'user' | 'auth' | 'chat' | 'notification'
 * 
 * Strict Rule: Only track students (role 0). Never track admin (role 1) or super admin (role 2).
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

    // Strict check: DO NOT track admin or super admin activity. ONLY students!
    const roleNum = Number(user.role);
    if (roleNum === 1 || roleNum === 2 || user.role === 'admin' || user.role === 'super_admin') {
      return;
    }

    const logId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await pool.query(
      `INSERT INTO activity_logs (id, user_id, user_name, user_email, user_role, action, resource_type, resource_id, resource_title, details, created_at)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, NOW())`,
      [
        logId,
        user.id,
        user.name || 'Student',
        user.email_address || user.email || '',
        action,
        resource_type,
        resource_id ? String(resource_id) : null,
        resource_title || null,
        details || `${action} ${resource_type}`,
      ]
    );
  } catch (err) {
    console.error('[AuditLogger] Failed to record audit log:', err);
  }
}

/**
 * Express middleware that automatically catches EVERY mutating request (POST, PUT, PATCH, DELETE)
 * made by an authenticated student and logs it if not already explicitly recorded.
 */
export function studentAuditMiddleware(req, res, next) {
  // Only watch mutating HTTP requests
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  // Hook into response finish event
  res.on('finish', () => {
    // Only log successful responses and avoid duplicate if explicitly logged
    if (res.statusCode >= 200 && res.statusCode < 400 && !res.locals.auditLogged) {
      let user = req.user;
      if (!user && req.headers.authorization?.startsWith('Bearer ')) {
        try {
          const token = req.headers.authorization.split(' ')[1];
          user = jwt.verify(token, JWT_SECRET);
        } catch {
          // ignore
        }
      }

      if (!user) return;

      const roleNum = Number(user.role);
      // Exclude admins and super admins
      if (roleNum === 1 || roleNum === 2 || user.role === 'admin' || user.role === 'super_admin') {
        return;
      }

      let action = 'create';
      if (req.method === 'PUT' || req.method === 'PATCH') action = 'update';
      if (req.method === 'DELETE') action = 'destroy';

      const path = req.originalUrl || req.url;
      let resource_type = 'student_activity';
      let details = `${req.method} ${path}`;

      if (path.includes('/ai/chat')) {
        resource_type = 'chat';
        action = 'chat';
        details = req.body?.user_message
          ? `Asked AI Tutor: "${String(req.body.user_message).substring(0, 70)}"`
          : 'Sent speech practice to AI Tutor';
      } else if (path.includes('/ai/history') || path.includes('/chat')) {
        resource_type = 'chat';
        details = 'Cleared AI Tutor chat history';
      } else if (path.includes('/messages/')) {
        resource_type = 'chat';
        details = 'Deleted an AI chat message';
      } else if (path.includes('/reactions')) {
        resource_type = 'reaction';
        action = 'reaction';
        details = `Reacted ${req.body?.emoji || ''} on ${path.includes('/notes') ? 'note' : path.includes('/comments') ? 'comment' : 'lesson'}`;
      } else if (path.includes('/comments')) {
        resource_type = 'comment';
        if (action === 'create') details = `Posted comment: "${String(req.body?.content || '').substring(0, 70)}"`;
        else if (action === 'update') details = `Updated comment: "${String(req.body?.content || '').substring(0, 70)}"`;
        else if (action === 'destroy') details = 'Deleted a discussion comment';
      } else if (path.includes('/notes')) {
        resource_type = 'note';
        if (action === 'create') details = `Created note: "${String(req.body?.content || '').substring(0, 70)}"`;
        else if (action === 'update') details = `Updated note: "${String(req.body?.content || '').substring(0, 70)}"`;
        else if (action === 'destroy') details = 'Deleted a study note';
      } else if (path.includes('/notifications')) {
        resource_type = 'notification';
        details = 'Marked notification(s) as read';
      } else if (path.includes('/profile')) {
        resource_type = 'user';
        details = 'Updated profile information / avatar';
      }

      logAudit({
        user,
        action,
        resource_type,
        details,
      });
    }
  });

  next();
}

