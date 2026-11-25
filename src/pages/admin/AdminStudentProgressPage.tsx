import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AdminStudentProgressSummary, AdminStudentProgressDetail } from '../../types/database';
import { formatTimeAgo } from '../../lib/dateUtils';
import {
  TrendingUp,
  Search,
  Loader2,
  Award,
  BookOpen,
  FileText,
  MessageSquare,
  CheckCircle2,
  ChevronRight,
  X,
  Clock,
} from 'lucide-react';

export default function AdminStudentProgressPage() {
  const [students, setStudents] = useState<AdminStudentProgressSummary[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Student Detail State
  const [selectedDetail, setSelectedDetail] = useState<AdminStudentProgressDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [lessonFilter, setLessonFilter] = useState<'all' | 'completed' | 'in_progress' | 'not_started'>('all');

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.getAdminStudentsProgress();
        setStudents(data);
      } catch (err: any) {
        console.error('Failed to load student progress:', err);
        setError(err.message || 'Failed to load student progress.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleViewStudent = async (studentId: number) => {
    setIsDetailLoading(true);
    setLessonFilter('all');
    try {
      const detail = await api.getAdminStudentProgressDetail(studentId);
      setSelectedDetail(detail);
    } catch (err: any) {
      alert(err.message || 'Failed to load student progress details.');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email_address.toLowerCase().includes(search.toLowerCase())
  );

  const filteredDetailLessons = (selectedDetail?.lessons || []).filter((l) => {
    if (lessonFilter === 'completed') return l.is_fully_completed;
    if (lessonFilter === 'in_progress') return !l.is_fully_completed && l.current_stage > 0;
    if (lessonFilter === 'not_started') return l.current_stage === 0;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-600" />
            <span>Student Progress & Mastery</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor spaced repetition stages, category mastery, study notes, and discussion participation per student.
          </p>
        </div>

        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students..."
            className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-600 w-56"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Students Progress Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
            <span className="text-xs">Loading student progress...</span>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-600 text-xs font-semibold px-4">
            {error}
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">No students found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Student</th>
                  <th className="py-3.5 px-5">Overall Mastery</th>
                  <th className="py-3.5 px-5">Reads</th>
                  <th className="py-3.5 px-5">Lessons</th>
                  <th className="py-3.5 px-5">Notes & Comments</th>
                  <th className="py-3.5 px-5">Last Study</th>
                  <th className="py-3.5 px-5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => handleViewStudent(s.id)}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                  >
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-sm font-bold shrink-0">
                          {s.profile_icon && s.profile_icon !== 'user' ? s.profile_icon : s.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{s.name}</div>
                          <div className="text-[11px] text-slate-400">{s.email_address}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 min-w-[160px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              s.overall_percentage === 100
                                ? 'bg-emerald-500'
                                : s.overall_percentage > 0
                                ? 'bg-brand-600'
                                : 'bg-slate-200'
                            }`}
                            style={{ width: `${s.overall_percentage}%` }}
                          />
                        </div>
                        <span className="font-black font-mono text-slate-700 w-9 text-right">
                          {s.overall_percentage}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-slate-600 font-semibold">
                      {s.completed_reads} / {s.total_possible_reads}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          {s.completed_lessons} Mastered
                        </span>
                        {s.in_progress_lessons > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                            {s.in_progress_lessons} Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3 text-slate-500 font-medium">
                        <span className="inline-flex items-center gap-1" title="Study Notes">
                          <FileText className="w-3.5 h-3.5 text-amber-500" />
                          <span>{s.notes_count}</span>
                        </span>
                        <span className="inline-flex items-center gap-1" title="Classroom Comments">
                          <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{s.comments_count}</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-slate-400 font-mono text-[11px]">
                      {s.last_activity_at ? formatTimeAgo(s.last_activity_at) : 'Not started'}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewStudent(s.id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 font-bold text-[11px] transition cursor-pointer"
                      >
                        <span>View</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Loading overlay for modal */}
      {isDetailLoading && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center">
          <div className="bg-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold text-slate-700">
            <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
            <span>Loading student breakdown...</span>
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      {selectedDetail && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedDetail(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-600 text-white flex items-center justify-center text-lg font-bold shadow-xs">
                  {selectedDetail.student.profile_icon && selectedDetail.student.profile_icon !== 'user'
                    ? selectedDetail.student.profile_icon
                    : selectedDetail.student.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{selectedDetail.student.name}</h2>
                  <p className="text-xs text-slate-500">{selectedDetail.student.email_address}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Category Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-brand-600" />
                  <span>Category Performance</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedDetail.categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/40 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 truncate">
                          <span>{cat.icon}</span>
                          <span className="truncate">{cat.name}</span>
                        </span>
                        <span className="text-xs font-black font-mono text-brand-600">{cat.percentage}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            cat.percentage === 100 ? 'bg-emerald-500' : 'bg-brand-600'
                          }`}
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                        <span>{cat.completed_reads}/{cat.total_possible_reads} Reads</span>
                        <span>{cat.completed_lessons}/{cat.total_lessons} Mastered</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lesson-by-Lesson Breakdown */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-brand-600" />
                    <span>Lesson-by-Lesson Stage Progress</span>
                  </h3>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    {(
                      [
                        { key: 'all', label: 'All' },
                        { key: 'in_progress', label: 'In Progress' },
                        { key: 'completed', label: 'Completed' },
                        { key: 'not_started', label: 'Not Started' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setLessonFilter(tab.key)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          lessonFilter === tab.key
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-4">Lesson</th>
                        <th className="py-2.5 px-4">Stage</th>
                        <th className="py-2.5 px-4">Notes</th>
                        <th className="py-2.5 px-4">Comments</th>
                        <th className="py-2.5 px-4 text-right">Last Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDetailLessons.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            No lessons match this filter.
                          </td>
                        </tr>
                      ) : (
                        filteredDetailLessons.map((l) => (
                          <tr key={l.lesson_id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-4">
                              <div className="font-bold text-slate-800 line-clamp-1">{l.title}</div>
                              <div className="text-[10px] text-slate-400">
                                {l.category_icon} {l.category_name}
                              </div>
                            </td>
                            <td className="py-2.5 px-4">
                              {l.is_fully_completed ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Completed ({l.max_stages}/{l.max_stages})</span>
                                </span>
                              ) : l.current_stage > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3 h-3" />
                                  <span>{l.current_stage}/{l.max_stages}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-slate-100 text-slate-500">
                                  0/{l.max_stages}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-slate-600">{l.notes_count}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-600">{l.comments_count}</td>
                            <td className="py-2.5 px-4 text-right font-mono text-[10px] text-slate-400">
                              {l.updated_at ? formatTimeAgo(l.updated_at) : '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
