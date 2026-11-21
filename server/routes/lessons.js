import { Router } from 'express';
import pool from '../config/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// 1. List Lessons (Public or Authenticated)
// Supports filters: ?lesson_type=0|1 and ?status=0|1
router.get('/', async (req, res) => {
  try {
    const { lesson_type, status, search } = req.query;
    let sql = 'SELECT id, title, lesson_date, topic, status, author_id, lesson_type, created_at, updated_at FROM lessons WHERE 1=1';
    const params = [];

    if (lesson_type !== undefined && lesson_type !== '') {
      sql += ' AND lesson_type = ?';
      params.push(parseInt(lesson_type, 10));
    }

    if (status !== undefined && status !== '') {
      sql += ' AND status = ?';
      params.push(parseInt(status, 10));
    }

    if (search && search.trim()) {
      sql += ' AND (title LIKE ? OR topic LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    sql += ' ORDER BY lesson_date DESC, id DESC';

    const [lessons] = await pool.query(sql, params);
    res.json(lessons);
  } catch (err) {
    console.error('Fetch lessons error:', err);
    res.status(500).json({ error: 'Failed to fetch lessons.' });
  }
});

// 2. Get Single Lesson with Content, Prev, and Next
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM lessons WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }

    const lesson = rows[0];

    // Find Previous and Next Lessons in the same lesson_type
    const [prevRows] = await pool.query(
      `SELECT id, title, lesson_date, lesson_type FROM lessons
       WHERE lesson_type = ? AND status = 1 AND (lesson_date < ? OR (lesson_date = ? AND id < ?))
       ORDER BY lesson_date DESC, id DESC LIMIT 1`,
      [lesson.lesson_type, lesson.lesson_date, lesson.lesson_date, lesson.id]
    );

    const [nextRows] = await pool.query(
      `SELECT id, title, lesson_date, lesson_type FROM lessons
       WHERE lesson_type = ? AND status = 1 AND (lesson_date > ? OR (lesson_date = ? AND id > ?))
       ORDER BY lesson_date ASC, id ASC LIMIT 1`,
      [lesson.lesson_type, lesson.lesson_date, lesson.lesson_date, lesson.id]
    );

    res.json({
      lesson,
      previousLesson: prevRows[0] || null,
      nextLesson: nextRows[0] || null,
    });
  } catch (err) {
    console.error('Fetch lesson error:', err);
    res.status(500).json({ error: 'Failed to fetch lesson detail.' });
  }
});

// 3. Admin: Create Lesson
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { title, lesson_date, topic, status, lesson_type, content } = req.body;
    if (!title?.trim() || !lesson_date) {
      return res.status(400).json({ error: 'Title and lesson date are required.' });
    }

    const [result] = await pool.query(
      `INSERT INTO lessons (title, lesson_date, topic, status, author_id, lesson_type, content, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        title.trim(),
        lesson_date,
        topic?.trim() || null,
        status ?? 0,
        req.user.id,
        lesson_type ?? 0,
        content || '',
      ]
    );

    const [created] = await pool.query('SELECT * FROM lessons WHERE id = ?', [result.insertId]);
    res.status(201).json(created[0]);
  } catch (err) {
    console.error('Create lesson error:', err);
    res.status(500).json({ error: 'Failed to create lesson.' });
  }
});

// 4. Admin: Update Lesson
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, lesson_date, topic, status, lesson_type, content } = req.body;

    const [existing] = await pool.query('SELECT id FROM lessons WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }

    await pool.query(
      `UPDATE lessons
       SET title = ?, lesson_date = ?, topic = ?, status = ?, lesson_type = ?, content = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        title.trim(),
        lesson_date,
        topic?.trim() || null,
        status ?? 0,
        lesson_type ?? 0,
        content || '',
        id,
      ]
    );

    const [updated] = await pool.query('SELECT * FROM lessons WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('Update lesson error:', err);
    res.status(500).json({ error: 'Failed to update lesson.' });
  }
});

// 5. Admin: Delete Lesson
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM lessons WHERE id = ?', [id]);
    res.json({ success: true, message: 'Lesson deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete lesson.' });
  }
});

// 6. Student Progress: Get Completion
router.get('/:id/completion', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM lesson_completions WHERE user_id = ? AND lesson_id = ?',
      [req.user.id, id]
    );
    if (rows.length === 0) {
      return res.json({ completed: false, needs_revision: false });
    }
    res.json({
      ...rows[0],
      completed: Boolean(rows[0].completed),
      needs_revision: Boolean(rows[0].needs_revision),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch lesson progress.' });
  }
});

