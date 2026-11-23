import React, { useState, useEffect } from 'react';
import { Sparkles, MessageSquare, FileText } from 'lucide-react';
import { Lesson } from '../../types/database';
import AiTutor from './AiTutor';
import ChatRoom from './ChatRoom';
import LessonNotes from './LessonNotes';

interface LessonSidebarProps {
  lesson: Lesson;
}

type TabType = 'ai_tutor' | 'discussion' | 'notes';

export default function LessonSidebar({ lesson }: LessonSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>('ai_tutor');
  const [commentsCount, setCommentsCount] = useState<number>(0);
  const [notesCount, setNotesCount] = useState<number>(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fluentedge_sidebar_tab') as TabType;
      if (saved && ['ai_tutor', 'discussion', 'notes'].includes(saved)) {
        setActiveTab(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    try {
      localStorage.setItem('fluentedge_sidebar_tab', tab);
    } catch {
      // ignore
    }
  };

  return (
    <aside className="w-full rounded-3xl border border-slate-200/90 bg-white shadow-sm overflow-hidden flex flex-col h-full lg:max-h-[calc(100vh-6rem)]">
      {/* Sleek Floating Tabs Header */}
      <div className="p-2.5 bg-slate-50/90 border-b border-slate-200/80 shrink-0">
        <div className="grid grid-cols-3 gap-1.5 w-full bg-slate-200/50 p-1 rounded-2xl">
          {/* Tab 1: Lesson AI Tutor */}
          <button
            type="button"
            onClick={() => handleTabChange('ai_tutor')}
            className={`px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'ai_tutor'
                ? 'bg-white text-brand-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-500 shrink-0" />
            <span className="truncate">AI Tutor</span>
          </button>

          {/* Tab 2: Discussion */}
          <button
            type="button"
            onClick={() => handleTabChange('discussion')}
            className={`px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'discussion'
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">Discussion</span>
            {commentsCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700">
                {commentsCount}
              </span>
            )}
          </button>

          {/* Tab 3: Notes */}
          <button
            type="button"
            onClick={() => handleTabChange('notes')}
            className={`px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'notes'
                ? 'bg-white text-amber-600 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">Notes</span>
            {notesCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-700">
                {notesCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'ai_tutor' && <AiTutor lesson={lesson} />}
        {activeTab === 'discussion' && (
          <ChatRoom lesson={lesson} onCommentCountChange={(count) => setCommentsCount(count)} />
        )}
        {activeTab === 'notes' && (
          <LessonNotes lesson={lesson} onNotesCountChange={(count) => setNotesCount(count)} />
        )}
      </div>
    </aside>
  );
}
