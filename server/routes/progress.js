import { Router } from 'express';
import pool from '../config/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { checkAndNotifyDueRevisions } from '../utils/revisionNotifications.js';

const router = Router();

// 1. Get Category-wise Student Performance and Revision Metrics
router.get('/categories', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Trigger check for due revisions and dispatch notifications if unlocked
    await checkAndNotifyDueRevisions(userId);

    // Fetch all categories
    const [categories] = await pool.query(
      `SELECT id, name, slug, icon, description FROM categories ORDER BY id ASC`
    );

    // Fetch published lessons with revision settings
    const [lessons] = await pool.query(
      `SELECT id, category_id, requires_revision, revision_count, revision_intervals
       FROM lessons
       WHERE status = 1`
    );

    // Fetch student's revision records
    const [revisions] = await pool.query(
      `SELECT lesson_id, current_stage, max_stages, next_unlock_at, is_fully_completed
       FROM student_lesson_revisions
       WHERE user_id = ?`,
      [userId]
    );

    // Fetch legacy completed lessons
    const [completions] = await pool.query(
      `SELECT lesson_id FROM lesson_completions WHERE user_id = ? AND completed = 1`,
      [userId]
    );
    const completedSet = new Set(completions.map((c) => c.lesson_id));

    const revMap = new Map();
    for (const r of revisions) {
      revMap.set(r.lesson_id, r);
    }

    const now = new Date();

    const categoryStats = categories.map((cat) => {
      const catLessons = lessons.filter((l) => l.category_id === cat.id);
      const totalLessons = catLessons.length;

      let totalPossibleReads = 0;
      let completedReads = 0;
      let completedLessons = 0;
      let inProgressLessons = 0;
      let revisionsDueCount = 0;

      for (const lesson of catLessons) {
        const requiresRev = lesson.requires_revision !== 0;
        const maxStages = requiresRev ? (lesson.revision_count || 4) : 1;
        totalPossibleReads += maxStages;

        const rev = revMap.get(lesson.id);
        if (rev) {
          const currentStage = rev.current_stage || 0;
          completedReads += Math.min(currentStage, maxStages);

          if (rev.is_fully_completed || currentStage >= maxStages) {
            completedLessons++;
          } else if (currentStage > 0) {
            inProgressLessons++;
          }

          if (!rev.is_fully_completed && rev.next_unlock_at) {
            const unlockDate = new Date(rev.next_unlock_at);
            if (unlockDate <= now && currentStage > 0) {
              revisionsDueCount++;
            }
          }
        } else if (completedSet.has(lesson.id)) {
          completedReads += maxStages;
          completedLessons++;
        }
      }

      const percentage = totalPossibleReads > 0
        ? Math.min(100, Math.round((completedReads / totalPossibleReads) * 100))
        : 0;

      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon || '📚',
        description: cat.description || '',
        total_lessons: totalLessons,
        completed_lessons: completedLessons,
        in_progress_lessons: inProgressLessons,
        total_possible_reads: totalPossibleReads,
        completed_reads: completedReads,
        percentage,
        revisions_due_count: revisionsDueCount,
      };
    });

    const totalPossibleAll = categoryStats.reduce((sum, c) => sum + c.total_possible_reads, 0);
    const completedReadsAll = categoryStats.reduce((sum, c) => sum + c.completed_reads, 0);
    const overallPercentage = totalPossibleAll > 0
      ? Math.min(100, Math.round((completedReadsAll / totalPossibleAll) * 100))
      : 0;
    const totalRevisionsDue = categoryStats.reduce((sum, c) => sum + c.revisions_due_count, 0);
    const totalLessonsMastered = categoryStats.reduce((sum, c) => sum + c.completed_lessons, 0);

    res.json({
      categories: categoryStats,
      overall_percentage: overallPercentage,
      total_revisions_due: totalRevisionsDue,
      total_lessons_mastered: totalLessonsMastered,
    });
  } catch (err) {
    console.error('Fetch category progress error:', err);
    res.status(500).json({ error: 'Failed to fetch category progress.' });
  }
});

