import { Router } from 'express';
import pool from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
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

export default router;
