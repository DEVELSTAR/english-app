import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Note, NoteShare, Lesson, User } from '../types/database';
import ReactionBar, { ReactionEmoji } from '../components/common/ReactionBar';
import { formatTimeAgo } from '../lib/dateUtils';
import { getUserProfileIcon } from '../lib/profileIcons';
import {
  FileText,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
  LogIn,
  Users,
  Globe,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';

type FilterTab = 'all' | 'general' | 'lesson' | 'shared' | 'mine';

export default function NotesPage() {
  const { currentUser, isSuperAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentFilter = (searchParams.get('filter') as FilterTab) || 'all';
  const lessonIdParam = searchParams.get('lesson_id');
  const selectedLessonId = lessonIdParam ? parseInt(lessonIdParam, 10) : null;

  const [notes, setNotes] = useState<Note[]>([]);
  const [pendingShares, setPendingShares] = useState<NoteShare[]>([]);
  const [availableStudents, setAvailableStudents] = useState<User[]>([]);
  const [lessonsList, setLessonsList] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Creation Form State
  const [content, setContent] = useState('');
  const [formLessonId, setFormLessonId] = useState<number | null>(selectedLessonId);
  const [sharingMode, setSharingMode] = useState<'global' | 'shared'>('global');
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [inviteCanEdit, setInviteCanEdit] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  // Editing Note State
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editSharingMode, setEditSharingMode] = useState<'global' | 'shared'>('global');
  const [editSelectedStudentIds, setEditSelectedStudentIds] = useState<number[]>([]);
  const [editInviteCanEdit, setEditInviteCanEdit] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Load Lessons & Classmates on Mount
  useEffect(() => {
    async function loadMeta() {
      try {
        const [lessons, classmates] = await Promise.all([
          api.getLessons({ status: 1 }),
          currentUser ? api.getClassmates().catch(() => []) : Promise.resolve([]),
        ]);
        setLessonsList(lessons);
        setAvailableStudents(classmates);
      } catch (err) {
        console.error('Failed to load lessons or classmates:', err);
      }
    }
    loadMeta();
  }, [currentUser]);

  // Synchronize form lesson if URL changes
  useEffect(() => {
    if (selectedLessonId) {
      setFormLessonId(selectedLessonId);
    }
  }, [selectedLessonId]);

  // Load Notes & Pending Invitations
  const loadNotesData = async () => {
    setIsLoading(true);
    try {
      const [fetchedNotes, fetchedShares] = await Promise.all([
        api.getNotes({
          filter: currentFilter === 'all' ? undefined : currentFilter,
          lesson_id: selectedLessonId || undefined,
        }),
        currentUser ? api.getPendingShares().catch(() => []) : Promise.resolve([]),
      ]);
      setNotes(fetchedNotes);
      setPendingShares(fetchedShares);
    } catch (err) {
      console.error('Failed to load notes data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotesData();
  }, [currentUser, currentFilter, selectedLessonId]);

  // Tab Switching
  const handleTabChange = (filterTab: FilterTab) => {
    const params = new URLSearchParams(searchParams);
    params.set('filter', filterTab);
    setSearchParams(params);
  };

  const handleClearLessonFilter = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('lesson_id');
    setSearchParams(params);
    setFormLessonId(null);
  };

  // Handle Invitation Response
  const handleRespondToShare = async (shareId: number, accept: boolean) => {
    try {
      await api.respondToShare(shareId, accept);
      setPendingShares((prev) => prev.filter((s) => s.id !== shareId));
      await loadNotesData();
    } catch (err: any) {
      alert(err.message || 'Failed to update invitation status.');
    }
  };

  // Handle Note Creation
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !content.trim() || isPosting) return;

    if (sharingMode === 'shared' && selectedStudentIds.length === 0) {
      alert("Please select at least one student to share this note with, or choose 'Public'.");
      return;
    }

    setIsPosting(true);
    try {
      await api.createNote({
        content: content.trim(),
        lesson_id: formLessonId,
        is_global: sharingMode === 'global',
        shared_student_ids: sharingMode === 'shared' ? selectedStudentIds : [],
        can_edit: inviteCanEdit,
      });

      setContent('');
      setSelectedStudentIds([]);
      setInviteCanEdit(false);
      setSharingMode('global');
      await loadNotesData();
    } catch (err: any) {
      alert(err.message || 'Failed to post note.');
    } finally {
      setIsPosting(false);
    }
  };

  // Start Editing
  const startEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
    setEditSharingMode(note.is_global ? 'global' : 'shared');
    const existingShareIds = (note.note_shares || []).map((s) => s.user_id);
    setEditSelectedStudentIds(existingShareIds);
    const hasEditPermission = (note.note_shares || []).some((s) => s.can_edit);
    setEditInviteCanEdit(hasEditPermission);
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditContent('');
    setEditSelectedStudentIds([]);
    setEditInviteCanEdit(false);
  };

  // Save Editing
  const handleSaveEdit = async (noteId: number) => {
    if (!currentUser || !editContent.trim() || isUpdating) return;

    setIsUpdating(true);
    try {
      await api.updateNote(noteId, {
        content: editContent.trim(),
        is_global: editSharingMode === 'global',
        shared_student_ids: editSharingMode === 'shared' ? editSelectedStudentIds : [],
        can_edit: editInviteCanEdit,
      });

      cancelEdit();
      await loadNotesData();
    } catch (err: any) {
      alert(err.message || 'Failed to update note.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete Note
  const handleDeleteNote = async (noteId: number) => {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to delete this study note?')) return;

    try {
      await api.deleteNote(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      if (editingNoteId === noteId) cancelEdit();
    } catch (err: any) {
      alert(err.message || 'Failed to delete note.');
    }
  };

  // Toggle student selection helper
  const toggleStudentSelection = (
    studentId: number,
    list: number[],
    setList: React.Dispatch<React.SetStateAction<number[]>>
  ) => {
    if (list.includes(studentId)) {
      setList(list.filter((id) => id !== studentId));
    } else {
      setList([...list, studentId]);
    }
  };

  // Active lesson filter info
  const filteredLesson = selectedLessonId
    ? lessonsList.find((l) => l.id === selectedLessonId)
    : null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6 overflow-x-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-brand-600" />
            <span>Community & Study Notes</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Share sentences, phrases, grammar tips, and study notes with classmates.
          </p>
        </div>
        <span className="text-xs text-slate-500 font-mono self-start sm:self-center bg-slate-100 px-2.5 py-1 rounded-full">
          {notes.length} {notes.length === 1 ? 'note' : 'notes'}
        </span>
      </div>

      {/* Pending Invitations Banner */}
      {currentUser && pendingShares.length > 0 && (
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
              <span>📬 Note Invitations ({pendingShares.length})</span>
            </span>
            <span className="text-[11px] font-mono font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
              {pendingShares.length}
            </span>
          </div>

          <div className="space-y-2">
            {pendingShares.map((share) => {
              const note = share.note;
              return (
                <div
                  key={share.id}
                  className="p-3 bg-white rounded-xl border border-indigo-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs flex-wrap">
                      <span className="font-bold text-slate-900">
                        {share.user?.name || 'A classmate'}
                      </span>
                      <span className="text-slate-500">invited you to a note</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                        {share.can_edit ? 'Can edit' : 'View only'}
                      </span>
                      {note?.lesson_title && (
                        <span className="text-[10px] bg-brand-50 text-brand-700 border border-brand-200 px-1.5 py-0.5 rounded font-medium">
                          {note.lesson_title}
                        </span>
                      )}
                    </div>
                    {note?.content && (
                      <p className="text-xs text-slate-600 truncate mt-1 font-sans">
                        &ldquo;{note.content.slice(0, 85)}
                        {note.content.length > 85 ? '...' : ''}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleRespondToShare(share.id, true)}
                      className="px-3 py-1 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition cursor-pointer shadow-xs flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Accept</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRespondToShare(share.id, false)}
                      className="px-2.5 py-1 text-xs text-slate-500 hover:text-rose-600 transition cursor-pointer flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Note Creation Form (Authenticated) or Sign-In Prompt */}
      {!currentUser ? (
        <div className="p-5 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-800">
              Sign in to share sentences, practice notes, and collaborate with peers.
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Public and shared notes sync across all your devices.
            </p>
          </div>
          <Link
            to="/auth/sign-in"
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition shrink-0 flex items-center gap-1.5"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3.5">
          <form onSubmit={handleCreateNote} className="space-y-3">
            <div>
              <textarea
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                placeholder="Write your sentences, grammar notes, or study tips here..."
                className="w-full min-h-[110px] rounded-xl border border-slate-300 bg-white p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:ring-1 focus:ring-brand-600 transition resize-y leading-relaxed font-sans"
              />
            </div>

            {/* Optional Lesson Picker */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-xs text-slate-600 w-full min-w-0">
              <label htmlFor="note_lesson_select" className="font-semibold text-slate-700 shrink-0">
                Link to Lesson:
              </label>
              <select
                id="note_lesson_select"
                value={formLessonId ?? ''}
                onChange={(e) =>
                  setFormLessonId(e.target.value ? parseInt(e.target.value, 10) : null)
                }
                className="w-full sm:max-w-md max-w-full min-w-0 px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:border-brand-600 truncate"
              >
                <option value="">General Note (No Lesson)</option>
                {lessonsList.map((l) => {
                  const prefix = l.category ? `[${l.category.name}] ` : '';
                  const displayTitle = l.title.length > 40 ? `${l.title.slice(0, 40)}...` : l.title;
                  return (
                    <option key={l.id} value={l.id} title={l.title}>
                      {prefix}
                      {displayTitle}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Sharing Mode Selection */}
            <div className="text-xs text-slate-600 pt-1 space-y-2.5 border-t border-slate-100">
              <div className="flex items-center gap-5 flex-wrap">
                <span className="font-semibold text-slate-700">Visibility:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="sharing_mode"
                    value="global"
                    checked={sharingMode === 'global'}
                    onChange={() => setSharingMode('global')}
                    className="text-brand-600 focus:ring-brand-600"
                  />
                  <span className="font-medium text-slate-800 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-slate-500" />
                    <span>Public (All students)</span>
                  </span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="sharing_mode"
                    value="shared"
                    checked={sharingMode === 'shared'}
                    onChange={() => setSharingMode('shared')}
                    className="text-brand-600 focus:ring-brand-600"
                  />
                  <span className="font-medium text-slate-800 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-brand-600" />
                    <span>Share with specific students</span>
                  </span>
                </label>
              </div>

              {/* Specific Students Checklist */}
              {sharingMode === 'shared' && (
                <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700">
                      Select classmates to invite:
                    </label>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {selectedStudentIds.length} selected
                    </span>
                  </div>

                  {availableStudents.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No other students registered yet.</p>
                  ) : (
                    <div className="max-h-36 overflow-y-auto border border-slate-200 bg-white rounded-lg p-2 space-y-1">
                      {availableStudents.map((student) => (
                        <label
                          key={student.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(student.id)}
                            onChange={() =>
                              toggleStudentSelection(
                                student.id,
                                selectedStudentIds,
                                setSelectedStudentIds
                              )
                            }
                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                          />
                          <span className="text-xs text-slate-800">
                            {student.name}
                            <span className="text-slate-400 font-mono text-[11px] ml-1.5">
                              ({student.email_address})
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={inviteCanEdit}
                      onChange={(e) => setInviteCanEdit(e.target.checked)}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                    />
                    <span className="text-slate-700 font-medium">
                      Allow invited students to edit this note
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={!content.trim() || isPosting}
                className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                {isPosting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>Post Note</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lesson Filter Banner if filtered */}
      {filteredLesson && (
        <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl flex items-center justify-between text-xs text-brand-900">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand-700" />
            <span>
              Filtered by:{' '}
              <strong>
                {filteredLesson.category?.name ? `${filteredLesson.category.name}: ` : ''}
                {filteredLesson.title}
              </strong>
            </span>
          </div>
          <button
            type="button"
            onClick={handleClearLessonFilter}
            className="text-brand-700 hover:text-brand-950 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear Filter</span>
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 text-xs flex-wrap border-b border-slate-100 pb-2">
        <button
          type="button"
          onClick={() => handleTabChange('all')}
          className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
            currentFilter === 'all'
              ? 'bg-slate-900 text-white font-semibold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Notes
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('general')}
          className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
            currentFilter === 'general'
              ? 'bg-slate-900 text-white font-semibold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          General
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('lesson')}
          className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
            currentFilter === 'lesson'
              ? 'bg-slate-900 text-white font-semibold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Class & Topic Notes
        </button>
        {currentUser && (
          <>
            <button
              type="button"
              onClick={() => handleTabChange('shared')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                currentFilter === 'shared'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Shared with Me
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('mine')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                currentFilter === 'mine'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              My Notes
            </button>
          </>
        )}
      </div>

      {/* Notes List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
            <span className="text-xs">Loading notes...</span>
          </div>
        ) : notes.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-2xl p-6">
            No notes found. Be the first to share one!
          </div>
        ) : (
          notes.map((note) => {
            const isEditing = editingNoteId === note.id;
            const isOwner = currentUser?.id === note.user_id;
            const canEdit = note.can_edit ?? isOwner;
            const canDelete = note.can_delete ?? isOwner;

            const userShare = currentUser
              ? (note.note_shares || []).find(
                  (s) => s.user_id === currentUser.id && s.status === 1
                )
              : null;

            if (isEditing) {
              return (
                <div
                  key={note.id}
                  className="bg-amber-50/40 border border-amber-300 rounded-2xl p-5 shadow-xs transition space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Pencil className="w-3.5 h-3.5 text-amber-700" />
                      <span>Editing Note</span>
                    </span>
                  </div>

                  <textarea
                    rows={5}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    required
                    className="w-full min-h-[120px] rounded-xl border border-slate-300 bg-white p-3.5 text-sm text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 resize-y leading-relaxed font-sans"
                  />

                  {canDelete && (
                    <div className="text-xs text-slate-600 pt-2 border-t border-amber-200 space-y-2">
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="font-semibold text-slate-700">Visibility:</span>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`edit_sharing_mode_${note.id}`}
                            value="global"
                            checked={editSharingMode === 'global'}
                            onChange={() => setEditSharingMode('global')}
                          />
                          <span>Public</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`edit_sharing_mode_${note.id}`}
                            value="shared"
                            checked={editSharingMode === 'shared'}
                            onChange={() => setEditSharingMode('shared')}
                          />
                          <span>Share with students</span>
                        </label>
                      </div>

                      {editSharingMode === 'shared' && (
                        <div className="p-3 bg-white/80 border border-slate-200 rounded-lg space-y-2">
                          <label className="block font-semibold text-slate-700">
                            Invited Students:
                          </label>
                          <div className="max-h-32 overflow-y-auto border border-slate-200 bg-white rounded p-2 space-y-1">
                            {availableStudents.map((student) => (
                              <label
                                key={student.id}
                                className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={editSelectedStudentIds.includes(student.id)}
                                  onChange={() =>
                                    toggleStudentSelection(
                                      student.id,
                                      editSelectedStudentIds,
                                      setEditSelectedStudentIds
                                    )
                                  }
                                />
                                <span className="text-xs text-slate-800">
                                  {student.name} ({student.email_address})
                                </span>
                              </label>
                            ))}
                          </div>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editInviteCanEdit}
                              onChange={(e) => setEditInviteCanEdit(e.target.checked)}
                            />
                            <span className="text-slate-700">Allow invited students to edit</span>
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!editContent.trim() || isUpdating}
                      onClick={() => handleSaveEdit(note.id)}
                      className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 disabled:opacity-40 transition cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      {isUpdating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={note.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition space-y-3"
              >
                {/* Note Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Author Profile Icon */}
                    <div
                      className="flex items-center gap-1.5 cursor-pointer"
                      title={note.user?.name || 'Student'}
                    >
                      <span className="text-xl sm:text-2xl leading-none select-none transition-transform hover:scale-115">
                        {getUserProfileIcon(note.user)}
                      </span>
                    </div>

                    {/* Mode (Public / Shared) */}
                    {note.is_global ? (
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Globe className="w-3 h-3 text-slate-400" />
                        <span>Public</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Users className="w-3 h-3 text-brand-500" />
                        <span>
                          Shared with {note.note_shares?.length || 0}{' '}
                          {note.note_shares?.length === 1 ? 'student' : 'students'}
                        </span>
                      </span>
                    )}

                    {note.lesson && (
                      <Link
                        to={`/lessons/${note.lesson.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-800 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-md hover:bg-brand-100 transition"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>
                          {note.lesson.title.length > 36
                            ? `${note.lesson.title.slice(0, 36)}...`
                            : note.lesson.title}
                        </span>
                      </Link>
                    )}

                    {currentUser && note.user_id !== currentUser.id && userShare && (
                      <span className="text-[10px] text-brand-600 font-medium">
                        • {userShare.can_edit ? 'Can edit' : 'View only'}
                      </span>
                    )}
                  </div>

                  <time
                    dateTime={note.created_at}
                    className="text-xs text-slate-400 font-mono shrink-0 flex items-center gap-1"
                  >
                    <Clock className="w-3 h-3" />
                    <span>{formatTimeAgo(note.updated_at || note.created_at)}</span>
                  </time>
                </div>

                {/* Note Content */}
                <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words py-1 font-sans">
                  {note.content}
                </div>

                {/* Note Footer: Reactions & Actions */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="text-[11px] text-slate-400">
                    {note.updated_at && note.updated_at !== note.created_at && (
                      <span className="text-amber-600 italic">(edited)</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <ReactionBar
                      reactions={note.reactions}
                      canReact={Boolean(currentUser && note.user_id !== currentUser.id)}
                      onReact={(emoji) => api.reactToNote(note.id, emoji).then(() => loadNotesData())}
                    />

                    <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => startEdit(note)}
                          className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer p-1"
                          title="Edit Note"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-xs font-semibold text-slate-400 hover:text-rose-600 transition cursor-pointer p-1"
                          title="Delete Note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
