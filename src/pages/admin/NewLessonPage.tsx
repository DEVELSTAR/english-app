import React from 'react';
import LessonForm from '../../components/admin/LessonForm';

export default function NewLessonPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Create New Lesson or Topic</h1>
        <p className="text-xs text-slate-500 mt-1">
          Publish a new daily speaking class or foundational grammar series.
        </p>
      </div>
      <LessonForm />
    </div>
  );
}
