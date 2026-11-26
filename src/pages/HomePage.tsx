import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Lesson, CategoryProgress, ProgressSummary } from '../types/database';
import { formatLessonDisplayDate } from '../lib/dateUtils';
import { Sparkles, ArrowRight, Loader2, Award, Clock, BookOpen, Trophy } from 'lucide-react';
import CategoryPerformanceCard from '../components/home/CategoryPerformanceCard';
import PrivateTutorCard from '../components/home/PrivateTutorCard';

export default function HomePage() {
  const { currentUser, isAdmin, isLoading: isAuthLoading } = useAuth();

  // Admins strictly cannot view the student panel -> redirect to /admin
  if (!isAuthLoading && currentUser && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const [categoryProgressList, setCategoryProgressList] = useState<CategoryProgress[]>([]);
  const [progressSummary, setProgressSummary] = useState<ProgressSummary | null>(null);
  const [latestLesson, setLatestLesson] = useState<Lesson | null>(null);
  const [notesCount, setNotesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [progressRes, lessonsList] = await Promise.all([
          currentUser
            ? api.getCategoryProgress().catch(() => null)
            : null,
          api.getLessons({ status: 1 }).catch(() => []),
        ]);

        if (progressRes) {
          setProgressSummary(progressRes);
          setCategoryProgressList(progressRes.categories);
        } else {
          // Guest mode: fetch standard categories list
          const categoriesList = await api.getCategories().catch(() => []);
          const guestCategoryProgress: CategoryProgress[] = categoriesList.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            icon: c.icon || '📚',
            description: c.description || '',
            total_lessons: c.lessons_count || 0,
            completed_lessons: 0,
            in_progress_lessons: 0,
            total_possible_reads: (c.lessons_count || 0) * 4,
            completed_reads: 0,
            percentage: 0,
            revisions_due_count: 0,
          }));
          setCategoryProgressList(guestCategoryProgress);
        }

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-10">
      {/* 1. Latest Lesson Hero Card */}
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

              {latestLesson && (
                <span className="text-xs text-brand-200/80 font-medium font-mono">
                  {formatLessonDisplayDate(latestLesson)}
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

      {/* 2. Middle Section: Category Performance & Spaced Repetition Mastery */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-brand-600">
                Spaced Repetition
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-500">Track Mastery</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              Category Performance & Revisions
            </h2>
          </div>

          {/* Quick Metrics Strip for Logged-in Students */}
          {currentUser && progressSummary && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 border border-brand-100 text-xs font-bold text-brand-700">
                <Award className="w-3.5 h-3.5 text-brand-600" />
                <span>Overall Mastery: {progressSummary.overall_percentage}%</span>
              </div>

              {progressSummary.total_revisions_due > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-extrabold shadow-sm animate-pulse">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {progressSummary.total_revisions_due}{' '}
                    {progressSummary.total_revisions_due === 1 ? 'Revision Due' : 'Revisions Due'}
                  </span>
                </div>
              )}

              <Link
                to="/leaderboard"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 hover:bg-amber-100 transition"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>Class Leaderboard</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
            <span className="text-xs font-semibold">Loading category performance...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categoryProgressList.map((cat) => (
              <CategoryPerformanceCard
                key={cat.id}
                progress={cat}
                isLoggedIn={Boolean(currentUser)}
              />
            ))}

            {/* My Study Notes Card */}
            {currentUser && (
              <Link
                to="/notes"
                className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4 hover:border-amber-400 hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      📝
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                      {notesCount} {notesCount === 1 ? 'Note' : 'Notes'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-1">
                      My Study Notes
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      Personal vocabulary rules, phrases, shared notes, and saved revisions.
                    </p>
                  </div>

                  <div className="pt-2 flex items-center gap-2 text-xs font-medium text-slate-500">
                    <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                    <span>Active learning reference notes</span>
                  </div>
                </div>

                <div className="pt-3.5 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-600 group-hover:text-amber-700">
                  <span>Open Notes</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )}
          </div>
        )}
      </section>

      {/* 3. Bottom Section: 1-on-1 Private AI Tutor */}
      <section className="pt-2">
        <PrivateTutorCard />
      </section>
    </div>
  );
}
