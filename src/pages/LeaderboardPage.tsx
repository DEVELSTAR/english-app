import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { LeaderboardEntry, Category } from '../types/database';
import { getProfileIconMeta } from '../lib/profileIcons';
import { formatTimeAgo } from '../lib/dateUtils';
import {
  Trophy,
  Crown,
  Medal,
  Award,
  BarChart3,
  BookCheck,
  FileText,
  MessageSquare,
  Loader2,
  Sparkles,
  Flame,
} from 'lucide-react';

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [categories, setCategories] = useState<Pick<Category, 'id' | 'name' | 'slug' | 'icon'>[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [totalStudents, setTotalStudents] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await api.getLeaderboard(selectedCategoryId);
        setLeaderboard(res.leaderboard);
        setCategories(res.categories);
        setCurrentUserRank(res.current_user_rank);
        setTotalStudents(res.total_students);
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [selectedCategoryId]);

  const currentUserEntry = leaderboard.find((e) => e.is_current_user) || null;
  const topThree = leaderboard.slice(0, 3);
  const first = topThree[0];
  const second = topThree[1];
  const third = topThree[2];

  const maxReadsInClass = Math.max(1, ...leaderboard.map((e) => e.completed_reads));

  const renderAvatar = (entry: LeaderboardEntry, sizeClass = 'w-12 h-12 text-xl') => {
    const meta = getProfileIconMeta(entry.profile_icon);
    return (
      <div className={`${sizeClass} rounded-2xl flex items-center justify-center font-bold shadow-xs shrink-0 ${meta.color}`}>
        {meta.emoji}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      {/* 1. Hero Header & Personal Rank Card */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-slate-900 via-brand-900 to-indigo-900 text-white p-6 sm:p-9 shadow-xl shadow-brand-900/10">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-200 text-xs font-bold backdrop-blur-xs">
              <Trophy className="w-3.5 h-3.5 text-amber-300" />
              <span>Class Competition</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              Student Leaderboard & Progress
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              See how you and your classmates are progressing through spaced repetition reads, compare mastery scores, and stay motivated every day.
            </p>
          </div>

          {/* Your Current Standing Card */}
          {currentUserEntry && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shrink-0">
              {renderAvatar(currentUserEntry, 'w-12 h-12 text-2xl')}
              <div className="space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-brand-200">
                  Your Standing
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white font-mono">
                    #{currentUserRank}
                  </span>
                  <span className="text-xs text-slate-300">of {totalStudents} students</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold text-amber-200">
                  <span>{currentUserEntry.overall_percentage}% Mastery</span>
                  <span>•</span>
                  <span>{currentUserEntry.completed_reads} Reads</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="absolute -right-20 -bottom-24 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -top-16 w-64 h-64 bg-brand-400/20 rounded-full blur-2xl pointer-events-none" />
      </section>

      {/* 2. Category Filter Pills */}
      <section className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedCategoryId(undefined)}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
            selectedCategoryId === undefined
              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:border-brand-400 hover:text-brand-600'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Overall Rankings</span>
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategoryId(cat.id)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
              selectedCategoryId === cat.id
                ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-brand-400 hover:text-brand-600'
            }`}
          >
            <span>{cat.icon || '📚'}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </section>

      {isLoading ? (
        <div className="py-20 text-center text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
          <span className="text-xs font-semibold">Loading leaderboard...</span>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-500 border border-slate-200 text-xs">
          No student progress recorded yet.
        </div>
      ) : (
        <>
          {/* 3. Top 3 Podium */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Top Performers Podium
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              {/* 2nd Place (Left on desktop) */}
              {second && (
                <div
                  className={`order-2 md:order-1 bg-white rounded-3xl p-6 border shadow-sm flex flex-col items-center text-center space-y-3 transition ${
                    second.is_current_user ? 'border-brand-400 ring-2 ring-brand-100' : 'border-slate-200/90'
                  }`}
                >
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-extrabold border border-slate-200">
                    <Medal className="w-3.5 h-3.5 text-slate-500" />
                    <span>2nd Place</span>
                  </div>

                  {renderAvatar(second, 'w-14 h-14 text-2xl')}

                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center justify-center gap-1.5">
                      <span>{second.name}</span>
                      {second.is_current_user && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-100 text-brand-700">
                          You
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {second.completed_lessons} {second.completed_lessons === 1 ? 'Lesson' : 'Lessons'} Mastered
                    </p>
                  </div>

                  <div className="w-full pt-2 border-t border-slate-100 flex items-center justify-around text-xs">
                    <div>
                      <div className="font-black text-slate-800 font-mono text-base">{second.overall_percentage}%</div>
                      <div className="text-[10px] text-slate-400 font-semibold">Mastery</div>
                    </div>
                    <div className="h-6 w-px bg-slate-100" />
                    <div>
                      <div className="font-black text-brand-600 font-mono text-base">{second.completed_reads}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">Reads</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 1st Place (Center elevated) */}
              {first && (
                <div
                  className={`order-1 md:order-2 bg-gradient-to-b from-amber-50/90 via-white to-white rounded-3xl p-7 border-2 shadow-lg flex flex-col items-center text-center space-y-3.5 md:-translate-y-2 transition ${
                    first.is_current_user
                      ? 'border-amber-400 ring-4 ring-amber-100'
                      : 'border-amber-300'
                  }`}
                >
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500 text-white text-xs font-extrabold shadow-sm">
                    <Crown className="w-3.5 h-3.5" />
                    <span>1st Place Champion</span>
                  </div>

                  {renderAvatar(first, 'w-16 h-16 text-3xl ring-4 ring-amber-200')}

                  <div>
                    <h3 className="text-lg font-black text-slate-900 flex items-center justify-center gap-1.5">
                      <span>{first.name}</span>
                      {first.is_current_user && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-600 text-white">
                          You
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-amber-700/80 font-semibold mt-0.5">
                      {first.completed_lessons} {first.completed_lessons === 1 ? 'Lesson' : 'Lessons'} Mastered
                    </p>
                  </div>

                  <div className="w-full pt-3 border-t border-amber-100 flex items-center justify-around text-xs">
                    <div>
                      <div className="font-black text-amber-600 font-mono text-lg">{first.overall_percentage}%</div>
                      <div className="text-[10px] text-slate-500 font-semibold">Mastery</div>
                    </div>
                    <div className="h-7 w-px bg-amber-100" />
                    <div>
                      <div className="font-black text-slate-900 font-mono text-lg">{first.completed_reads}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">Reads</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3rd Place (Right on desktop) */}
              {third && (
                <div
                  className={`order-3 bg-white rounded-3xl p-6 border shadow-sm flex flex-col items-center text-center space-y-3 transition ${
                    third.is_current_user ? 'border-brand-400 ring-2 ring-brand-100' : 'border-orange-200/80'
                  }`}
                >
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-extrabold border border-orange-200">
                    <Award className="w-3.5 h-3.5 text-orange-500" />
                    <span>3rd Place</span>
                  </div>

                  {renderAvatar(third, 'w-14 h-14 text-2xl')}

                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center justify-center gap-1.5">
                      <span>{third.name}</span>
                      {third.is_current_user && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-100 text-brand-700">
                          You
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {third.completed_lessons} {third.completed_lessons === 1 ? 'Lesson' : 'Lessons'} Mastered
                    </p>
                  </div>

                  <div className="w-full pt-2 border-t border-slate-100 flex items-center justify-around text-xs">
                    <div>
                      <div className="font-black text-slate-800 font-mono text-base">{third.overall_percentage}%</div>
                      <div className="text-[10px] text-slate-400 font-semibold">Mastery</div>
                    </div>
                    <div className="h-6 w-px bg-slate-100" />
                    <div>
                      <div className="font-black text-brand-600 font-mono text-base">{third.completed_reads}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">Reads</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 4. Competition Progress Chart */}
          <section className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-brand-600" />
                  <span>Competition Progress Chart</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Side-by-side comparison of completed spaced repetition reads across the class.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-600">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>Total Possible: {leaderboard[0]?.total_possible_reads || 0} Reads</span>
              </div>
            </div>

            <div className="space-y-3.5">
              {leaderboard.map((entry) => {
                const relativeBarWidth =
                  entry.completed_reads > 0
                    ? Math.max(6, Math.round((entry.completed_reads / maxReadsInClass) * 100))
                    : 0;

                return (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-2xl border transition ${
                      entry.is_current_user
                        ? 'bg-brand-50/50 border-brand-200'
                        : 'bg-slate-50/40 border-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black font-mono shrink-0 ${
                            entry.rank === 1
                              ? 'bg-amber-500 text-white'
                              : entry.rank === 2
                              ? 'bg-slate-400 text-white'
                              : entry.rank === 3
                              ? 'bg-orange-400 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {entry.rank}
                        </span>
                        {renderAvatar(entry, 'w-7 h-7 text-sm')}
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {entry.name}
                        </span>
                        {entry.is_current_user && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-600 text-white shrink-0">
                            You
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-xs">
                        <span className="font-mono font-bold text-slate-700">
                          {entry.completed_reads} / {entry.total_possible_reads} Reads
                        </span>
                        <span className="font-mono font-black text-brand-600 w-10 text-right">
                          {entry.overall_percentage}%
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-3 bg-slate-200/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          entry.rank === 1
                            ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                            : entry.is_current_user
                            ? 'bg-gradient-to-r from-brand-500 to-indigo-600'
                            : 'bg-gradient-to-r from-indigo-400 to-brand-500'
                        }`}
                        style={{ width: `${relativeBarWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 5. Full Class Standings Table */}
          <section className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-base sm:text-lg font-black text-slate-900">Full Class Standings</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete breakdown of mastery, reads, notes, and classroom discussions.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-5">Rank</th>
                    <th className="py-3.5 px-5">Student</th>
                    <th className="py-3.5 px-5">Mastery</th>
                    <th className="py-3.5 px-5">Reads</th>
                    <th className="py-3.5 px-5">Mastered Lessons</th>
                    <th className="py-3.5 px-5">Notes & Comments</th>
                    <th className="py-3.5 px-5 text-right">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaderboard.map((entry) => (
                    <tr
                      key={entry.id}
                      className={entry.is_current_user ? 'bg-brand-50/40' : 'hover:bg-slate-50/60'}
                    >
                      <td className="py-3.5 px-5 font-black font-mono text-slate-700">
                        {entry.rank === 1
                          ? '🥇 1'
                          : entry.rank === 2
                          ? '🥈 2'
                          : entry.rank === 3
                          ? '🥉 3'
                          : `#${entry.rank}`}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          {renderAvatar(entry, 'w-8 h-8 text-base')}
                          <span className="font-bold text-slate-900">{entry.name}</span>
                          {entry.is_current_user && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-600 text-white">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                entry.overall_percentage === 100
                                  ? 'bg-emerald-500'
                                  : 'bg-brand-600'
                              }`}
                              style={{ width: `${entry.overall_percentage}%` }}
                            />
                          </div>
                          <span className="font-mono font-black text-slate-700 w-9 text-right">
                            {entry.overall_percentage}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 font-mono font-semibold text-slate-600">
                        {entry.completed_reads} / {entry.total_possible_reads}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          <BookCheck className="w-3 h-3" />
                          <span>{entry.completed_lessons} / {entry.total_lessons}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3 text-slate-500 font-medium">
                          <span className="inline-flex items-center gap-1" title="Study Notes">
                            <FileText className="w-3.5 h-3.5 text-amber-500" />
                            <span>{entry.notes_count}</span>
                          </span>
                          <span className="inline-flex items-center gap-1" title="Classroom Comments">
                            <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{entry.comments_count}</span>
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono text-[11px] text-slate-400">
                        {entry.last_activity_at ? formatTimeAgo(entry.last_activity_at) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
