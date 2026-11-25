import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { generateToken, requireAuth, requireAdmin, requireSuperAdmin } from '../middleware/auth.js';
import { logAudit } from '../utils/auditLogger.js';

const router = Router();

// Helper to verify passwords supporting both bcrypt and plain text
function verifyPassword(raw, digest) {
  if (!digest) return false;
  if (digest.startsWith('$2a$') || digest.startsWith('$2b$') || digest.startsWith('$2y$')) {
    try {
      return bcrypt.compareSync(raw, digest);
    } catch {
      return false;
    }
  }
  return raw === digest;
}

// 1. Student Sign Up
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const [existing] = await pool.query('SELECT id FROM users WHERE email_address = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (name, email_address, password_digest, plain_password, role, profile_icon, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, 'user', NOW(), NOW())`,
      [name.trim(), cleanEmail, hash, password]
    );

    const user = {
      id: result.insertId,
      name: name.trim(),
      email_address: cleanEmail,
      role: 0,
      profile_icon: 'user',
    };

    const token = generateToken(user);

    // Audit log student registration
    logAudit({
      user,
      action: 'signup',
      resource_type: 'auth',
      details: `New student registered account: ${user.name} (${cleanEmail})`,
    });

    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// 2. Sign In (Student & Admin can both log in here)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const [rows] = await pool.query('SELECT * FROM users WHERE email_address = ?', [cleanEmail]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'No account found with this email address.' });
    }

    const user = rows[0];

    if (!verifyPassword(password, user.password_digest)) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    // Update plain_password if needed
    if (!user.plain_password) {
      await pool.query('UPDATE users SET plain_password = ? WHERE id = ?', [password, user.id]);
    }

    const token = generateToken(user);

    // Audit log student sign-in (only students, not admin/super admin)
    if (user.role === 0 || user.role === 'student' || user.role === 'user') {
      logAudit({
        user,
        action: 'login',
        resource_type: 'auth',
        details: `Student signed in: ${user.name} (${cleanEmail})`,
      });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email_address: user.email_address,
        role: user.role,
        profile_icon: user.profile_icon || (user.role >= 1 ? 'shield' : 'user'),
      },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during sign in.' });
  }
});

// 3. Admin Sign In (role = 1 or 2 only)
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const [rows] = await pool.query('SELECT * FROM users WHERE email_address = ?', [cleanEmail]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Admin account not found.' });
    }

    const user = rows[0];
    if (user.role !== 1 && user.role !== 2) {
      return res.status(403).json({ error: 'Access denied. You do not have administrator permissions.' });
    }

    if (!verifyPassword(password, user.password_digest)) {
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    const token = generateToken(user);

    // Audit log student sign-in (only students, not admin/super admin)
    if (user.role === 0 || user.role === 'student' || user.role === 'user') {
      logAudit({
        user,
        action: 'login',
        resource_type: 'auth',
        details: `Student signed in: ${user.name} (${cleanEmail})`,
      });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email_address: user.email_address,
        role: user.role,
        profile_icon: user.profile_icon || 'shield',
      },
      token,
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Server error during admin sign in.' });
  }
});

// 4. Get Current User Info
router.get('/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email_address, role, profile_icon, plain_password, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching user details.' });
  }
});

