import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ActivityRecord, User } from '../../types/database';
import { formatTimeAgo, formatISTDateTime } from '../../lib/dateUtils';
import {
  History,
  Search,
  Filter,
  User as UserIcon,
  Clock,
  Loader2,
  Shield,
  FileText,
  MessageCircle,
  BookOpen,
  RefreshCw,
} from 'lucide-react';

export default function AdminHistoryPage() {
  const [logs, setLogs] = useState<ActivityRecord[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [selectedResourceType, setSelectedResourceType] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getHistory({
        user_id: selectedStudentId !== 'all' ? selectedStudentId : undefined,
        resource_type: selectedResourceType !== 'all' ? selectedResourceType : undefined,
        action: selectedAction !== 'all' ? selectedAction : undefined,
        search: searchQuery.trim() || undefined,
      });
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    async function loadMeta() {
      try {
        const stds = await api.getStudents();
        setStudents(stds);
      } catch {
        // ignore
      }
    }
    loadMeta();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [selectedStudentId, selectedResourceType, selectedAction]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-brand-600" />
            <span>Audit Trail & Activity Log</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time audit trail of student activities (signups, logins, AI Tutor chats, study notes, comments, deletions, and reactions). Admin actions are excluded.
          </p>
        </div>

        <button
          type="button"
          onClick={loadLogs}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block text-slate-500 font-bold mb-1">Filter by User</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-600"
          >
            <option value="all">All Users</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.email_address})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-500 font-bold mb-1">Resource Type</label>
          <select
            value={selectedResourceType}
            onChange={(e) => setSelectedResourceType(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-600"
          >
            <option value="all">All Resources</option>
            <option value="auth">Authentication (Login/Signup)</option>
            <option value="chat">AI Tutor Conversations</option>
            <option value="comment">Discussion Comments</option>
            <option value="note">Study Notes</option>
            <option value="lesson">Curriculum Lessons & Reactions</option>
            <option value="notification">Notifications</option>
            <option value="user">Student Profile</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-500 font-bold mb-1">Action Type</label>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-600"
          >
            <option value="all">All Actions</option>
            <option value="login">Login</option>
            <option value="signup">Sign Up</option>
            <option value="chat">AI Chat</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="destroy">Delete</option>
            <option value="reaction">Reaction</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-500 font-bold mb-1">Search Keywords</label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadLogs()}
              placeholder="Hit Enter to search..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-600"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Log Feed */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
            <span className="text-xs">Loading audit logs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">No audit logs match your filters.</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition flex items-start gap-4 text-xs">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 font-bold">
                {log.action === 'login' && '🔑'}
                {log.action === 'signup' && '🎉'}
                {log.action === 'chat' && '🤖'}
                {log.action === 'create' && '➕'}
                {log.action === 'update' && '✏️'}
                {log.action === 'destroy' && '🗑️'}
                {log.action === 'reaction' && '❤️'}
                {!['login', 'signup', 'chat', 'create', 'update', 'destroy', 'reaction'].includes(log.action) && '📋'}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{log.user_name}</span>
                    <span className="text-slate-400 font-mono text-[11px]">({log.user_email})</span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                      {log.action}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400">
                    {formatISTDateTime(log.created_at)}
                  </span>
                </div>

                <p className="text-slate-700 leading-relaxed">{log.details}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
