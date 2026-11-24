-- Revision Tracking & Spaced Repetition Migration
ALTER TABLE `lessons` ADD COLUMN `requires_revision` TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE `lessons` ADD COLUMN `revision_count` TINYINT NOT NULL DEFAULT 4;
ALTER TABLE `lessons` ADD COLUMN `revision_intervals` JSON DEFAULT ('[0, 1, 2, 7]');

CREATE TABLE IF NOT EXISTS `student_lesson_revisions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `lesson_id` INT NOT NULL,
  `current_stage` INT NOT NULL DEFAULT 0,
  `max_stages` INT NOT NULL DEFAULT 4,
  `stages_data` JSON DEFAULT ('{}'),
  `next_unlock_at` DATETIME DEFAULT NULL,
  `notified_unlock_stage` INT DEFAULT NULL,
  `is_fully_completed` TINYINT(1) NOT NULL DEFAULT 0,
  `completed_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_user_lesson_rev` (`user_id`, `lesson_id`),
  INDEX `idx_rev_user_stage` (`user_id`, `is_fully_completed`),
  INDEX `idx_rev_unlock` (`next_unlock_at`),
  CONSTRAINT `fk_rev_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rev_lesson` FOREIGN KEY (`lesson_id`) REFERENCES `lessons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