// 2. Get Per-Lesson Revision Stage Progress for Current Student
router.get('/lessons', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [lessons] = await pool.query(
      `SELECT id, requires_revision, revision_count
       FROM lessons
       WHERE status = 1`
    );

    const [revisions] = await pool.query(
      `SELECT lesson_id, current_stage, max_stages, next_unlock_at, is_fully_completed
       FROM student_lesson_revisions
       WHERE user_id = ?`,
      [userId]
    );

    const [completions] = await pool.query(
      `SELECT lesson_id FROM lesson_completions WHERE user_id = ? AND completed = 1`,
      [userId]
    );
    const completedSet = new Set(completions.map((c) => c.lesson_id));

    const revMap = new Map();
    for (const r of revisions) {
      revMap.set(r.lesson_id, r);
    }

    const now = new Date();
    const progressByLesson = {};

    for (const lesson of lessons) {
      const requiresRev = lesson.requires_revision !== 0;
      const maxStages = requiresRev ? (lesson.revision_count || 4) : 1;
      const rev = revMap.get(lesson.id);

      let currentStage = rev ? (rev.current_stage || 0) : 0;
      let isFullyCompleted = Boolean(rev?.is_fully_completed || currentStage >= maxStages);
      const nextUnlockAt = rev?.next_unlock_at || null;

      if (!rev && completedSet.has(lesson.id)) {
        currentStage = maxStages;
        isFullyCompleted = true;
      }

      let isUnlocked = false;
      if (currentStage === 0) {
        isUnlocked = true;
      } else if (currentStage < maxStages) {
        isUnlocked = !nextUnlockAt || new Date(nextUnlockAt) <= now;
      }

      progressByLesson[lesson.id] = {
        lesson_id: lesson.id,
        current_stage: Math.min(currentStage, maxStages),
        max_stages: maxStages,
        is_fully_completed: isFullyCompleted,
        is_unlocked: isUnlocked,
        next_unlock_at: nextUnlockAt,
      };
    }

    res.json(progressByLesson);
  } catch (err) {
    console.error('Fetch lesson progress map error:', err);
    res.status(500).json({ error: 'Failed to fetch lesson progress.' });
  }
});

