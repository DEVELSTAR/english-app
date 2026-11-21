import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Lesson, Category } from '../types/database';
import { formatISTDate } from '../lib/dateUtils';
import { BookOpen, Search, ArrowRight, Loader2, Calendar, Sparkles } from 'lucide-react';

export default function LessonsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentCategorySlug = searchParams.get('category') || 'all';

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [categoriesData, lessonsData] = await Promise.all([
          api.getCategories(),
          api.getLessons({ status: 1 }),
        ]);
        setCategories(categoriesData);
        setLessons(lessonsData);
      } catch (err) {
        console.error('Failed to load lessons or categories:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const activeCategory = useMemo(() => {
    if (currentCategorySlug === 'all') return null;
    return categories.find((c) => c.slug === currentCategorySlug) || null;
  }, [categories, currentCategorySlug]);

  const handleSelectCategory = (slug: string) => {
    if (slug === 'all') {
      searchParams.delete('category');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ category: slug });
    }
  };

  const filtered = useMemo(() => {
    let list = lessons;

    // Filter by category
    if (activeCategory) {
      list = list.filter(
        (l) => l.category_id === activeCategory.id || l.category?.slug === activeCategory.slug
      );
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          (l.category?.name && l.category.name.toLowerCase().includes(q))
      );
    }

    return list;
  }, [lessons, activeCategory, search]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Page Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
            {activeCategory ? (
              <>
                <span className="text-2xl">{activeCategory.icon || '📚'}</span>
                <span>{activeCategory.name}</span>
              </>
            ) : (
              <>
                <BookOpen className="w-7 h-7 text-brand-600" />
                <span>Explore Lessons & Curriculum</span>
              </>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
            {activeCategory?.description ||
              'Practical daily spoken English, grammar rules, vocabulary drills, and conversational dialogues.'}
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search in lessons..."
            className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Dynamic Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {/* All Pill */}
        <button
          type="button"
          onClick={() => handleSelectCategory('all')}
          className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            currentCategorySlug === 'all'
              ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/25 ring-2 ring-brand-600/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/90'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>All Content</span>
          <span
            className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
              currentCategorySlug === 'all'
                ? 'bg-brand-700/60 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {lessons.length}
          </span>
        </button>

        {/* Dynamic Category Pills */}
        {categories.map((cat) => {
          const isActive = currentCategorySlug === cat.slug;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleSelectCategory(cat.slug)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/25 ring-2 ring-brand-600/20'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/90'
              }`}
            >
              <span>{cat.icon || '📁'}</span>
              <span>{cat.name}</span>
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                  isActive
                    ? 'bg-brand-700/60 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {cat.lessons_count ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid of lessons */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
          <span className="text-xs font-semibold">Loading lessons...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-500 border border-slate-200">
          <p className="font-bold text-sm">No lessons found.</p>
          <p className="text-xs text-slate-400 mt-1">
            {search ? 'Try another search keyword.' : 'No lessons have been published in this category yet.'}
          </p>
          {(search || currentCategorySlug !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                handleSelectCategory('all');
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((lesson) => {
            const catName = lesson.category?.name || 'Lesson';
            const catIcon = lesson.category?.icon || '📚';

            return (
              <Link
                key={lesson.id}
                to={`/lessons/${lesson.id}`}
                className="bg-white p-6 rounded-3xl border border-slate-200/90 hover:border-brand-500/60 hover:shadow-md transition flex flex-col justify-between group shadow-2xs"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 truncate max-w-[180px]">
                      <span>{catIcon}</span>
                      <span className="truncate">{catName}</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3" />
                      <span>{formatISTDate(lesson.lesson_date)}</span>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition line-clamp-2">
                    {lesson.title}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                    Interactive spoken English lesson to practice speaking naturally and master fluency.
                  </p>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-brand-600">
                  <span>Start Learning</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
