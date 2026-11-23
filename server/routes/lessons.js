import { Router } from 'express';
import pool from '../config/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { createNotification, notifyAllUsers } from '../utils/notifications.js';
import { logAudit } from '../utils/auditLogger.js';

const router = Router();

// 1. List Lessons (Public or Authenticated)
// Supports filters: ?category_id=X, ?category=slug, ?lesson_type=0|1, ?status=0|1, ?search=...
router.get('/', async (req, res) => {
  try {
    const { category_id, category, lesson_type, status, search } = req.query;
    let sql = `
      SELECT l.id, l.title, l.lesson_date, l.topic, l.status, l.author_id, l.lesson_type, l.category_id,
             l.created_at, l.updated_at,
             c.name as category_name, c.slug as category_slug, c.icon as category_icon, c.description as category_description
      FROM lessons l
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (category_id !== undefined && category_id !== '') {
      sql += ' AND l.category_id = ?';
      params.push(parseInt(category_id, 10));
    } else if (category && category.trim()) {
      sql += ' AND c.slug = ?';
      params.push(category.trim());
    }

    if (lesson_type !== undefined && lesson_type !== '') {
      sql += ' AND l.lesson_type = ?';
      params.push(parseInt(lesson_type, 10));
    }

    if (status !== undefined && status !== '') {
      sql += ' AND l.status = ?';
      params.push(parseInt(status, 10));
    }

    if (search && search.trim()) {
      sql += ' AND (l.title LIKE ? OR l.topic LIKE ? OR c.name LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    sql += ' ORDER BY l.lesson_date DESC, l.id DESC';

    const [lessons] = await pool.query(sql, params);
    res.json(
      lessons.map((l) => ({
        id: l.id,
        title: l.title,
        lesson_date: l.lesson_date
          ? (l.lesson_date instanceof Date ? l.lesson_date.toISOString().split('T')[0] : String(l.lesson_date).split('T')[0])
          : null,
        topic: l.topic,
        status: l.status,
        author_id: l.author_id,
        lesson_type: l.lesson_type,
        category_id: l.category_id,
        created_at: l.created_at,
        updated_at: l.updated_at,
        category: l.category_id
          ? {
              id: l.category_id,
              name: l.category_name,
              slug: l.category_slug,
              icon: l.category_icon || '📚',
              description: l.category_description,
            }
          : null,
      }))
    );
  } catch (err) {
    console.error('Fetch lessons error:', err);
    res.status(500).json({ error: 'Failed to fetch lessons.' });
  }
});

// 2. Get Single Lesson with Content, Category, Prev, and Next
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT l.*,
              c.name as category_name, c.slug as category_slug, c.icon as category_icon, c.description as category_description
       FROM lessons l
       LEFT JOIN categories c ON l.category_id = c.id
       WHERE l.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }

    const row = rows[0];
    const lesson = {
      ...row,
      lesson_date: row.lesson_date
        ? (row.lesson_date instanceof Date ? row.lesson_date.toISOString().split('T')[0] : String(row.lesson_date).split('T')[0])
        : null,
      category: row.category_id
        ? {
            id: row.category_id,
            name: row.category_name,
            slug: row.category_slug,
            icon: row.category_icon || '📚',
            description: row.category_description,
          }
        : null,
    };

    // Find Previous and Next Lessons in the same category (or fallback to lesson_type)
    let prevQuery = 'SELECT id, title, lesson_date, lesson_type, category_id FROM lessons WHERE status = 1';
    let nextQuery = 'SELECT id, title, lesson_date, lesson_type, category_id FROM lessons WHERE status = 1';
    const filterParams = [];

    if (lesson.category_id) {
      prevQuery += ' AND category_id = ?';
      nextQuery += ' AND category_id = ?';
      filterParams.push(lesson.category_id);
    } else {
      prevQuery += ' AND lesson_type = ?';
      nextQuery += ' AND lesson_type = ?';
      filterParams.push(lesson.lesson_type);
    }

    const [prevRows] = await pool.query(
      `${prevQuery} AND (lesson_date < ? OR (lesson_date = ? AND id < ?))
       ORDER BY lesson_date DESC, id DESC LIMIT 1`,
      [...filterParams, lesson.lesson_date, lesson.lesson_date, lesson.id]
    );

    const [nextRows] = await pool.query(
      `${nextQuery} AND (lesson_date > ? OR (lesson_date = ? AND id > ?))
       ORDER BY lesson_date ASC, id ASC LIMIT 1`,
      [...filterParams, lesson.lesson_date, lesson.lesson_date, lesson.id]
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
    const { title, lesson_date, topic, status, category_id, lesson_type, content } = req.body;
    if (!title?.trim() || !lesson_date) {
      return res.status(400).json({ error: 'Title and lesson date are required.' });
    }

    const catId = category_id !== undefined && category_id !== null && category_id !== '' ? parseInt(category_id, 10) : null;
    const lType = lesson_type !== undefined ? parseInt(lesson_type, 10) : 0;

    const [result] = await pool.query(
      `INSERT INTO lessons (title, lesson_date, topic, status, author_id, category_id, lesson_type, content, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        title.trim(),
        lesson_date,
        topic?.trim() || null,
        status ?? 0,
        req.user.id,
        catId,
        lType,
        content || '',
      ]
    );

    const [created] = await pool.query(
      `SELECT l.*, c.name as category_name, c.slug as category_slug, c.icon as category_icon
       FROM lessons l
       LEFT JOIN categories c ON l.category_id = c.id
       WHERE l.id = ?`,
      [result.insertId]
    );

    const row = created[0];

    // If lesson is created as published, notify all students
    if (status === 1) {
      await notifyAllUsers({
        actor_id: req.user.id,
        type: 'lesson_added',
        title: '🚀 New Lesson Added',
        message: `A new lesson "${title.trim()}" was just published!`,
        link: `/lessons/${result.insertId}`,
      });
    }

    // Log audit trail for lesson
    logAudit({
      user: req.user,
      action: 'create',
      resource_type: 'lesson',
      resource_id: result.insertId,
      resource_title: title.trim(),
      details: `Created curriculum lesson: "${title.trim()}" (Status: ${status === 1 ? 'Published' : 'Draft'})`,
    });

    res.status(201).json({
      ...row,
      category: row.category_id
        ? { id: row.category_id, name: row.category_name, slug: row.category_slug, icon: row.category_icon || '📚' }
        : null,
    });
  } catch (err) {
    console.error('Create lesson error:', err);
    res.status(500).json({ error: 'Failed to create lesson.' });
  }
});

