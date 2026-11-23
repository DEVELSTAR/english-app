import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Lesson } from '../types/database';
import { formatISTDate, formatLessonDisplayDate } from '../lib/dateUtils';
import LessonSidebar from '../components/sidebar/LessonSidebar';
import StudentActions from '../components/lessons/StudentActions';
import { ArrowLeft, ArrowRight, Calendar, BookOpen, Loader2 } from 'lucide-react';

export default function LessonDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [previousLesson, setPreviousLesson] = useState<Pick<Lesson, 'id' | 'title' | 'lesson_date'> | null>(null);
  const [nextLesson, setNextLesson] = useState<Pick<Lesson, 'id' | 'title' | 'lesson_date'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setIsLoading(true);
      try {
        const res = await api.getLessonDetail(id);
        setLesson(res.lesson);
        setPreviousLesson(res.previousLesson);
        setNextLesson(res.nextLesson);
      } finally {
        setIsLoading(false);
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    load();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center gap-2 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
        <span className="text-xs font-semibold">Loading lesson content...</span>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="max-w-2xl mx-auto my-16 p-8 bg-white border border-slate-200 rounded-3xl text-center space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Lesson Not Found</h1>
        <p className="text-xs text-slate-500">The lesson you are looking for may have been moved or unpublished.</p>
        <Link
          to="/lessons"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Classes</span>
        </Link>
      </div>
    );
  }

  const isTopic = lesson.lesson_type === 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Back Link & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to={lesson.category ? `/lessons?category=${lesson.category.slug}` : '/lessons'}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-brand-600 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {lesson.category ? lesson.category.name : 'Lessons'}</span>
        </Link>
      </div>

      {/* Main Content Layout: Article on Left, 3-in-1 Study Sidebar on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Lesson Article */}
        <article className="lg:col-span-7 bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/90 shadow-2xs space-y-6">
          {/* Header Metadata */}
          <div className="space-y-4 border-b border-slate-100 pb-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700">
                  <span>{lesson.category?.icon || '📚'}</span>
                  <span>{lesson.category?.name || 'Lesson'}</span>
                </span>

                <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatLessonDisplayDate(lesson)}</span>
                </span>
              </div>

              {/* Student Action Buttons */}
              <StudentActions
                lessonId={lesson.id}
                lessonTitle={lesson.title}
                lessonContent={lesson.content || ''}
              />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              {lesson.title}
            </h1>
          </div>

          {/* Lesson Body */}
          <div
            className="prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed
              prose-headings:text-slate-900 prose-headings:font-bold
              prose-blockquote:border-brand-500 prose-blockquote:bg-brand-50/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-xl
              prose-ul:list-disc prose-li:my-1"
            dangerouslySetInnerHTML={{ __html: lesson.content || '<p>No content provided.</p>' }}
          />

          {/* Bottom Prev / Next Nav */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-3">
            {previousLesson ? (
              <Link
                to={`/lessons/${previousLesson.id}`}
                className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-brand-600 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 block font-normal">Previous</span>
                  <span className="line-clamp-1">{previousLesson.title}</span>
                </div>
              </Link>
            ) : (
              <div />
            )}

            {nextLesson ? (
              <Link
                to={`/lessons/${nextLesson.id}`}
                className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-brand-600 transition"
              >
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-normal">Next</span>
                  <span className="line-clamp-1">{nextLesson.title}</span>
                </div>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <div />
            )}
          </div>
        </article>

        {/* Right Column: Permanently Open 3-in-1 Study Sidebar */}
        <div className="lg:col-span-5 sticky top-20">
          <LessonSidebar lesson={lesson} />
        </div>
      </div>
    </div>
  );
}
