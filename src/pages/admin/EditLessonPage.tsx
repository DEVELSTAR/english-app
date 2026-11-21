import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../services/api';
import { Lesson } from '../../types/database';
import LessonForm from '../../components/admin/LessonForm';
import { Loader2 } from 'lucide-react';

export default function EditLessonPage() {
  const { id } = useParams<{ id: string }>();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setIsLoading(true);
      try {
        const res = await api.getLessonDetail(id);
        setLesson(res.lesson);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-400 flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
        <span className="text-xs">Loading lesson...</span>
      </div>
    );
  }

  if (!lesson) {
    return <div className="text-center py-20 text-slate-500 text-xs">Lesson not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Edit Lesson: {lesson.title}</h1>
        <p className="text-xs text-slate-500 mt-1">Update lesson content, publication status, or topic tag.</p>
      </div>
      <LessonForm initialLesson={lesson} isEditing={true} />
    </div>
  );
}