// 4. Admin: Update Lesson
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, lesson_date, topic, status, category_id, lesson_type, content } = req.body;

    const [existing] = await pool.query('SELECT id, status FROM lessons WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }

    const catId = category_id !== undefined && category_id !== null && category_id !== '' ? parseInt(category_id, 10) : null;
    const lType = lesson_type !== undefined ? parseInt(lesson_type, 10) : 0;

    await pool.query(
      `UPDATE lessons
       SET title = ?, lesson_date = ?, topic = ?, status = ?, category_id = ?, lesson_type = ?, content = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        title.trim(),
        lesson_date,
        topic?.trim() || null,
        status ?? 0,
        catId,
        lType,
        content || '',
        id,
      ]
    );

    // If newly published, notify all students
    if (existing[0].status !== 1 && status === 1) {
      await notifyAllUsers({
        actor_id: req.user.id,
        type: 'lesson_added',
        title: '🚀 New Lesson Published',
        message: `A new lesson "${title.trim()}" is now available to learn!`,
        link: `/lessons/${id}`,
      });
    }

    const [updated] = await pool.query(
      `SELECT l.*, c.name as category_name, c.slug as category_slug, c.icon as category_icon
       FROM lessons l
       LEFT JOIN categories c ON l.category_id = c.id
       WHERE l.id = ?`,
      [id]
    );

    const row = updated[0];

    // Log audit trail
    logAudit({
      user: req.user,
      action: 'update',
      resource_type: 'lesson',
      resource_id: id,
      resource_title: title.trim(),
      details: `Updated lesson: "${title.trim()}" (Status: ${status === 1 ? 'Published' : 'Draft'})`,
    });

    res.json({
      ...row,
      category: row.category_id
        ? { id: row.category_id, name: row.category_name, slug: row.category_slug, icon: row.category_icon || '📚' }
        : null,
    });
  } catch (err) {
    console.error('Update lesson error:', err);
    res.status(500).json({ error: 'Failed to update lesson.' });
  }
});

// 5. Admin: Delete Lesson
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT title FROM lessons WHERE id = ?', [id]);
    await pool.query('DELETE FROM lessons WHERE id = ?', [id]);

    // Log audit trail
    logAudit({
      user: req.user,
      action: 'destroy',
      resource_type: 'lesson',
      resource_id: id,
      resource_title: existing[0]?.title || `Lesson ${id}`,
      details: `Deleted lesson ID ${id}: "${existing[0]?.title || ''}"`,
    });

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

    // If replying to a parent comment, notify the parent comment's author
    if (parent_id) {
      const [parentRows] = await pool.query(
        'SELECT c.user_id, l.title as lesson_title FROM lesson_comments c JOIN lessons l ON c.lesson_id = l.id WHERE c.id = ?',
        [parent_id]
      );
      if (parentRows.length > 0 && parentRows[0].user_id !== req.user.id) {
        await createNotification({
          user_id: parentRows[0].user_id,
          actor_id: req.user.id,
          type: 'comment_reply',
          title: '💬 New Reply to Your Comment',
          message: `${req.user.name} replied to your comment in "${parentRows[0].lesson_title}"`,
          link: `/lessons/${id}`,
        });
      }
    }

    // Log audit trail for comment
    logAudit({
      user: req.user,
      action: 'create',
      resource_type: 'comment',
      resource_id: result.insertId,
      resource_title: `Lesson ${id}`,
      details: `Posted comment on lesson ID ${id}: "${content.trim().substring(0, 45)}${content.trim().length > 45 ? '...' : ''}"`,
    });

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

    // Log audit trail
    logAudit({
      user: req.user,
      action: 'update',
      resource_type: 'comment',
      resource_id: commentId,
      details: `Updated comment ID ${commentId}`,
    });

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

    // Log audit trail
    logAudit({
      user: req.user,
      action: 'destroy',
      resource_type: 'comment',
      resource_id: commentId,
      details: `Deleted comment ID ${commentId}`,
    });

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

    const [rows] = await pool.query(
      `SELECT c.user_id, c.content, c.reactions, c.lesson_id, l.title as lesson_title
       FROM lesson_comments c
       JOIN lessons l ON c.lesson_id = l.id
       WHERE c.id = ?`,
      [commentId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    // A student/user can react to others' comments, but NOT their own comment
    if (rows[0].user_id === req.user.id) {
      return res.status(400).json({ error: 'You cannot react to your own comment.' });
    }

    let reactions = rows[0].reactions;
    if (typeof reactions === 'string') reactions = JSON.parse(reactions);
    if (!reactions) reactions = {};

    const userList = reactions[emoji] || [];
    const userId = req.user.id;
    const index = userList.indexOf(userId);
    let added = false;

    if (index > -1) {
      userList.splice(index, 1);
    } else {
      userList.push(userId);
      added = true;
    }

    reactions[emoji] = userList;

    await pool.query('UPDATE lesson_comments SET reactions = ? WHERE id = ?', [
      JSON.stringify(reactions),
      commentId,
    ]);

    // Log audit trail for reaction
    logAudit({
      user: req.user,
      action: 'reaction',
      resource_type: 'comment',
      resource_id: commentId,
      resource_title: rows[0].lesson_title,
      details: `${req.user.name} ${added ? 'added' : 'removed'} reaction ${emoji} on comment in "${rows[0].lesson_title}"`,
    });

    // If reaction was added, notify the comment author
    if (added) {
      await createNotification({
        user_id: rows[0].user_id,
        actor_id: req.user.id,
        type: 'comment_reaction',
        title: `${emoji} New Reaction in Discussion`,
        message: `${req.user.name} reacted ${emoji} to your comment in "${rows[0].lesson_title}"`,
        link: `/lessons/${rows[0].lesson_id}`,
      });
    }

    res.json({ reactions });
  } catch (err) {
    console.error('Update reaction error:', err);
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

    res.locals.auditLogged = true;
    logAudit({
      user: req.user,
      action: 'destroy',
      resource_type: 'chat',
      resource_id: id,
      resource_title: `Lesson #${id}`,
      details: `Cleared AI chat history for lesson #${id}`,
    });

    res.json({ success: true, message: 'Chat history cleared.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear chat history.' });
  }
});

export default router;
