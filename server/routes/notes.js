import { Router } from 'express';
import pool from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { createNotification } from '../utils/notifications.js';

const router = Router();

// 1. Get Notes Visible to Current User
// Supports filter: all, general, lesson, shared, mine
// and ?lesson_id=X
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { filter, lesson_id } = req.query;

    let sql = `
      SELECT DISTINCT n.id, n.user_id, n.lesson_id, n.content, n.is_global, n.reactions, n.created_at, n.updated_at,
             u.name as author_name, u.email_address as author_email, u.profile_icon as author_icon, u.role as author_role,
             l.title as lesson_title, l.lesson_type
      FROM notes n
      JOIN users u ON n.user_id = u.id
      LEFT JOIN lessons l ON n.lesson_id = l.id
      LEFT JOIN note_shares ns ON n.id = ns.note_id AND ns.user_id = ?
      WHERE (n.user_id = ? OR n.is_global = 1 OR ns.status = 1)
    `;
    const params = [userId, userId];

    if (lesson_id) {
      sql += ' AND n.lesson_id = ?';
      params.push(parseInt(lesson_id, 10));
    }

    if (filter === 'general') {
      sql += ' AND n.lesson_id IS NULL';
    } else if (filter === 'lesson') {
      sql += ' AND n.lesson_id IS NOT NULL';
    } else if (filter === 'mine') {
      sql += ' AND n.user_id = ?';
      params.push(userId);
    } else if (filter === 'shared') {
      sql += ' AND ns.status = 1 AND n.user_id != ?';
      params.push(userId);
    }

    sql += ' ORDER BY n.updated_at DESC';

    const [notes] = await pool.query(sql, params);

    // Fetch shares for these notes
    const noteIds = notes.map((n) => n.id);
    let sharesMap = new Map();

    if (noteIds.length > 0) {
      const [shares] = await pool.query(
        `SELECT ns.id, ns.note_id, ns.user_id, ns.can_edit, ns.status,
                u.name, u.email_address, u.profile_icon
         FROM note_shares ns
         JOIN users u ON ns.user_id = u.id
         WHERE ns.note_id IN (?)`,
        [noteIds]
      );
      for (const s of shares) {
        if (!sharesMap.has(s.note_id)) sharesMap.set(s.note_id, []);
        sharesMap.get(s.note_id).push({
          id: s.id,
          note_id: s.note_id,
          user_id: s.user_id,
          can_edit: Boolean(s.can_edit),
          status: s.status,
          user: {
            id: s.user_id,
            name: s.name,
            email_address: s.email_address,
            profile_icon: s.profile_icon,
          },
        });
      }
    }

    const formatted = notes.map((n) => ({
      id: n.id,
      user_id: n.user_id,
      lesson_id: n.lesson_id,
      content: n.content,
      is_global: Boolean(n.is_global),
      reactions: typeof n.reactions === 'string' ? JSON.parse(n.reactions) : n.reactions || {},
      created_at: n.created_at,
      updated_at: n.updated_at,
      lesson_title: n.lesson_title,
      user: {
        id: n.user_id,
        name: n.author_name,
        email_address: n.author_email,
        role: n.author_role,
        profile_icon: n.author_icon,
      },
      lesson: n.lesson_id ? { id: n.lesson_id, title: n.lesson_title, lesson_type: n.lesson_type } : null,
      note_shares: sharesMap.get(n.id) || [],
      can_edit: n.user_id === userId || (sharesMap.get(n.id) || []).some((s) => s.user_id === userId && s.can_edit && s.status === 1),
      can_delete: n.user_id === userId || req.user.role >= 1,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Fetch notes error:', err);
    res.status(500).json({ error: 'Failed to fetch notes.' });
  }
});

// 2. Create Note with Optional Sharing
router.post('/', requireAuth, async (req, res) => {
  try {
    const { content, lesson_id, is_global, shared_student_ids, can_edit } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ error: 'Note content cannot be empty.' });
    }

    const [result] = await pool.query(
      `INSERT INTO notes (user_id, lesson_id, content, is_global, reactions, created_at, updated_at)
       VALUES (?, ?, ?, ?, '{}', NOW(), NOW())`,
      [req.user.id, lesson_id || null, content.trim(), is_global ? 1 : 0]
    );

    const noteId = result.insertId;

    // Handle student shares
    if (Array.isArray(shared_student_ids) && shared_student_ids.length > 0) {
      for (const sid of shared_student_ids) {
        if (sid !== req.user.id) {
          await pool.query(
            `INSERT INTO note_shares (note_id, user_id, can_edit, status, created_at, updated_at)
             VALUES (?, ?, ?, 0, NOW(), NOW())
             ON DUPLICATE KEY UPDATE can_edit = VALUES(can_edit)`,
            [noteId, sid, can_edit ? 1 : 0]
          );
        }
      }
    }

    res.status(201).json({ id: noteId, message: 'Note saved successfully.' });
  } catch (err) {
    console.error('Create note error:', err);
    res.status(500).json({ error: 'Failed to create note.' });
  }
});

