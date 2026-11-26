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
  Zap,
} from 'lucide-react';

function getOrdinal(n: number) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  if (n % 10 === 1) return `${n}st`;
  if (n % 10 === 2) return `${n}nd`;
  if (n % 10 === 3) return `${n}rd`;
  return `${n}th`;
}

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
  const first = leaderboard[0] || null;
  const second = leaderboard[1] || null;
  const third = leaderboard[2] || null;

  const maxReadsInClass = Math.max(1, ...leaderboard.map((e) => e.completed_reads));

  const topNoteTaker = leaderboard.length
    ? [...leaderboard].sort((a, b) => b.notes_count - a.notes_count)[0]
    : null;
  const mostActiveDiscusser = leaderboard.length
    ? [...leaderboard].sort((a, b) => b.comments_count - a.comments_count)[0]
    : null;

  const renderAvatar = (entry: LeaderboardEntry, sizeClass = 'w-12 h-12 text-xl') => {
    const meta = getProfileIconMeta(entry.profile_icon);
    return (
      <div
        className={`${sizeClass} rounded-2xl flex items-center justify-center font-bold shadow-sm shrink-0 ${meta.color}`}
      >
        {meta.emoji}
      </div>
    );
  };

  const readsGapToFirst =
    currentUserEntry && first && currentUserEntry.rank > 1
      ? first.completed_reads - currentUserEntry.completed_reads
      : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      {/* 1. Hero Header & Personal Standing */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-brand-900 text-white p-6 sm:p-8 shadow-xl shadow-brand-900/15">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-300/30 text-amber-200 text-[11px] font-bold backdrop-blur-xs">
              <Trophy className="w-3.5 h-3.5 text-amber-300" />
              <span>Class Competition</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Class Leaderboard
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Track your position, compare spaced-repetition reads with classmates, and climb to the top.
            </p>
          </div>

          {currentUserEntry && (
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shrink-0">
              {renderAvatar(currentUserEntry, 'w-14 h-14 text-2xl ring-2 ring-amber-300/50')}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand-200">
                    Your Position
                  </span>
                  {currentUserRank === 1 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-900">
                      Leading!
                    </span>
                  ) : readsGapToFirst > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-amber-200">
                      {readsGapToFirst} {readsGapToFirst === 1 ? 'read' : 'reads'} behind #1
                    </span>
                  ) : null}
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white font-mono">
                    {currentUserRank ? getOrdinal(currentUserRank) : '—'}
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

        <div className="absolute -right-24 -bottom-24 w-80 h-80 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-44 -top-20 w-64 h-64 bg-brand-400/20 rounded-full blur-2xl pointer-events-none" />
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
          <span>Overall</span>
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
          {/* 3. Stepped Olympic Podium */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Top Performers
                </h2>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                Ranked by completed reads & mastery
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              {/* 2nd Place */}
              {second && (
                <div className="order-2 md:order-1 flex flex-col">
                  <div
                    className={`bg-white rounded-t-3xl rounded-b-2xl md:rounded-b-none p-5 border border-b-0 shadow-xs flex flex-col items-center text-center space-y-3 ${
                      second.is_current_user
                        ? 'border-brand-400 ring-2 ring-brand-100'
                        : 'border-slate-200/90'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-extrabold border border-slate-200">
                      <Medal className="w-3 h-3 text-slate-500" />
                      <span>2nd Place</span>
                    </span>

                    {renderAvatar(second, 'w-14 h-14 text-2xl')}

                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center justify-center gap-1.5">
                        <span>{second.name}</span>
                        {second.is_current_user && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-600 text-white">
                            You
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        {second.completed_lessons} Mastered
                      </p>
                    </div>

                    <div className="w-full pt-2 border-t border-slate-100 flex items-center justify-around text-xs">
                      <div>
                        <div className="font-black text-slate-800 font-mono text-base">
                          {second.overall_percentage}%
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold">Mastery</div>
                      </div>
                      <div className="h-6 w-px bg-slate-100" />
                      <div>
                        <div className="font-black text-brand-600 font-mono text-base">
                          {second.completed_reads}
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold">Reads</div>
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:flex h-10 rounded-b-3xl bg-gradient-to-b from-slate-200 to-slate-300 border border-t-0 border-slate-300 items-center justify-center font-black font-mono text-slate-600 text-sm">
                    #2
                  </div>
                </div>
              )}

              {/* 1st Place (Tallest Center Pedestal) */}
              {first && (
                <div className="order-1 md:order-2 flex flex-col">
                  <div
                    className={`bg-gradient-to-b from-amber-50 via-white to-white rounded-t-3xl rounded-b-2xl md:rounded-b-none p-6 border-2 border-b-0 shadow-lg flex flex-col items-center text-center space-y-3 ${
                      first.is_current_user
                        ? 'border-amber-400 ring-4 ring-amber-100'
                        : 'border-amber-300'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-white text-[11px] font-extrabold shadow-xs">
                      <Crown className="w-3.5 h-3.5" />
                      <span>1st Place</span>
                    </span>

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
                        {first.completed_lessons} Mastered
                      </p>
                    </div>

                    <div className="w-full pt-3 border-t border-amber-100 flex items-center justify-around text-xs">
                      <div>
                        <div className="font-black text-amber-600 font-mono text-lg">
                          {first.overall_percentage}%
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold">Mastery</div>
                      </div>
                      <div className="h-7 w-px bg-amber-100" />
                      <div>
                        <div className="font-black text-slate-900 font-mono text-lg">
                          {first.completed_reads}
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold">Reads</div>
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:flex h-16 rounded-b-3xl bg-gradient-to-b from-amber-300 to-amber-400 border-2 border-t-0 border-amber-400 items-center justify-center font-black font-mono text-amber-950 text-base shadow-md">
                    #1
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {third && (
                <div className="order-3 flex flex-col">
                  <div
                    className={`bg-white rounded-t-3xl rounded-b-2xl md:rounded-b-none p-5 border border-b-0 shadow-xs flex flex-col items-center text-center space-y-3 ${
                      third.is_current_user
                        ? 'border-brand-400 ring-2 ring-brand-100'
                        : 'border-orange-200/80'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[11px] font-extrabold border border-orange-200">
                      <Award className="w-3 h-3 text-orange-500" />
                      <span>3rd Place</span>
                    </span>

                    {renderAvatar(third, 'w-14 h-14 text-2xl')}

                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center justify-center gap-1.5">
                        <span>{third.name}</span>
                        {third.is_current_user && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-600 text-white">
                            You
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        {third.completed_lessons} Mastered
                      </p>
                    </div>

                    <div className="w-full pt-2 border-t border-slate-100 flex items-center justify-around text-xs">
                      <div>
                        <div className="font-black text-slate-800 font-mono text-base">
                          {third.overall_percentage}%
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold">Mastery</div>
                      </div>
                      <div className="h-6 w-px bg-slate-100" />
                      <div>
                        <div className="font-black text-brand-600 font-mono text-base">
                          {third.completed_reads}
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold">Reads</div>
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:flex h-7 rounded-b-3xl bg-gradient-to-b from-orange-200 to-orange-300 border border-t-0 border-orange-300 items-center justify-center font-black font-mono text-orange-900 text-xs">
                    #3
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 4. Class Highlights Strip */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {first && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Top Mastery
                  </div>
                  <div className="text-xs font-extrabold text-slate-900 truncate">
                    {first.name} • {first.overall_percentage}%
                  </div>
                </div>
              </div>
            )}

            {topNoteTaker && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Top Note-Taker
                  </div>
                  <div className="text-xs font-extrabold text-slate-900 truncate">
                    {topNoteTaker.name} • {topNoteTaker.notes_count} Notes
                  </div>
                </div>
              </div>
            )}

            {mostActiveDiscusser && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Most Active in Discussion
                  </div>
                  <div className="text-xs font-extrabold text-slate-900 truncate">
                    {mostActiveDiscusser.name} • {mostActiveDiscusser.comments_count} Comments
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 5. Competition Progress Chart */}
          <section className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-brand-600" />
                  <span>Competition Progress Chart</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visual comparison of completed spaced-repetition reads and mastery percentage.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-600">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>Total Possible: {leaderboard[0]?.total_possible_reads || 0} Reads</span>
              </div>
            </div>

            <div className="space-y-3">
              {leaderboard.map((entry) => {
                const relativeBarWidth =
                  entry.completed_reads > 0
                    ? Math.max(6, Math.round((entry.completed_reads / maxReadsInClass) * 100))
                    : 0;

                return (
                  <div
                    key={entry.id}
                    className={`p-3.5 rounded-2xl border transition ${
                      entry.is_current_user
                        ? 'bg-brand-50/60 border-brand-300 shadow-2xs'
                        : 'bg-slate-50/40 border-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-black font-mono shrink-0 ${
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
                        {renderAvatar(entry, 'w-8 h-8 text-sm')}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {entry.name}
                            </span>
                            {entry.is_current_user && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-600 text-white shrink-0">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {entry.completed_lessons} mastered • {entry.notes_count} notes • {entry.comments_count} comments
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-xs">
                        <span className="font-mono font-bold text-slate-700">
                          {entry.completed_reads}/{entry.total_possible_reads} Reads
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 font-mono font-black text-brand-600">
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

          {/* 6. Full Standings Cards */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-slate-900">All Rankings</h2>

            <div className="space-y-2.5">
              {leaderboard.map((entry) => (
                <div
                  key={entry.id}
                  className={`bg-white rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                    entry.is_current_user
                      ? 'border-brand-300 ring-2 ring-brand-100'
                      : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 text-center font-black font-mono text-sm text-slate-700 shrink-0">
                      {entry.rank === 1
                        ? '🥇'
                        : entry.rank === 2
                        ? '🥈'
                        : entry.rank === 3
                        ? '🥉'
                        : `#${entry.rank}`}
                    </div>
                    {renderAvatar(entry, 'w-10 h-10 text-lg')}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900 truncate">{entry.name}</span>
                        {entry.is_current_user && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-600 text-white">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {entry.last_activity_at ? `Active ${formatTimeAgo(entry.last_activity_at)}` : 'Not started yet'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs">
                    <div className="flex items-center gap-1.5 font-mono font-bold text-slate-700">
                      <BookCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{entry.completed_lessons}/{entry.total_lessons} Mastered</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500 font-medium">
                      <FileText className="w-3.5 h-3.5 text-amber-500" />
                      <span>{entry.notes_count}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500 font-medium">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{entry.comments_count}</span>
                    </div>
                    <div className="px-3 py-1 rounded-xl bg-brand-50 text-brand-700 font-mono font-black">
                      {entry.overall_percentage}% ({entry.completed_reads}/{entry.total_possible_reads})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
