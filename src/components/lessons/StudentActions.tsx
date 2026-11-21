import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { speakText, stopSpeaking, isSpeaking } from '../../lib/voice';
import { CheckCircle2, RotateCcw, Volume2, VolumeX, Loader2 } from 'lucide-react';

interface StudentActionsProps {
  lessonId: number;
  lessonContent?: string;
  lessonTitle?: string;
}

export default function StudentActions({ lessonId, lessonContent, lessonTitle }: StudentActionsProps) {
  const [completed, setCompleted] = useState(false);
  const [needsRevision, setNeedsRevision] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  useEffect(() => {
    async function loadProgress() {
      setIsLoading(true);
      try {
        const res = await api.getLessonCompletion(lessonId);
        setCompleted(res.completed);
        setNeedsRevision(res.needs_revision);
      } catch (err) {
        // user may be guest
      } finally {
        setIsLoading(false);
      }
    }
    loadProgress();
  }, [lessonId]);

  const handleToggleComplete = async () => {
    try {
      const newStatus = !completed;
      setCompleted(newStatus);
      if (newStatus) setNeedsRevision(false);
      await api.toggleLessonCompletion(lessonId, { completed: newStatus, needs_revision: false });
    } catch (err: any) {
      alert(err.message || 'Please sign in to save your learning progress.');
    }
  };

  const handleToggleRevision = async () => {
    try {
      const newStatus = !needsRevision;
      setNeedsRevision(newStatus);
      await api.toggleLessonCompletion(lessonId, { needs_revision: newStatus });
    } catch (err: any) {
      alert(err.message || 'Please sign in to flag lessons for revision.');
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
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

      {/* Needs Revision Flag */}
      <button
        type="button"
        onClick={handleToggleRevision}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
          needsRevision
            ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-2xs'
            : 'bg-white text-slate-600 border-slate-200 hover:border-amber-400 hover:text-amber-700 shadow-2xs'
        }`}
      >
        <RotateCcw className={`w-3.5 h-3.5 ${needsRevision ? 'text-amber-600' : 'text-slate-400'}`} />
        <span>{needsRevision ? 'Needs Revision' : 'Mark for Revision'}</span>
      </button>

      {/* Mark Completed */}
      <button
        type="button"
        onClick={handleToggleComplete}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
          completed
            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/20'
            : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-500 hover:text-emerald-700 shadow-2xs'
        }`}
      >
        <CheckCircle2 className={`w-3.5 h-3.5 ${completed ? 'text-white' : 'text-slate-400'}`} />
        <span>{completed ? 'Completed' : 'Mark Complete'}</span>
      </button>
    </div>
  );
}
