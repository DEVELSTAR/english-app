import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Lesson, Category, LessonCardProgress } from '../types/database';
import { formatISTDate, formatLessonDisplayDate } from '../lib/dateUtils';
import { BookOpen, Search, ArrowRight, Loader2, Calendar, Sparkles, CheckCircle2, Lock } from 'lucide-react';

export default function LessonsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentCategorySlug = searchParams.get('category') || 'all';

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [progressMap, setProgressMap] = useState<Record<number, LessonCardProgress>>({});
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [categoriesData, lessonsData, progressData] = await Promise.all([
          api.getCategories(),
          api.getLessons({ status: 1 }),
          api.getLessonsProgress().catch(() => ({})),
        ]);
        setCategories(categoriesData);
        setLessons(lessonsData);
        setProgressMap(progressData || {});
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
      {/* Sleek Search Bar */}
      <div className="relative w-full">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={activeCategory ? `Search in ${activeCategory.name}...` : 'Search lessons...'}
          className="w-full pl-10 pr-10 py-3 text-sm rounded-2xl bg-white border border-slate-200/90 shadow-2xs focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 transition placeholder:text-slate-400"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs absolute right-3.5 top-1/2 -translate-y-1/2 transition cursor-pointer"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
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
            const prog = progressMap[lesson.id];
            const requiresRevision = prog?.requires_revision ?? (lesson.requires_revision !== false);
            const maxStages = prog?.max_stages ?? (requiresRevision ? (lesson.revision_count || 4) : 1);
            const currentStage = prog?.current_stage ?? 0;
            const isCompleted = prog?.is_fully_completed ?? false;

            return (
              <Link
                key={lesson.id}
                to={`/lessons/${lesson.id}`}
                className={`bg-white p-6 rounded-3xl border transition flex flex-col justify-between group shadow-2xs ${
                  isCompleted
                    ? 'border-emerald-200/90 hover:border-emerald-400 hover:shadow-md'
                    : 'border-slate-200/90 hover:border-brand-500/60 hover:shadow-md'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 truncate max-w-[180px]">
                      <span>{catIcon}</span>
                      <span className="truncate">{catName}</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3" />
                      <span>{formatLessonDisplayDate(lesson)}</span>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition line-clamp-2">
                    {lesson.title}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                    Interactive spoken English lesson to practice speaking naturally and master fluency.
                  </p>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs font-bold">
                  <span className="inline-flex items-center gap-1.5 text-brand-600">
                    <span>{isCompleted ? 'Review Lesson' : 'Start Learning'}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                  </span>

                  {requiresRevision && isCompleted ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>{maxStages}/{maxStages}</span>
                    </span>
                  ) : requiresRevision ? (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono border ${
                        currentStage > 0
                          ? prog?.is_unlocked
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-brand-50 text-brand-700 border-brand-200'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}
                      title={
                        currentStage > 0 && !prog?.is_unlocked
                          ? 'Next read is currently locked'
                          : `${currentStage} of ${maxStages} reads completed`
                      }
                    >
                      {currentStage > 0 && !prog?.is_unlocked && (
                        <Lock className="w-2.5 h-2.5 text-brand-500" />
                      )}
                      <span>
                        {currentStage}/{maxStages}
                      </span>
                    </span>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
