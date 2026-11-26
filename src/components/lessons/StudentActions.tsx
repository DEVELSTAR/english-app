import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { speakText, stopSpeaking } from '../../lib/voice';
import { LessonRevisionStatus } from '../../types/database';
import {
  CheckCircle2,
  Lock,
  Volume2,
  VolumeX,
  Loader2,
  Sparkles,
  AlertCircle,
  BookOpen,
  MessageSquare,
  FileText,
} from 'lucide-react';

interface StudentActionsProps {
  lessonId: number;
  lessonContent?: string;
  lessonTitle?: string;
}

function getOrdinalStage(n: number) {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

function formatRemainingTime(targetDateStr?: string | null): string {
  if (!targetDateStr) return '';
  const target = new Date(targetDateStr).getTime();
  const now = Date.now();
  const diffMs = target - now;
  if (diffMs <= 0) return 'Ready';

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours >= 24) {
    const days = Math.floor(diffHours / 24);
    const remHours = diffHours % 24;
    return `${days}d ${remHours}h`;
  }
  if (diffHours > 0) {
    return `${diffHours}h ${diffMins}m`;
  }
  return `${Math.max(1, diffMins)}m`;
}

export default function StudentActions({ lessonId, lessonContent, lessonTitle }: StudentActionsProps) {
  const [revisionStatus, setRevisionStatus] = useState<LessonRevisionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [showRequirementAlert, setShowRequirementAlert] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      const res = await api.getLessonRevisionStatus(lessonId);
      setRevisionStatus(res);
    } catch {
      // Guest or offline
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadStatus();
  }, [lessonId]);

  const handlePlayAudio = () => {
    if (isAudioPlaying) {
      stopSpeaking();
      setIsAudioPlaying(false);
    } else {
      const textToRead = `${lessonTitle || ''}. ${lessonContent || ''}`;
      setIsAudioPlaying(true);
      speakText(textToRead, () => {
        setIsAudioPlaying(false);
      });
    }
  };

  const handleCompleteStage = async () => {
    if (!revisionStatus) {
      alert('Please sign in to track your learning progress.');
      return;
    }

    // Check 1st Read requirements (only when spaced repetition is enabled)
    if (revisionStatus.requires_revision && revisionStatus.current_stage === 0) {
      if (!revisionStatus.requirements?.can_complete_first_read) {
        setShowRequirementAlert(true);
        return;
      }
    }

    setIsSubmitting(true);
    setActionMessage(null);
    try {
      const res = await api.completeLessonStage(lessonId);
      setActionMessage(res.message);
      setShowRequirementAlert(false);
      await loadStatus();
      setTimeout(() => setActionMessage(null), 6000);
    } catch (err: any) {
      if (err.message && err.message.includes('1st Read')) {
        setShowRequirementAlert(true);
      } else {
        alert(err.message || 'Failed to complete stage.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />
        <span>Loading progress...</span>
      </div>
    );
  }

  const requiresRevision = revisionStatus?.requires_revision ?? true;
  const currentStage = revisionStatus?.current_stage ?? 0;
  const maxStages = revisionStatus?.max_stages ?? 4;
  const isFullyCompleted = revisionStatus?.is_fully_completed ?? false;
  const isUnlocked = revisionStatus?.is_unlocked ?? true;
  const nextUnlockAt = revisionStatus?.next_unlock_at;
  const nextStageNum = currentStage + 1;
  const nextStageOrdinal = getOrdinalStage(nextStageNum);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Audio Pronunciation / Listen */}
        <button
          type="button"
          onClick={handlePlayAudio}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
            isAudioPlaying
              ? 'bg-brand-600 text-white border-brand-600 shadow-sm animate-pulse'
              : 'bg-white text-slate-700 border-slate-200 hover:border-brand-500 hover:text-brand-600 shadow-2xs'
          }`}
        >
          {isAudioPlaying ? (
            <>
              <VolumeX className="w-3.5 h-3.5" />
              <span>Stop Audio</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-brand-600" />
              <span>Listen to Lesson</span>
            </>
          )}
        </button>

        {/* Dynamic Spaced Repetition Read Button (only shown when stages are enabled) */}
        {requiresRevision && (
          isFullyCompleted || currentStage >= maxStages ? (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-sm shadow-emerald-600/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-100" />
              <span>✅ 100% Mastered</span>
              <span className="text-[10px] bg-emerald-700/60 px-1.5 py-0.5 rounded-md font-mono ml-1">
                {maxStages}/{maxStages} Reads
              </span>
            </div>
          ) : !isUnlocked && nextUnlockAt ? (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed shadow-2xs"
              title={`Locked until ${new Date(nextUnlockAt).toLocaleString('en-IN')}`}
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {nextStageOrdinal} Read (Unlocks in {formatRemainingTime(nextUnlockAt)})
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCompleteStage}
              disabled={isSubmitting}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm ${
                currentStage === 0
                  ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 animate-pulse'
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <BookOpen className="w-3.5 h-3.5" />
              )}
              <span>
                {currentStage === 0 ? 'Complete 1st Read' : `Complete ${nextStageOrdinal} Read`}
              </span>
              <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded-md font-mono">
                Stage {currentStage}/{maxStages}
              </span>
            </button>
          )
        )}

        {/* Read Stage Progress Dots */}
        {maxStages > 1 && (
          <div className="hidden sm:flex items-center gap-1 pl-2">
            {Array.from({ length: maxStages }).map((_, idx) => {
              const isDone = idx < currentStage;
              const isCurrent = idx === currentStage && isUnlocked;
              const isLocked = idx === currentStage && !isUnlocked;
              return (
                <div
                  key={idx}
                  title={`${getOrdinalStage(idx + 1)} Read: ${
                    isDone ? 'Completed' : isLocked ? 'Locked' : isCurrent ? 'Ready now' : 'Upcoming'
                  }`}
                  className={`w-2 h-2 rounded-full transition-all ${
                    isDone
                      ? 'bg-emerald-500 scale-100'
                      : isLocked
                      ? 'bg-amber-400 ring-2 ring-amber-200'
                      : isCurrent
                      ? 'bg-brand-600 animate-ping'
                      : 'bg-slate-200'
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Action Success / Unlock Message */}
      {actionMessage && (
        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* 1st Read Requirements Modal / Banner */}
      {showRequirementAlert && currentStage === 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2 animate-fadeIn shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-extrabold flex items-center gap-1.5 text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              1st Read Completion Checklist
            </span>
            <button
              type="button"
              onClick={() => setShowRequirementAlert(false)}
              className="text-amber-700 hover:text-amber-900 font-bold text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
          <p className="text-[11px] text-amber-700">
            To ensure strong retention and practice, complete these two active learning tasks:
          </p>
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2">
              {revisionStatus?.requirements?.has_note ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  1. Study note written
                </span>
              ) : (
                <span className="text-amber-800 font-medium flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  1. Write at least 1 study note (use the Notes section below or sidebar)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {revisionStatus?.requirements?.has_comment ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  2. Joined classroom discussion
                </span>
              ) : (
                <span className="text-amber-800 font-medium flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                  2. Share a comment or question in the Classroom Discussion below
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
