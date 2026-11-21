import { Router } from 'express';
import pool from '../config/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// 1. Get All Categories (with lesson counts)
router.get('/', async (req, res) => {
  try {
    const [categories] = await pool.query(`
      SELECT c.id, c.name, c.slug, c.icon, c.description, c.order_index, c.created_at, c.updated_at,
             COUNT(l.id) as lessons_count
      FROM categories c
      LEFT JOIN lessons l ON c.id = l.category_id AND l.status = 1
      GROUP BY c.id
      ORDER BY c.order_index ASC, c.name ASC
    `);

    res.json(
      categories.map((c) => ({
        ...c,
        lessons_count: parseInt(c.lessons_count || '0', 10),
      }))
    );
  } catch (err) {
    console.error('Fetch categories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

// 2. Create Category (Admin Only or On-The-Fly in Lesson Editor)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, icon, description, order_index } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required.' });
    }

    const cleanName = name.trim();
    let baseSlug = slugify(cleanName);
    if (!baseSlug) baseSlug = `cat-${Date.now()}`;

    // Check if category name already exists
    const [existing] = await pool.query('SELECT * FROM categories WHERE LOWER(name) = LOWER(?)', [cleanName]);
    if (existing.length > 0) {
      return res.status(200).json(existing[0]); // Return existing category cleanly
    }

    // Ensure unique slug
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const [slugMatches] = await pool.query('SELECT id FROM categories WHERE slug = ?', [slug]);
      if (slugMatches.length === 0) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const categoryIcon = icon && icon.trim() ? icon.trim() : '📚';
    const categoryDesc = description && description.trim() ? description.trim() : null;
    const order = order_index !== undefined ? parseInt(order_index, 10) : 0;

    const [result] = await pool.query(
      `INSERT INTO categories (name, slug, icon, description, order_index, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [cleanName, slug, categoryIcon, categoryDesc, order]
    );

    res.status(201).json({
      id: result.insertId,
      name: cleanName,
      slug,
      icon: categoryIcon,
      description: categoryDesc,
      order_index: order,
      lessons_count: 0,
    });
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ error: 'Failed to create category.' });
  }
});

// 3. Update Category (Admin Only)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id, 10);
    const { name, icon, description, order_index } = req.body;

    const [existing] = await pool.query('SELECT * FROM categories WHERE id = ?', [categoryId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    const current = existing[0];
    const newName = name && name.trim() ? name.trim() : current.name;
    const newIcon = icon !== undefined ? icon.trim() : current.icon;
    const newDesc = description !== undefined ? description : current.description;
    const newOrder = order_index !== undefined ? parseInt(order_index, 10) : current.order_index;

    let slug = current.slug;
    if (newName.toLowerCase() !== current.name.toLowerCase()) {
      slug = slugify(newName);
      // Ensure unique slug
      const [slugMatches] = await pool.query('SELECT id FROM categories WHERE slug = ? AND id != ?', [slug, categoryId]);
      if (slugMatches.length > 0) {
        slug = `${slug}-${categoryId}`;
      }
    }

    await pool.query(
      `UPDATE categories
       SET name = ?, slug = ?, icon = ?, description = ?, order_index = ?, updated_at = NOW()
       WHERE id = ?`,
      [newName, slug, newIcon, newDesc, newOrder, categoryId]
    );

    res.json({
      id: categoryId,
      name: newName,
      slug,
      icon: newIcon,
      description: newDesc,
      order_index: newOrder,
    });
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ error: 'Failed to update category.' });
  }
});

// 4. Delete Category (Admin Only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id, 10);

    // Unlink lessons before deleting
    await pool.query('UPDATE lessons SET category_id = NULL WHERE category_id = ?', [categoryId]);
    const [result] = await pool.query('DELETE FROM categories WHERE id = ?', [categoryId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    res.json({ success: true, message: 'Category deleted successfully.' });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ error: 'Failed to delete category.' });
  }
});

export default router;