// 5. Update Profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, email_address, password, profile_icon } = req.body;
    const updates = [];
    const values = [];

    if (name?.trim()) {
      updates.push('name = ?');
      values.push(name.trim());
    }

    if (email_address?.trim()) {
      const cleanEmail = email_address.trim().toLowerCase();
      const [existing] = await pool.query('SELECT id FROM users WHERE email_address = ? AND id != ?', [
        cleanEmail,
        req.user.id,
      ]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'This email is already in use by another account.' });
      }
      updates.push('email_address = ?');
      values.push(cleanEmail);
    }

    if (profile_icon) {
      updates.push('profile_icon = ?');
      values.push(profile_icon);
    }

    if (password?.trim()) {
      const hash = bcrypt.hashSync(password.trim(), 10);
      updates.push('password_digest = ?');
      values.push(hash);
      updates.push('plain_password = ?');
      values.push(password.trim());
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update.' });
    }

    values.push(req.user.id);
    await pool.query(`UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, values);

    const [updated] = await pool.query(
      'SELECT id, name, email_address, role, profile_icon, plain_password FROM users WHERE id = ?',
      [req.user.id]
    );

    const token = generateToken(updated[0]);
    res.json({ user: updated[0], token });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// 5.1 Student: Get Available Classmates for Note Sharing
router.get('/classmates', requireAuth, async (req, res) => {
  try {
    const [students] = await pool.query(
      'SELECT id, name, email_address, profile_icon FROM users WHERE (role IS NULL OR role NOT IN (1, 2)) AND id != ? ORDER BY name ASC',
      [req.user.id]
    );
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch classmates.' });
  }
});

// 6. Admin: List Students
router.get('/students', requireAdmin, async (req, res) => {
  try {
    const [students] = await pool.query(
      'SELECT id, name, email_address, role, profile_icon, plain_password, created_at FROM users WHERE (role IS NULL OR role NOT IN (1, 2)) ORDER BY created_at DESC'
    );
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch students.' });
  }
});

// 7. Admin: Create Student
router.post('/students', requireAdmin, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const [existing] = await pool.query('SELECT id FROM users WHERE email_address = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }

    const hash = bcrypt.hashSync(password.trim(), 10);
    const [result] = await pool.query(
      `INSERT INTO users (name, email_address, password_digest, plain_password, role, profile_icon, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, 'user', NOW(), NOW())`,
      [name.trim(), cleanEmail, hash, password.trim()]
    );

    res.status(201).json({
      id: result.insertId,
      name: name.trim(),
      email_address: cleanEmail,
      role: 0,
      plain_password: password.trim(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create student account.' });
  }
});

// 8. Admin: Update Student
router.put('/students/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email_address, password } = req.body;
    const updates = [];
    const values = [];

    if (name?.trim()) {
      updates.push('name = ?');
      values.push(name.trim());
    }

    if (email_address?.trim()) {
      const cleanEmail = email_address.trim().toLowerCase();
      const [existing] = await pool.query('SELECT id FROM users WHERE email_address = ? AND id != ?', [
        cleanEmail,
        id,
      ]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Email already taken.' });
      }
      updates.push('email_address = ?');
      values.push(cleanEmail);
    }

    if (password?.trim()) {
      const hash = bcrypt.hashSync(password.trim(), 10);
      updates.push('password_digest = ?');
      values.push(hash);
      updates.push('plain_password = ?');
      values.push(password.trim());
    }

    if (updates.length > 0) {
      values.push(id);
      await pool.query(`UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ? AND (role IS NULL OR role NOT IN (1, 2))`, values);
    }

    const [student] = await pool.query(
      'SELECT id, name, email_address, role, plain_password FROM users WHERE id = ?',
      [id]
    );
    res.json(student[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update student.' });
  }
});

// 9. Admin: Delete Student
router.delete('/students/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM users WHERE id = ? AND (role IS NULL OR role NOT IN (1, 2))', [id]);
    res.json({ success: true, message: 'Student removed successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete student.' });
  }
});

// 10. Super Admin: List Admins
router.get('/admins', requireSuperAdmin, async (req, res) => {
  try {
    const [admins] = await pool.query(
      'SELECT id, name, email_address, role, created_at FROM users WHERE role IN (1, 2) ORDER BY role DESC, created_at ASC'
    );
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch administrator accounts.' });
  }
});

// 11. Super Admin: Create Admin
router.post('/admins', requireSuperAdmin, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const [existing] = await pool.query('SELECT id FROM users WHERE email_address = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const hash = bcrypt.hashSync(password.trim(), 10);
    const [result] = await pool.query(
      `INSERT INTO users (name, email_address, password_digest, plain_password, role, profile_icon, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, 'shield', NOW(), NOW())`,
      [name.trim(), cleanEmail, hash, password.trim()]
    );

    res.status(201).json({
      id: result.insertId,
      name: name.trim(),
      email_address: cleanEmail,
      role: 1,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create admin.' });
  }
});

// 12. Super Admin: Update Admin
router.put('/admins/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email_address, password } = req.body;
    const updates = [];
    const values = [];

    if (name?.trim()) {
      updates.push('name = ?');
      values.push(name.trim());
    }

    if (email_address?.trim()) {
      const cleanEmail = email_address.trim().toLowerCase();
      const [existing] = await pool.query('SELECT id FROM users WHERE email_address = ? AND id != ?', [cleanEmail, id]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Email already taken.' });
      }
      updates.push('email_address = ?');
      values.push(cleanEmail);
    }

    if (password?.trim()) {
      const hash = bcrypt.hashSync(password.trim(), 10);
      updates.push('password_digest = ?');
      values.push(hash);
      updates.push('plain_password = ?');
      values.push(password.trim());
    }

    if (updates.length > 0) {
      values.push(id);
      await pool.query(`UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
    }

    const [admin] = await pool.query('SELECT id, name, email_address, role FROM users WHERE id = ?', [id]);
    res.json(admin[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update admin account.' });
  }
});

// 13. Super Admin: Delete Admin
router.delete('/admins/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id, 10) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own super administrator account.' });
    }
    await pool.query('DELETE FROM users WHERE id = ? AND role = 1', [id]);
    res.json({ success: true, message: 'Admin removed successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete admin.' });
  }
});

export default router;
