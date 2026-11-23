import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Category, Lesson } from '../types/database';
import { formatISTDate } from '../lib/dateUtils';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';

export default function HomePage() {
  const { currentUser, isAdmin, isLoading: isAuthLoading } = useAuth();

  // Admins strictly cannot view the student panel -> redirect to /admin
  if (!isAuthLoading && currentUser && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const [categories, setCategories] = useState<Category[]>([]);
  const [latestLesson, setLatestLesson] = useState<Lesson | null>(null);
  const [notesCount, setNotesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [categoriesList, lessonsList] = await Promise.all([
          api.getCategories(),
          api.getLessons({ status: 1 }),
        ]);
        setCategories(categoriesList);
        if (lessonsList && lessonsList.length > 0) {
          setLatestLesson(lessonsList[0]);
        }

        if (currentUser) {
          try {
            const notes = await api.getNotes();
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      {/* Latest Lesson Hero Card */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-brand-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-10 shadow-xl shadow-brand-900/10">
        {latestLesson ? (
          <div className="relative z-10 max-w-3xl space-y-3 sm:space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/30 border border-brand-400/40 text-brand-200 text-xs font-bold backdrop-blur-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Latest Class</span>
              </span>
              {latestLesson.category && (
                <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-slate-200 text-xs font-semibold backdrop-blur-xs">
                  {latestLesson.category.icon || '📚'} {latestLesson.category.name}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight text-white">
              {latestLesson.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl line-clamp-2">
              {latestLesson.topic || 'Jump into today’s spoken English practice, master sentence patterns, and practice with Akib Sir.'}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                to={`/lessons/${latestLesson.id}`}
                className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl bg-white text-brand-900 font-extrabold text-xs sm:text-sm shadow-xl shadow-black/20 hover:bg-brand-50 hover:scale-[1.02] active:scale-95 transition-all group cursor-pointer"
              >
                <span>Start Learning Now</span>
                <ArrowRight className="w-4 h-4 text-brand-600 group-hover:translate-x-1 transition-transform" />
              </Link>

              {latestLesson.lesson_date && (
                <span className="text-xs text-brand-200/80 font-medium font-mono">
                  {formatISTDate(latestLesson.lesson_date)}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-200 text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              <span>FluentEdge English Academy</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Welcome to Your Learning Space
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Explore the structured categories below to build daily fluency, master vocabulary, and practice conversations.
            </p>
          </div>
        )}

        {/* Decorative background circles */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
      </section>

      {/* Dynamic Category Cards Row */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
          <span className="text-xs font-semibold">Loading categories...</span>
        </div>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/lessons?category=${cat.slug}`}
              className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3 hover:border-brand-500 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    {cat.icon || '📚'}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 group-hover:bg-brand-100 group-hover:text-brand-800 transition-colors">
                    {cat.lessons_count ?? 0} {cat.lessons_count === 1 ? 'Lesson' : 'Lessons'}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                    {cat.description || 'Interactive speaking lessons and practice material.'}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-brand-600">
                <span>Explore Category</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}

          {/* My Study Notes Card */}
          {currentUser && (
            <Link
              to="/notes"
              className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3 hover:border-amber-400 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    📝
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                    {notesCount} {notesCount === 1 ? 'Note' : 'Notes'}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-1">
                    My Study Notes
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                    Personal vocabulary rules, phrases, and saved revisions.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-600">
                <span>Open Notes</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