// 3. Admin: Get Overall Progress Summary for All Students
router.get('/admin/students', requireAdmin, async (req, res) => {
  try {
    const [students] = await pool.query(
      `SELECT id, name, email_address, profile_icon, created_at
       FROM users
       WHERE (role IS NULL OR role NOT IN (1, 2))
       ORDER BY name ASC`
    );

    const [lessons] = await pool.query(
      `SELECT id, requires_revision, revision_count
       FROM lessons
       WHERE status = 1`
    );

    const totalLessons = lessons.length;
    const lessonMaxMap = new Map();
    let totalPossibleReads = 0;

    for (const l of lessons) {
      const maxStages = l.requires_revision !== 0 ? (l.revision_count || 4) : 1;
      lessonMaxMap.set(l.id, maxStages);
      totalPossibleReads += maxStages;
    }

    const [revisions] = await pool.query(
      `SELECT user_id, lesson_id, current_stage, is_fully_completed, updated_at
       FROM student_lesson_revisions`
    );

    const [completions] = await pool.query(
      `SELECT user_id, lesson_id, updated_at
       FROM lesson_completions
       WHERE completed = 1`
    );

    const [notesCounts] = await pool.query(
      `SELECT user_id, COUNT(*) as cnt FROM notes GROUP BY user_id`
    );
    const notesMap = new Map(notesCounts.map((r) => [r.user_id, Number(r.cnt)]));

    const [commentsCounts] = await pool.query(
      `SELECT user_id, COUNT(*) as cnt FROM lesson_comments GROUP BY user_id`
    );
    const commentsMap = new Map(commentsCounts.map((r) => [r.user_id, Number(r.cnt)]));

    const result = students.map((student) => {
      const studentRevs = revisions.filter(
        (r) => r.user_id === student.id && lessonMaxMap.has(r.lesson_id)
      );
      const revLessonIds = new Set(studentRevs.map((r) => r.lesson_id));
      const studentLegacyComps = completions.filter(
        (c) => c.user_id === student.id && lessonMaxMap.has(c.lesson_id) && !revLessonIds.has(c.lesson_id)
      );

      let completedReads = 0;
      let completedLessons = 0;
      let inProgressLessons = 0;
      let lastActivityAt = null;

      for (const rev of studentRevs) {
        const maxStages = lessonMaxMap.get(rev.lesson_id) || 4;
        const stage = Math.min(rev.current_stage || 0, maxStages);
        completedReads += stage;

        if (rev.is_fully_completed || stage >= maxStages) {
          completedLessons++;
        } else if (stage > 0) {
          inProgressLessons++;
        }

        if (rev.updated_at && (!lastActivityAt || new Date(rev.updated_at) > new Date(lastActivityAt))) {
          lastActivityAt = rev.updated_at;
        }
      }

      for (const comp of studentLegacyComps) {
        const maxStages = lessonMaxMap.get(comp.lesson_id) || 4;
        completedReads += maxStages;
        completedLessons++;
        if (comp.updated_at && (!lastActivityAt || new Date(comp.updated_at) > new Date(lastActivityAt))) {
          lastActivityAt = comp.updated_at;
        }
      }

      const overallPercentage = totalPossibleReads > 0
        ? Math.min(100, Math.round((completedReads / totalPossibleReads) * 100))
        : 0;

      return {
        id: student.id,
        name: student.name,
        email_address: student.email_address,
        profile_icon: student.profile_icon || 'user',
        created_at: student.created_at,
        overall_percentage: overallPercentage,
        completed_lessons: completedLessons,
        in_progress_lessons: inProgressLessons,
        total_lessons: totalLessons,
        completed_reads: completedReads,
        total_possible_reads: totalPossibleReads,
        notes_count: notesMap.get(student.id) || 0,
        comments_count: commentsMap.get(student.id) || 0,
        last_activity_at: lastActivityAt,
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Admin fetch students progress error:', err);
    res.status(500).json({ error: 'Failed to fetch students progress.' });
  }
});

// 4. Admin: Get Detailed Progress for a Single Student
router.get('/admin/students/:studentId', requireAdmin, async (req, res) => {
  try {
    const { studentId } = req.params;

    const [users] = await pool.query(
      `SELECT id, name, email_address, profile_icon, created_at
       FROM users
       WHERE id = ? AND (role IS NULL OR role NOT IN (1, 2))`,
      [studentId]
    );
    if (users.length === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }
    const student = users[0];

    const [categories] = await pool.query(
      `SELECT id, name, slug, icon FROM categories ORDER BY id ASC`
    );

    const [lessons] = await pool.query(
      `SELECT l.id, l.title, l.lesson_date, l.category_id, l.requires_revision, l.revision_count,
              c.name as category_name, c.icon as category_icon
       FROM lessons l
       LEFT JOIN categories c ON l.category_id = c.id
       WHERE l.status = 1
       ORDER BY l.lesson_date DESC, l.id DESC`
    );

    const [revisions] = await pool.query(
      `SELECT lesson_id, current_stage, max_stages, next_unlock_at, is_fully_completed, completed_at, updated_at
       FROM student_lesson_revisions
       WHERE user_id = ?`,
      [studentId]
    );
    const revMap = new Map(revisions.map((r) => [r.lesson_id, r]));

    const [completions] = await pool.query(
      `SELECT lesson_id, completed_at, updated_at
       FROM lesson_completions
       WHERE user_id = ? AND completed = 1`,
      [studentId]
    );
    const compMap = new Map(completions.map((c) => [c.lesson_id, c]));

    const [notesRows] = await pool.query(
      `SELECT lesson_id, COUNT(*) as cnt FROM notes WHERE user_id = ? AND lesson_id IS NOT NULL GROUP BY lesson_id`,
      [studentId]
    );
    const notesMap = new Map(notesRows.map((r) => [r.lesson_id, Number(r.cnt)]));

    const [commentsRows] = await pool.query(
      `SELECT lesson_id, COUNT(*) as cnt FROM lesson_comments WHERE user_id = ? GROUP BY lesson_id`,
      [studentId]
    );
    const commentsMap = new Map(commentsRows.map((r) => [r.lesson_id, Number(r.cnt)]));

    const lessonDetails = lessons.map((l) => {
      const maxStages = l.requires_revision !== 0 ? (l.revision_count || 4) : 1;
      const rev = revMap.get(l.id);
      const comp = !rev ? compMap.get(l.id) : null;
      const currentStage = rev ? Math.min(rev.current_stage || 0, maxStages) : comp ? maxStages : 0;
      const isFullyCompleted = Boolean(rev?.is_fully_completed || currentStage >= maxStages || comp);

      return {
        lesson_id: l.id,
        title: l.title,
        lesson_date: l.lesson_date,
        category_id: l.category_id,
        category_name: l.category_name || 'Uncategorized',
        category_icon: l.category_icon || '📚',
        current_stage: currentStage,
        max_stages: maxStages,
        is_fully_completed: isFullyCompleted,
        next_unlock_at: rev?.next_unlock_at || null,
        completed_at: rev?.completed_at || comp?.completed_at || null,
        updated_at: rev?.updated_at || comp?.updated_at || null,
        notes_count: notesMap.get(l.id) || 0,
        comments_count: commentsMap.get(l.id) || 0,
      };
    });

    const categoryDetails = categories.map((cat) => {
      const catLessons = lessonDetails.filter((l) => l.category_id === cat.id);
      const totalPossibleReads = catLessons.reduce((sum, l) => sum + l.max_stages, 0);
      const completedReads = catLessons.reduce((sum, l) => sum + l.current_stage, 0);
      const completedLessons = catLessons.filter((l) => l.is_fully_completed).length;
      const percentage = totalPossibleReads > 0
        ? Math.min(100, Math.round((completedReads / totalPossibleReads) * 100))
        : 0;

      return {
        id: cat.id,
        name: cat.name,
        icon: cat.icon || '📚',
        total_lessons: catLessons.length,
        completed_lessons: completedLessons,
        completed_reads: completedReads,
        total_possible_reads: totalPossibleReads,
        percentage,
      };
    });

    res.json({
      student,
      categories: categoryDetails,
      lessons: lessonDetails,
    });
  } catch (err) {
    console.error('Admin fetch single student progress error:', err);
    res.status(500).json({ error: 'Failed to fetch student progress details.' });
  }
});

export default router;
