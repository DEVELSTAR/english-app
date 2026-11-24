import pool from '../config/db.js';
import { createNotification } from './notifications.js';

function getOrdinalStage(n) {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

/**
 * Checks if any scheduled revision reads for the user have reached their unlock time (next_unlock_at <= NOW()).
 * Dispatches an in-app notification for each unlocked stage and records notified_unlock_stage.
 */
export async function checkAndNotifyDueRevisions(userId) {
  if (!userId) return;

  try {
    const [dueRows] = await pool.query(
      `SELECT r.id, r.user_id, r.lesson_id, r.current_stage, r.max_stages, r.next_unlock_at, r.notified_unlock_stage,
              l.title as lesson_title
       FROM student_lesson_revisions r
       JOIN lessons l ON r.lesson_id = l.id
       WHERE r.user_id = ?
         AND r.is_fully_completed = 0
         AND r.next_unlock_at IS NOT NULL
         AND r.next_unlock_at <= NOW()
         AND (r.notified_unlock_stage IS NULL OR r.notified_unlock_stage < r.current_stage + 1)`,
      [userId]
    );

    for (const row of dueRows) {
      const nextStage = row.current_stage + 1;
      const stageName = getOrdinalStage(nextStage);

      await createNotification({
        user_id: row.user_id,
        actor_id: null,
        type: 'revision_due',
        title: `⏰ ${stageName} Read Ready!`,
        message: `Time to revise "${row.lesson_title}" (${stageName} Read). Review to strengthen your memory and speaking fluency!`,
        link: `/lessons/${row.lesson_id}`,
      });

      await pool.query(
        'UPDATE student_lesson_revisions SET notified_unlock_stage = ? WHERE id = ?',
        [nextStage, row.id]
      );
    }
  } catch (err) {
    console.error('[RevisionNotification] Error checking due revisions:', err.message);
  }
}
