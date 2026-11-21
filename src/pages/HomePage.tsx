import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Category } from '../types/database';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';

export default function HomePage() {
  const { currentUser, isAdmin, isLoading: isAuthLoading } = useAuth();

  // Admins strictly cannot view the student panel -> redirect to /admin
  if (!isAuthLoading && currentUser && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const [categories, setCategories] = useState<Category[]>([]);
  const [notesCount, setNotesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [categoriesList] = await Promise.all([
          api.getCategories(),
        ]);
        setCategories(categoriesList);

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
        </div>

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
