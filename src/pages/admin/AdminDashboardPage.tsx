import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Lesson } from '../../types/database';
import { formatISTDate } from '../../lib/dateUtils';
import {
  BookOpen,
  Layers,
  Users,
  Shield,
  Plus,
  Search,
  FolderTree,
  Edit2,
  Trash2,
  Loader2,
  Calendar,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [categoriesCount, setCategoriesCount] = useState(0);
  const [studentsCount, setStudentsCount] = useState(0);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [lessonList, studentList, catList] = await Promise.all([
        api.getLessons(),
        api.getStudents().catch(() => []),
        api.getCategories().catch(() => []),
      ]);
      setLessons(lessonList);
      setStudentsCount(studentList.length);
      setCategoriesCount(catList.length);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (lesson: Lesson) => {
    if (!confirm(`Are you sure you want to permanently delete "${lesson.title}"?`)) return;
    try {
      await api.deleteLesson(lesson.id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete lesson');
    }
  };

  const filtered = lessons.filter(
    (l) =>
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      (l.topic && l.topic.toLowerCase().includes(search.toLowerCase())) ||
      (l.category?.name && l.category.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Lessons</span>
            <BookOpen className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{lessons.length}</div>
        </div>

        <Link
          to="/admin/categories"
          className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-1 hover:border-indigo-300 transition block group"
        >
          <div className="flex items-center justify-between text-slate-400 group-hover:text-indigo-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Categories</span>
            <FolderTree className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{categoriesCount}</div>
        </Link>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Students</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{studentsCount}</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Database</span>
            <Shield className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">MySQL</div>
        </div>
      </div>

      {/* Lessons Table Section */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">All Curriculum Lessons & Topics</h2>
            <p className="text-xs text-slate-500">Manage published daily classes and foundational grammar series.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-600 w-48"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            <Link
              to="/admin/lessons/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Lesson</span>
            </Link>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
            <span className="text-xs">Loading curriculum...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">No lessons found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Title</th>
                  <th className="py-3.5 px-5">Date</th>
                  <th className="py-3.5 px-5">Category</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((lesson) => (
                  <tr key={lesson.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-5">
                      <span className="font-bold text-slate-900 block">{lesson.title}</span>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-slate-500 text-xs">
                      {formatISTDate(lesson.lesson_date)}
                    </td>
                    <td className="py-3.5 px-5">
                      {lesson.category ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          <span>{lesson.category.icon || '📁'}</span>
                          <span>{lesson.category.name}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                          Uncategorized
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          lesson.status === 1
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {lesson.status === 1 ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right space-x-1">
                      <Link
                        to={`/admin/lessons/${lesson.id}/edit`}
                        className="inline-flex p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-slate-100"
                        title="Edit Lesson"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(lesson)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                        title="Delete Lesson"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
