import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lesson, LessonType, LessonStatus } from '../../types/database';
import { api } from '../../services/api';
import CategorySelect from './CategorySelect';
import { ArrowLeft, Save, Trash2, Eye, Code, Loader2 } from 'lucide-react';
import { getTodayISTDateString } from '../../lib/dateUtils';

interface LessonFormProps {
  initialLesson?: Partial<Lesson>;
  isEditing?: boolean;
}

export default function LessonForm({ initialLesson = {}, isEditing = false }: LessonFormProps) {
  const navigate = useNavigate();

  const [title, setTitle] = useState(initialLesson.title || '');
  const [lessonDate, setLessonDate] = useState(
    initialLesson.lesson_date ? String(initialLesson.lesson_date).split('T')[0] : getTodayISTDateString()
  );
  const [categoryId, setCategoryId] = useState<number | null>(
    initialLesson.category_id ?? null
  );
  const [status, setStatus] = useState<LessonStatus>(initialLesson.status ?? 1);
  const [content, setContent] = useState(initialLesson.content || '');

  const [previewMode, setPreviewMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !lessonDate) {
      setError('Title and Lesson Date are required.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const payload = {
      title: title.trim(),
      lesson_date: lessonDate,
      category_id: categoryId,
      status,
      content: content.trim(),
    };

    try {
      if (isEditing && initialLesson.id) {
        await api.updateLesson(initialLesson.id, payload);
        api.logActivity({
          action: 'update',
          resource_type: 'lesson',
          resource_id: initialLesson.id,
          resource_title: title,
          details: `Updated lesson: ${title}`,
        }).catch(() => {});
      } else {
        const created = await api.createLesson(payload);
        api.logActivity({
          action: 'create',
          resource_type: 'lesson',
          resource_id: created.id,
          resource_title: title,
          details: `Created new lesson: ${title}`,
        }).catch(() => {});
      }
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Failed to save lesson.');
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!initialLesson.id) return;
    if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) return;

    setIsLoading(true);
    try {
      await api.deleteLesson(initialLesson.id);
      api.logActivity({
        action: 'destroy',
        resource_type: 'lesson',
        resource_id: initialLesson.id,
        resource_title: title,
        details: `Deleted lesson: ${title}`,
      }).catch(() => {});
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Failed to delete lesson.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex items-center gap-2">
          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 text-white shadow-sm hover:bg-brand-700 transition cursor-pointer disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isEditing ? 'Save Changes' : 'Publish Lesson'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
          {error}
        </div>
      )}

      {/* Main Form Fields */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Lesson Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Everyday Hinglish to Fluent English"
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 font-semibold"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Date</label>
            <input
              type="date"
              required
              value={lessonDate}
              onChange={(e) => setLessonDate(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Category <span className="text-brand-600">*</span>
            </label>
            <CategorySelect
              value={categoryId}
              onChange={(newCatId) => setCategoryId(newCatId)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Publication Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(parseInt(e.target.value, 10) as LessonStatus)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-600"
            >
              <option value={1}>Published</option>
              <option value={0}>Draft</option>
              <option value={2}>Archived</option>
            </select>
          </div>
        </div>

        {/* Content Body with HTML Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700">
              Rich Lesson Content (HTML / Formatted Text)
            </label>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setPreviewMode(false)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
                  !previewMode ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                <Code className="w-3 h-3 inline mr-1" />
                <span>Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode(true)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
                  previewMode ? 'bg-white text-brand-600 shadow-2xs' : 'text-slate-500'
                }`}
              >
                <Eye className="w-3 h-3 inline mr-1" />
                <span>Preview</span>
              </button>
            </div>
          </div>

          {!previewMode ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write the lesson content here. Supports HTML (<h2>, <p>, <ul>, <blockquote>) or clean formatted text..."
              rows={14}
              className="w-full p-4 font-mono text-xs rounded-2xl border border-slate-200 focus:outline-none focus:border-brand-600 leading-relaxed"
            />
          ) : (
            <div className="min-h-[300px] p-6 bg-slate-50/50 rounded-2xl border border-slate-200 prose prose-slate max-w-none text-xs">
              <div dangerouslySetInnerHTML={{ __html: content || '<p class="text-slate-400">Empty content.</p>' }} />
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
