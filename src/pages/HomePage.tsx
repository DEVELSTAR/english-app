import React, { useState, useEffect, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Lesson, Category } from '../types/database';
import { formatISTDate } from '../lib/dateUtils';
import {
  Sparkles,
  BookOpen,
  ArrowRight,
  Layers,
  FileText,
  Search,
  Loader2,
  Calendar,
} from 'lucide-react';

export default function HomePage() {
  const { currentUser, isAdmin, isLoading: isAuthLoading } = useAuth();

  // Admins strictly cannot view the student panel -> redirect to /admin
  if (!isAuthLoading && currentUser && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [notesCount, setNotesCount] = useState(0);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [allLessons, categoriesList] = await Promise.all([
          api.getLessons({ status: 1 }),
          api.getCategories(),
        ]);
        setLessons(allLessons);
        setCategories(categoriesList);

        if (currentUser) {
          try {
            const [notes] = await Promise.all([
              api.getNotes(),
            ]);
            setNotesCount(notes.length);
          } catch {
            // ignore
          }
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [currentUser]);

  const filteredList = useMemo(() => {
    let list = lessons;

    if (selectedCategorySlug !== 'all') {
      list = list.filter((l) => l.category?.slug === selectedCategorySlug);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          (l.category?.name && l.category.name.toLowerCase().includes(q))
      );
    }

    return list;
  }, [lessons, selectedCategorySlug, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      {/* Hero Welcome Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-brand-900 via-indigo-900 to-slate-900 text-white p-8 sm:p-12 shadow-xl shadow-brand-900/10">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-200 text-xs font-semibold backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Spoken English Fluency Accelerator</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            Speak Confident English,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-indigo-200">
              Without Hesitation.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Stop translating word-by-word from Hindi. Practice practical daily conversations with our AI Tutor & structured curriculum.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              to="/lessons"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/30 transition cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Explore All Lessons</span>
            </Link>
            <Link
              to="/lessons?category=grammar-foundations"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/20 backdrop-blur-xs transition"
            >
              <Layers className="w-4 h-4" />
              <span>Grammar Foundations</span>
            </Link>
          </div>
        </div>

        {/* Decorative background circles */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
      </section>

      {/* Metrics Row */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/lessons"
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1 hover:border-brand-300 transition group block"
        >
          <div className="flex items-center justify-between text-slate-400 group-hover:text-brand-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Lessons</span>
            <BookOpen className="w-4 h-4 text-brand-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{lessons.length}</div>
          <p className="text-[11px] text-slate-500">Spoken dialogues & guides</p>
        </Link>

        <Link
          to="/lessons"
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1 hover:border-indigo-300 transition group block"
        >
          <div className="flex items-center justify-between text-slate-400 group-hover:text-indigo-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">Categories</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{categories.length}</div>
          <p className="text-[11px] text-slate-500">Structured learning modules</p>
        </Link>

        <Link
          to="/notes"
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1 hover:border-amber-300 transition group block"
        >
          <div className="flex items-center justify-between text-slate-400 group-hover:text-amber-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">My Notes</span>
            <FileText className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{notesCount}</div>
          <p className="text-[11px] text-slate-500">Personal vocabulary rules</p>
        </Link>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">AI Tutor</span>
            <Sparkles className="w-4 h-4 text-brand-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">Online</div>
          <p className="text-[11px] text-slate-500">Ask Akib Sir 24/7</p>
        </div>
      </section>

      {/* Main Learning Hub Section */}
      <section className="space-y-6">
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Dynamic Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <button
              type="button"
              onClick={() => setSelectedCategorySlug('all')}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedCategorySlug === 'all'
                  ? 'bg-brand-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({lessons.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategorySlug(cat.slug)}
                className={`shrink-0 flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedCategorySlug === cat.slug
                    ? 'bg-brand-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{cat.icon || '📁'}</span>
                <span>{cat.name}</span>
                <span className="opacity-75 text-[10px]">({cat.lessons_count ?? 0})</span>
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search lessons or topics..."
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-600 transition"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Lessons Grid */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
            <span className="text-xs">Loading lessons...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center text-slate-500 border border-slate-200">
            <p className="font-bold text-sm">No lessons found.</p>
            <p className="text-xs text-slate-400 mt-1">Try another keyword or switch category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredList.map((lesson) => {
              const catName = lesson.category?.name || 'Lesson';
              const catIcon = lesson.category?.icon || '📚';

              return (
                <Link
                  key={lesson.id}
                  to={`/lessons/${lesson.id}`}
                  className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs hover:border-brand-500/60 hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 truncate max-w-[180px]">
                        <span>{catIcon}</span>
                        <span className="truncate">{catName}</span>
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 shrink-0">
                        <Calendar className="w-3 h-3" />
                        <span>{formatISTDate(lesson.lesson_date)}</span>
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-2">
                      {lesson.title}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                      Practical speaking practice to overcome hesitation and build fluent conversational speech.
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-brand-600">
                    <span>Start Practice</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
