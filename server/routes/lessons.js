import { Router } from 'express';
import pool from '../config/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { createNotification, notifyAllUsers } from '../utils/notifications.js';
import { logAudit } from '../utils/auditLogger.js';

export function toISTDateString(val) {
  if (!val) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }
  if (typeof val === 'string') {
    const match = val.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  if (val instanceof Date) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(val);
  }
  return String(val).split('T')[0];
}

const router = Router();

// 1. List Lessons (Public or Authenticated)
// Supports filters: ?category_id=X, ?category=slug, ?lesson_type=0|1, ?status=0|1, ?search=...
router.get('/', async (req, res) => {
  try {
    const { category_id, category, lesson_type, status, search } = req.query;
    let sql = `
      SELECT l.id, l.title, l.lesson_date, l.topic, l.status, l.author_id, l.lesson_type, l.category_id,
             l.requires_revision, l.revision_count, l.revision_intervals,
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
        lesson_date: toISTDateString(l.lesson_date),
        topic: l.topic,
        status: l.status,
        author_id: l.author_id,
        lesson_type: l.lesson_type,
        category_id: l.category_id,
        requires_revision: l.requires_revision !== undefined ? Boolean(l.requires_revision) : true,
        revision_count: l.revision_count || 4,
        revision_intervals: l.revision_intervals ? (typeof l.revision_intervals === 'string' ? JSON.parse(l.revision_intervals) : l.revision_intervals) : [0, 1, 2, 7],
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
      lesson_date: toISTDateString(row.lesson_date),
      requires_revision: row.requires_revision !== undefined ? Boolean(row.requires_revision) : true,
      revision_count: row.revision_count || 4,
      revision_intervals: row.revision_intervals ? (typeof row.revision_intervals === 'string' ? JSON.parse(row.revision_intervals) : row.revision_intervals) : [0, 1, 2, 7],
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
    const {
      title,
      lesson_date,
      topic,
      status,
      category_id,
      lesson_type,
      content,
      requires_revision,
      revision_count,
      revision_intervals,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: 'Title is required.' });
    }

    const finalLessonDate = toISTDateString(lesson_date);
    const catId = category_id !== undefined && category_id !== null && category_id !== '' ? parseInt(category_id, 10) : null;
    const lType = lesson_type !== undefined ? parseInt(lesson_type, 10) : 0;
    const reqRev = requires_revision !== undefined ? (requires_revision ? 1 : 0) : 1;
    const revCount = revision_count !== undefined ? Math.max(1, parseInt(revision_count, 10)) : 4;
    const revIntervals = revision_intervals
      ? (typeof revision_intervals === 'string' ? revision_intervals : JSON.stringify(revision_intervals))
      : JSON.stringify([0, 1, 2, 7]);

    const [result] = await pool.query(
      `INSERT INTO lessons (title, lesson_date, topic, status, author_id, category_id, lesson_type, content, requires_revision, revision_count, revision_intervals, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        title.trim(),
        finalLessonDate,
        topic?.trim() || null,
        status ?? 0,
        req.user.id,
        catId,
        lType,
        content || '',
        reqRev,
        revCount,
        revIntervals,
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
    const {
      title,
      lesson_date,
      topic,
      status,
      category_id,
      lesson_type,
      content,
      requires_revision,
      revision_count,
      revision_intervals,
    } = req.body;

    const [existing] = await pool.query('SELECT id, status FROM lessons WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }

    const catId = category_id !== undefined && category_id !== null && category_id !== '' ? parseInt(category_id, 10) : null;
    const lType = lesson_type !== undefined ? parseInt(lesson_type, 10) : 0;
    const finalLessonDate = toISTDateString(lesson_date);
    const reqRev = requires_revision !== undefined ? (requires_revision ? 1 : 0) : 1;
    const revCount = revision_count !== undefined ? Math.max(1, parseInt(revision_count, 10)) : 4;
    const revIntervals = revision_intervals
      ? (typeof revision_intervals === 'string' ? revision_intervals : JSON.stringify(revision_intervals))
      : JSON.stringify([0, 1, 2, 7]);

    await pool.query(
      `UPDATE lessons
       SET title = ?, lesson_date = ?, topic = ?, status = ?, category_id = ?, lesson_type = ?, content = ?,
           requires_revision = ?, revision_count = ?, revision_intervals = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        title.trim(),
        finalLessonDate,
        topic?.trim() || null,
        status ?? 0,
        catId,
        lType,
        content || '',
        reqRev,
        revCount,
        revIntervals,
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

function getOrdinalStage(n) {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

// 7a. Spaced Repetition Revision Status
router.get('/:id/revision-status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [lessons] = await pool.query(
      'SELECT id, title, requires_revision, revision_count, revision_intervals FROM lessons WHERE id = ?',
      [id]
    );
    if (lessons.length === 0) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }
    const lesson = lessons[0];
    const requiresRevision = lesson.requires_revision !== 0;
    const maxStages = requiresRevision ? (lesson.revision_count || 4) : 1;
    const intervals = lesson.revision_intervals
      ? (typeof lesson.revision_intervals === 'string' ? JSON.parse(lesson.revision_intervals) : lesson.revision_intervals)
      : [0, 1, 2, 7];

    const [revs] = await pool.query(
      'SELECT * FROM student_lesson_revisions WHERE user_id = ? AND lesson_id = ?',
      [userId, id]
    );
    const rev = revs[0] || null;

    let currentStage = rev ? rev.current_stage : 0;
    let isFullyCompleted = Boolean(rev?.is_fully_completed || (currentStage >= maxStages));
    let completedAt = rev?.completed_at || null;

    if (!rev) {
      const [comps] = await pool.query(
        'SELECT completed, completed_at FROM lesson_completions WHERE user_id = ? AND lesson_id = ? AND completed = 1',
        [userId, id]
      );
      if (comps.length > 0) {
        currentStage = 1;
        isFullyCompleted = maxStages <= 1;
        completedAt = isFullyCompleted ? (comps[0].completed_at || null) : null;
      }
    }

    const nextUnlockAt = rev?.next_unlock_at || null;

    let isUnlocked = false;
    if (currentStage === 0) {
      isUnlocked = true;
    } else if (currentStage >= maxStages) {
      isUnlocked = false;
    } else {
      isUnlocked = !nextUnlockAt || new Date(nextUnlockAt) <= new Date();
    }

    // Requirements for 1st Read
    const [[notesRow]] = await pool.query(
      'SELECT COUNT(*) as cnt FROM notes WHERE user_id = ? AND lesson_id = ?',
      [userId, id]
    );
    const [[commentsRow]] = await pool.query(
      'SELECT COUNT(*) as cnt FROM lesson_comments WHERE user_id = ? AND lesson_id = ?',
      [userId, id]
    );

    const hasNote = notesRow.cnt > 0;
    const hasComment = commentsRow.cnt > 0;

    res.json({
      lesson_id: lesson.id,
      requires_revision: requiresRevision,
      current_stage: currentStage,
      max_stages: maxStages,
      intervals,
      is_unlocked: isUnlocked,
      next_unlock_at: nextUnlockAt,
      is_fully_completed: isFullyCompleted,
      completed_at: completedAt,
      requirements: {
        has_note: hasNote,
        has_comment: hasComment,
        can_complete_first_read: hasNote && hasComment,
      },
    });
  } catch (err) {
    console.error('Fetch revision status error:', err);
    res.status(500).json({ error: 'Failed to fetch revision status.' });
  }
});

// 7b. Complete Revision Stage
router.post('/:id/complete-stage', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [lessons] = await pool.query(
      'SELECT id, title, requires_revision, revision_count, revision_intervals FROM lessons WHERE id = ?',
      [id]
    );
    if (lessons.length === 0) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }
    const lesson = lessons[0];
    const requiresRevision = lesson.requires_revision !== 0;
    const maxStages = requiresRevision ? (lesson.revision_count || 4) : 1;
    const intervals = lesson.revision_intervals
      ? (typeof lesson.revision_intervals === 'string' ? JSON.parse(lesson.revision_intervals) : lesson.revision_intervals)
      : [0, 1, 2, 7];

    const [revs] = await pool.query(
      'SELECT * FROM student_lesson_revisions WHERE user_id = ? AND lesson_id = ?',
      [userId, id]
    );
    const rev = revs[0] || null;
    let currentStage = rev ? rev.current_stage : 0;

    if (!rev) {
      const [comps] = await pool.query(
        'SELECT completed FROM lesson_completions WHERE user_id = ? AND lesson_id = ? AND completed = 1',
        [userId, id]
      );
      if (comps.length > 0) {
        currentStage = 1;
      }
    }

    if (currentStage >= maxStages) {
      return res.status(400).json({ error: 'All revision reads for this lesson have already been completed.' });
    }

    // Stage 0 (1st Read) validation: requires at least 1 note and 1 comment
    if (currentStage === 0) {
      const [[notesRow]] = await pool.query(
        'SELECT COUNT(*) as cnt FROM notes WHERE user_id = ? AND lesson_id = ?',
        [userId, id]
      );
      const [[commentsRow]] = await pool.query(
        'SELECT COUNT(*) as cnt FROM lesson_comments WHERE user_id = ? AND lesson_id = ?',
        [userId, id]
      );

      if (notesRow.cnt === 0 || commentsRow.cnt === 0) {
        return res.status(400).json({
          error: 'To complete your 1st Read, please write at least 1 study note and join the classroom discussion!',
          requirements: {
            has_note: notesRow.cnt > 0,
            has_comment: commentsRow.cnt > 0,
          },
        });
      }
    } else {
      // Subsequent stages: verify unlock time
      if (rev && rev.next_unlock_at && new Date(rev.next_unlock_at) > new Date()) {
        return res.status(400).json({
          error: `This revision read is locked until ${new Date(rev.next_unlock_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST).`,
          next_unlock_at: rev.next_unlock_at,
        });
      }
    }

    const newStage = currentStage + 1;
    const isFullyCompleted = newStage >= maxStages ? 1 : 0;
    const completedAt = isFullyCompleted ? new Date() : null;

    let nextUnlockAt = null;
    if (!isFullyCompleted) {
      const delayDays = (intervals && intervals[newStage] !== undefined) ? Number(intervals[newStage]) : 1;
      nextUnlockAt = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000);
    }

    if (rev) {
      await pool.query(
        `UPDATE student_lesson_revisions
         SET current_stage = ?, max_stages = ?, next_unlock_at = ?, is_fully_completed = ?, completed_at = ?, updated_at = NOW()
         WHERE id = ?`,
        [newStage, maxStages, nextUnlockAt, isFullyCompleted, completedAt, rev.id]
      );
    } else {
      await pool.query(
        `INSERT INTO student_lesson_revisions (user_id, lesson_id, current_stage, max_stages, next_unlock_at, is_fully_completed, completed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [userId, id, newStage, maxStages, nextUnlockAt, isFullyCompleted, completedAt]
      );
    }

    // Mirror to lesson_completions
    const [completions] = await pool.query(
      'SELECT id FROM lesson_completions WHERE user_id = ? AND lesson_id = ?',
      [userId, id]
    );
    if (completions.length > 0) {
      await pool.query(
        `UPDATE lesson_completions
         SET completed = ?, needs_revision = 0, completed_at = ?, updated_at = NOW()
         WHERE id = ?`,
        [isFullyCompleted, completedAt, completions[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO lesson_completions (user_id, lesson_id, completed, needs_revision, completed_at, created_at, updated_at)
         VALUES (?, ?, ?, 0, ?, NOW(), NOW())`,
        [userId, id, isFullyCompleted, completedAt]
      );
    }

    // Audit log (only logs student actions)
    logAudit({
      user: req.user,
      action: 'create',
      resource_type: 'lesson',
      resource_id: id,
      resource_title: lesson.title,
      details: `Completed ${getOrdinalStage(newStage)} Read for lesson "${lesson.title}"${isFullyCompleted ? ' (100% Mastered!)' : ''}`,
    });

    res.json({
      success: true,
      lesson_id: lesson.id,
      current_stage: newStage,
      max_stages: maxStages,
      is_unlocked: !nextUnlockAt || new Date(nextUnlockAt) <= new Date(),
      next_unlock_at: nextUnlockAt,
      is_fully_completed: Boolean(isFullyCompleted),
      completed_at: completedAt,
      message: isFullyCompleted
        ? '🎉 Congratulations! You have 100% mastered this lesson!'
        : `✅ ${getOrdinalStage(newStage)} Read completed! Next read unlocks in ${intervals[newStage] || 1} day(s).`,
    });
  } catch (err) {
    console.error('Complete stage error:', err);
    res.status(500).json({ error: 'Failed to complete revision stage.' });
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