// 7. Student Progress: Toggle Complete / Needs Revision
router.post('/:id/completion', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { completed, needs_revision } = req.body;

    const [existing] = await pool.query(
      'SELECT id, completed, needs_revision FROM lesson_completions WHERE user_id = ? AND lesson_id = ?',
      [req.user.id, id]
    );

    const isCompleted = completed !== undefined ? (completed ? 1 : 0) : existing[0]?.completed || 0;
    const isNeedsRevision = needs_revision !== undefined ? (needs_revision ? 1 : 0) : existing[0]?.needs_revision || 0;
    const completedAt = isCompleted ? new Date() : null;

    if (existing.length > 0) {
      await pool.query(
        `UPDATE lesson_completions
         SET completed = ?, needs_revision = ?, completed_at = ?, updated_at = NOW()
         WHERE id = ?`,
        [isCompleted, isNeedsRevision, completedAt, existing[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO lesson_completions (user_id, lesson_id, completed, needs_revision, completed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [req.user.id, id, isCompleted, isNeedsRevision, completedAt]
      );
    }

    res.json({
      success: true,
      completed: Boolean(isCompleted),
      needs_revision: Boolean(isNeedsRevision),
      completed_at: completedAt,
    });
  } catch (err) {
    console.error('Update completion error:', err);
    res.status(500).json({ error: 'Failed to update progress.' });
  }
});

// 8. Comments: List Lesson Comments & Replies
router.get('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT c.id, c.lesson_id, c.user_id, c.parent_id, c.content, c.reactions, c.created_at, c.updated_at,
              u.name as user_name, u.email_address as user_email, u.role as user_role, u.profile_icon as user_icon
       FROM lesson_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.lesson_id = ?
       ORDER BY c.created_at ASC`,
      [id]
    );

    // Build comment trees (nested replies)
    const topLevel = [];
    const map = new Map();

    for (const r of rows) {
      const formatted = {
        id: r.id,
        lesson_id: r.lesson_id,
        user_id: r.user_id,
        parent_id: r.parent_id,
        content: r.content,
        reactions: typeof r.reactions === 'string' ? JSON.parse(r.reactions) : r.reactions || {},
        created_at: r.created_at,
        updated_at: r.updated_at,
        user: {
          id: r.user_id,
          name: r.user_name,
          email_address: r.user_email,
          role: r.user_role,
          profile_icon: r.user_icon,
        },
        replies: [],
      };
      map.set(r.id, formatted);
    }

    for (const r of rows) {
      const node = map.get(r.id);
      if (r.parent_id && map.has(r.parent_id)) {
        map.get(r.parent_id).replies.push(node);
      } else {
        topLevel.push(node);
      }
    }

    res.json(topLevel);
  } catch (err) {
    console.error('Fetch comments error:', err);
    res.status(500).json({ error: 'Failed to fetch comments.' });
  }
});

// 9. Comments: Post Comment / Reply
router.post('/:id/comments', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, parent_id } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty.' });
    }

    const [result] = await pool.query(
      `INSERT INTO lesson_comments (lesson_id, user_id, parent_id, content, reactions, created_at, updated_at)
       VALUES (?, ?, ?, ?, '{}', NOW(), NOW())`,
      [id, req.user.id, parent_id || null, content.trim()]
    );

    const [inserted] = await pool.query(
      `SELECT c.*, u.name as user_name, u.email_address as user_email, u.role as user_role, u.profile_icon as user_icon
       FROM lesson_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [result.insertId]
    );

    const r = inserted[0];
    res.status(201).json({
      id: r.id,
      lesson_id: r.lesson_id,
      user_id: r.user_id,
      parent_id: r.parent_id,
      content: r.content,
      reactions: {},
      created_at: r.created_at,
      updated_at: r.updated_at,
      user: {
        id: r.user_id,
        name: r.user_name,
        email_address: r.user_email,
        role: r.user_role,
        profile_icon: r.user_icon,
      },
      replies: [],
    });
  } catch (err) {
    console.error('Post comment error:', err);
    res.status(500).json({ error: 'Failed to post comment.' });
  }
});

// 10. Comments: Edit Comment
router.put('/:id/comments/:commentId', requireAuth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    const [existing] = await pool.query('SELECT user_id FROM lesson_comments WHERE id = ?', [commentId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    if (existing[0].user_id !== req.user.id && req.user.role < 1) {
      return res.status(403).json({ error: 'You do not have permission to edit this comment.' });
    }

    await pool.query('UPDATE lesson_comments SET content = ?, updated_at = NOW() WHERE id = ?', [
      content.trim(),
      commentId,
    ]);

    res.json({ success: true, message: 'Comment updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update comment.' });
  }
});

// 11. Comments: Delete Comment
router.delete('/:id/comments/:commentId', requireAuth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const [existing] = await pool.query('SELECT user_id FROM lesson_comments WHERE id = ?', [commentId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    if (existing[0].user_id !== req.user.id && req.user.role < 1) {
      return res.status(403).json({ error: 'You do not have permission to delete this comment.' });
    }

    await pool.query('DELETE FROM lesson_comments WHERE id = ?', [commentId]);
    res.json({ success: true, message: 'Comment deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete comment.' });
  }
});

// 12. Comments: React with Emoji
router.post('/:id/comments/:commentId/reactions', requireAuth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { emoji } = req.body;

    const [rows] = await pool.query('SELECT reactions FROM lesson_comments WHERE id = ?', [commentId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    let reactions = rows[0].reactions;
    if (typeof reactions === 'string') reactions = JSON.parse(reactions);
    if (!reactions) reactions = {};

    const userList = reactions[emoji] || [];
    const userId = req.user.id;
    const index = userList.indexOf(userId);

    if (index > -1) {
      userList.splice(index, 1);
    } else {
      userList.push(userId);
    }

    reactions[emoji] = userList;

    await pool.query('UPDATE lesson_comments SET reactions = ? WHERE id = ?', [
      JSON.stringify(reactions),
      commentId,
    ]);

    res.json({ reactions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update reaction.' });
  }
});

// 13. AI Chat: Get Lesson Chat History
router.get('/:id/chat', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [messages] = await pool.query(
      'SELECT id, role, content, audio_url, created_at FROM lesson_chat_messages WHERE lesson_id = ? AND user_id = ? ORDER BY created_at ASC',
      [id, req.user.id]
    );
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat history.' });
  }
});

// 14. AI Chat: Clear Lesson Chat History
router.delete('/:id/chat', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM lesson_chat_messages WHERE lesson_id = ? AND user_id = ?', [id, req.user.id]);
    res.json({ success: true, message: 'Chat history cleared.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear chat history.' });
  }
});

export default router;