// 3. Update Note
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, is_global, shared_student_ids, can_edit } = req.body;

    const [rows] = await pool.query('SELECT user_id FROM notes WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    // Check permission: author, admin, or shared with can_edit
    const isAuthor = rows[0].user_id === req.user.id;
    const isAdmin = req.user.role >= 1;

    let hasEditPermission = isAuthor || isAdmin;
    if (!hasEditPermission) {
      const [shareCheck] = await pool.query(
        'SELECT id FROM note_shares WHERE note_id = ? AND user_id = ? AND can_edit = 1 AND status = 1',
        [id, req.user.id]
      );
      if (shareCheck.length > 0) hasEditPermission = true;
    }

    if (!hasEditPermission) {
      return res.status(403).json({ error: 'You do not have permission to edit this note.' });
    }

    await pool.query(
      'UPDATE notes SET content = ?, is_global = ?, updated_at = NOW() WHERE id = ?',
      [content.trim(), is_global ? 1 : 0, id]
    );

    // If author or admin, update share list
    if (isAuthor || isAdmin) {
      if (Array.isArray(shared_student_ids)) {
        await pool.query('DELETE FROM note_shares WHERE note_id = ?', [id]);
        for (const sid of shared_student_ids) {
          if (sid !== req.user.id) {
            await pool.query(
              `INSERT INTO note_shares (note_id, user_id, can_edit, status, created_at, updated_at)
               VALUES (?, ?, ?, 0, NOW(), NOW())`,
              [id, sid, can_edit ? 1 : 0]
            );
          }
        }
      }
    }

    res.json({ success: true, message: 'Note updated successfully.' });
  } catch (err) {
    console.error('Update note error:', err);
    res.status(500).json({ error: 'Failed to update note.' });
  }
});

// 4. Delete Note
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT user_id FROM notes WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    if (rows[0].user_id !== req.user.id && req.user.role < 1) {
      return res.status(403).json({ error: 'You do not have permission to delete this note.' });
    }

    await pool.query('DELETE FROM notes WHERE id = ?', [id]);
    res.json({ success: true, message: 'Note deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete note.' });
  }
});

// 5. Pending Note Shares (Invites for Current User)
router.get('/shares/pending', requireAuth, async (req, res) => {
  try {
    const [shares] = await pool.query(
      `SELECT ns.id, ns.note_id, ns.user_id, ns.can_edit, ns.status, ns.created_at,
              n.content as note_content, n.lesson_id,
              u.name as sender_name, u.email_address as sender_email,
              l.title as lesson_title
       FROM note_shares ns
       JOIN notes n ON ns.note_id = n.id
       JOIN users u ON n.user_id = u.id
       LEFT JOIN lessons l ON n.lesson_id = l.id
       WHERE ns.user_id = ? AND ns.status = 0
       ORDER BY ns.created_at DESC`,
      [req.user.id]
    );

    const formatted = shares.map((s) => ({
      id: s.id,
      note_id: s.note_id,
      can_edit: Boolean(s.can_edit),
      status: s.status,
      created_at: s.created_at,
      user: {
        name: s.sender_name,
        email_address: s.sender_email,
      },
      note: {
        id: s.note_id,
        content: s.note_content,
        lesson_id: s.lesson_id,
        lesson_title: s.lesson_title,
      },
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending shares.' });
  }
});

// 6. Respond to Share (Accept: 1, Decline: 2)
router.post('/shares/:id/respond', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { accept } = req.body;
    const status = accept ? 1 : 2;

    await pool.query('UPDATE note_shares SET status = ?, updated_at = NOW() WHERE id = ? AND user_id = ?', [
      status,
      id,
      req.user.id,
    ]);

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update invite response.' });
  }
});

// 7. React to Note
router.post('/:id/reactions', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;

    const [rows] = await pool.query('SELECT user_id, content, reactions FROM notes WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    // A student/user can react to others' notes, but NOT their own note
    if (rows[0].user_id === req.user.id) {
      return res.status(400).json({ error: 'You cannot react to your own note.' });
    }

    let reactions = rows[0].reactions;
    if (typeof reactions === 'string') reactions = JSON.parse(reactions);
    if (!reactions) reactions = {};

    const userList = reactions[emoji] || [];
    const index = userList.indexOf(req.user.id);
    let added = false;

    if (index > -1) {
      userList.splice(index, 1);
    } else {
      userList.push(req.user.id);
      added = true;
    }

    reactions[emoji] = userList;

    await pool.query('UPDATE notes SET reactions = ? WHERE id = ?', [JSON.stringify(reactions), id]);

    // If a reaction was added, notify the note owner
    if (added) {
      const snippet = rows[0].content
        ? rows[0].content.length > 35
          ? rows[0].content.substring(0, 35) + '...'
          : rows[0].content
        : 'your note';
      await createNotification({
        user_id: rows[0].user_id,
        actor_id: req.user.id,
        type: 'note_reaction',
        title: `${emoji} New Reaction on Note`,
        message: `${req.user.name} reacted ${emoji} to your note "${snippet}"`,
        link: '/notes',
      });
    }

    res.json({ reactions });
  } catch (err) {
    console.error('React to note error:', err);
    res.status(500).json({ error: 'Failed to react to note.' });
  }
});

export default router;
