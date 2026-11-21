-- ====================================================================
-- FluentEdge - Category System Migration
-- Adds dynamic categories table, links lessons, and migrates existing data
-- ====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Create Categories Table
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `slug` VARCHAR(120) NOT NULL UNIQUE,
  `icon` VARCHAR(50) DEFAULT '📚',
  `description` VARCHAR(255) DEFAULT NULL,
  `order_index` INT DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_categories_slug` (`slug`),
  INDEX `idx_categories_order` (`order_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Add category_id to lessons if it does not exist
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'lessons' AND column_name = 'category_id';

SET @stmt = IF(@col_exists = 0, 
  'ALTER TABLE `lessons` ADD COLUMN `category_id` INT DEFAULT NULL AFTER `author_id`, ADD CONSTRAINT `fk_lessons_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL',
  'SELECT "category_id column already exists"'
);
PREPARE exec_stmt FROM @stmt;
EXECUTE exec_stmt;
DEALLOCATE PREPARE exec_stmt;

-- 3. Seed Default Categories
INSERT INTO `categories` (`name`, `slug`, `icon`, `description`, `order_index`)
VALUES 
  ('Daily Classes', 'daily-classes', '📖', 'Spoken English lessons, conversations, and practical daily usage', 1),
  ('Grammar & Foundations', 'grammar-foundations', '🧠', 'Foundational English rules, sentence structures, and grammar tips', 2),
  ('Vocabulary & Idioms', 'vocabulary-idioms', '🔤', 'Word banks, phrases, idioms, and situational expressions', 3)
ON DUPLICATE KEY UPDATE 
  `icon` = VALUES(`icon`),
  `description` = VALUES(`description`),
  `order_index` = VALUES(`order_index`);

-- 4. Auto-migrate existing lessons to categories based on lesson_type
UPDATE `lessons` 
SET `category_id` = (SELECT `id` FROM `categories` WHERE `slug` = 'daily-classes')
WHERE `lesson_type` = 0 AND (`category_id` IS NULL OR `category_id` = 0);

UPDATE `lessons` 
SET `category_id` = (SELECT `id` FROM `categories` WHERE `slug` = 'grammar-foundations')
WHERE `lesson_type` = 1 AND (`category_id` IS NULL OR `category_id` = 0);

SET FOREIGN_KEY_CHECKS = 1;
