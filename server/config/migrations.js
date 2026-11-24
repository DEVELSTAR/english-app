import pool from './db.js';

/**
 * Idempotently verifies and applies database schema migrations for Revision Tracking.
 */
export async function ensureRevisionSchema() {
  try {
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lessons'`
    );
    const existing = new Set(cols.map((c) => c.COLUMN_NAME));

    if (!existing.has('requires_revision')) {
      await pool.query('ALTER TABLE lessons ADD COLUMN requires_revision TINYINT(1) NOT NULL DEFAULT 1');
      console.log('[DB Migration] Added requires_revision to lessons.');
    }
    if (!existing.has('revision_count')) {
      await pool.query('ALTER TABLE lessons ADD COLUMN revision_count TINYINT NOT NULL DEFAULT 4');
      console.log('[DB Migration] Added revision_count to lessons.');
    }
    if (!existing.has('revision_intervals')) {
      await pool.query("ALTER TABLE lessons ADD COLUMN revision_intervals JSON DEFAULT ('[0, 1, 2, 7]')");
      console.log('[DB Migration] Added revision_intervals to lessons.');
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_lesson_revisions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        lesson_id INT NOT NULL,
        current_stage INT NOT NULL DEFAULT 0,
        max_stages INT NOT NULL DEFAULT 4,
        stages_data JSON DEFAULT ('{}'),
        next_unlock_at DATETIME DEFAULT NULL,
        notified_unlock_stage INT DEFAULT NULL,
        is_fully_completed TINYINT(1) NOT NULL DEFAULT 0,
        completed_at DATETIME DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_user_lesson_rev (user_id, lesson_id),
        INDEX idx_rev_user_stage (user_id, is_fully_completed),
        INDEX idx_rev_unlock (next_unlock_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('[DB Schema] Revision tracking schema verified.');
  } catch (err) {
    console.error('[DB Schema] Migration notice:', err.message);
  }
}
