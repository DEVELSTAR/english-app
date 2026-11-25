import React from 'react';
import { Link } from 'react-router-dom';
import { CategoryProgress } from '../../types/database';
import { ArrowRight, Clock, Award, BookCheck } from 'lucide-react';

interface CategoryPerformanceCardProps {
  progress: CategoryProgress;
  isLoggedIn: boolean;
}

export default function CategoryPerformanceCard({ progress, isLoggedIn }: CategoryPerformanceCardProps) {
  const percentage = progress.percentage || 0;
  const hasDueRevisions = progress.revisions_due_count > 0;

  return (
    <Link
      to={`/lessons?category=${progress.slug}`}
      className={`relative bg-white p-5 rounded-3xl border transition-all group flex flex-col justify-between ${
        hasDueRevisions
          ? 'border-amber-300 ring-2 ring-amber-100 shadow-md hover:border-amber-400'
          : 'border-slate-200/90 shadow-2xs hover:border-brand-500 hover:shadow-md'
      }`}
    >
      <div className="space-y-4">
        {/* Top Header: Icon + Lessons count & Revisions Due badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            {progress.icon || '📚'}
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
              {progress.total_lessons} {progress.total_lessons === 1 ? 'Lesson' : 'Lessons'}
            </span>

            {isLoggedIn && hasDueRevisions && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white shadow-xs animate-bounce">
                <Clock className="w-3 h-3" />
                <span>
                  {progress.revisions_due_count} {progress.revisions_due_count === 1 ? 'Revision Due' : 'Revisions Due'}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1">
            {progress.name}
          </h3>
          <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
            {progress.description || 'Interactive speaking lessons and practice material.'}
          </p>
        </div>

        {/* Category Performance Progress Bar (only when category has lessons with stages enabled) */}
        {isLoggedIn && progress.total_possible_reads > 0 ? (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-brand-600" />
                <span>Mastery Progress</span>
              </span>
              <span className={`font-black font-mono ${percentage === 100 ? 'text-emerald-600' : 'text-brand-600'}`}>
                {percentage}%
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  percentage === 100
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    : percentage > 0
                    ? 'bg-gradient-to-r from-brand-500 to-indigo-600'
                    : 'bg-slate-200'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <BookCheck className="w-3 h-3 text-slate-400" />
                <span>{progress.completed_reads} / {progress.total_possible_reads} Reads</span>
              </span>
              <span>
                {progress.completed_lessons} Mastered
              </span>
            </div>
          </div>
        ) : !isLoggedIn ? (
          <div className="text-[11px] text-slate-400 pt-1">
            Sign in to track reads & revision progress
          </div>
        ) : null}
      </div>

      {/* Footer link */}
      <div className="pt-3.5 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-brand-600 group-hover:text-brand-700">
        <span>{hasDueRevisions ? 'Revise Now' : 'Explore & Practice'}</span>
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}
