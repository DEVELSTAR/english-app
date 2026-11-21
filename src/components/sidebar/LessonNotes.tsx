import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
  Globe,
  Users,
  ExternalLink,
} from 'lucide-react';
import { Lesson, Note, User } from '../../types/database';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import ReactionBar, { ReactionEmoji } from '../common/ReactionBar';
import { formatTimeAgo } from '../../lib/dateUtils';
import { getUserProfileIcon } from '../../lib/profileIcons';

interface LessonNotesProps {
  lesson: Lesson;
  onNotesCountChange?: (count: number) => void;
}

export default function LessonNotes({ lesson, onNotesCountChange }: LessonNotesProps) {
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newContent, setNewContent] = useState('');
  const [sharingMode, setSharingMode] = useState<'global' | 'shared'>('global');
  const [availableStudents, setAvailableStudents] = useState<User[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [inviteCanEdit, setInviteCanEdit] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Edit State
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Load available classmates
  useEffect(() => {
    async function loadStudents() {
      if (currentUser?.id) {
        try {
          const classmates = await api.getClassmates();
          setAvailableStudents(classmates);
        } catch {
          // ignore
        }
      }
    }
    loadStudents();
  }, [currentUser?.id]);

  // Load lesson notes
  const loadNotes = async () => {
    setIsLoading(true);
    try {
      const data = await api.getNotes({ lesson_id: lesson.id });
      setNotes(data);
      onNotesCountChange?.(data.length);
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [lesson.id, currentUser?.id]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || isSaving) return;

    if (!currentUser) {
      alert('Please sign in to save notes.');
      return;
    }

    if (sharingMode === 'shared' && selectedStudentIds.length === 0) {
      alert('Please select at least one student or switch to Public.');
      return;
    }

    setIsSaving(true);
    try {
      await api.createNote({
        content: newContent.trim(),
        lesson_id: lesson.id,
        is_global: sharingMode === 'global',
        shared_student_ids: sharingMode === 'shared' ? selectedStudentIds : [],
        can_edit: inviteCanEdit,
      });

      setNewContent('');
      setShowShareOptions(false);
      setSelectedStudentIds([]);
      setInviteCanEdit(false);
      setSharingMode('global');
      await loadNotes();
    } catch (err: any) {
      alert(err?.message || 'Failed to save note.');
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditContent('');
  };

  const handleSaveEdit = async (noteId: number, currentNote: Note) => {
    if (!currentUser || !editContent.trim() || isUpdating) return;

    setIsUpdating(true);
    try {
      await api.updateNote(noteId, {
        content: editContent.trim(),
        is_global: currentNote.is_global,
      });
      setEditingNoteId(null);
      setEditContent('');
      await loadNotes();
    } catch (err: any) {
      alert(err?.message || 'Failed to update note.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (noteId: number) => {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await api.deleteNote(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      onNotesCountChange?.(notes.length - 1);
      if (editingNoteId === noteId) cancelEdit();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete note.');
    }
  };

  const handleReact = async (noteId: number, emoji: ReactionEmoji) => {
    try {
      const res = await api.reactToNote(noteId, emoji);
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, reactions: res.reactions } : n))
      );
    } catch {
      // ignore
    }
  };

  const toggleStudent = (id: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex flex-col h-[520px] bg-slate-50/50">
      {/* Header bar */}
      <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand-600" />
          <span className="text-xs font-bold text-slate-800">
            Lesson Notes
          </span>
          <span className="text-[10px] font-mono bg-brand-50 text-brand-700 font-bold px-2 py-0.5 rounded-full border border-brand-200">
            {notes.length}
          </span>
        </div>

        <Link
          to={`/notes?lesson_id=${lesson.id}`}
          className="text-[11px] font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1 transition"
          title="Open in full notes page"
        >
          <span>View all</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
        {isLoading ? (
          <div className="text-center py-12 text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
            <span>Loading notes...</span>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12 space-y-2 text-slate-500">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-xl border border-amber-200">
              📝
            </div>
            <p className="font-bold text-slate-800 text-xs">No notes yet</p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Write down tricky words, grammar rules, or sentences from this lesson!
            </p>
          </div>
        ) : (
          notes.map((note) => {
            const isEditing = editingNoteId === note.id;
            const canEdit =
              note.can_edit ||
              note.user_id === currentUser?.id ||
              (currentUser?.role !== undefined && currentUser.role >= 1);
            const canDelete =
              note.can_delete ||
              note.user_id === currentUser?.id ||
              (currentUser?.role !== undefined && currentUser.role >= 1);

            const userShare = currentUser
              ? (note.note_shares || []).find(
                  (s) => s.user_id === currentUser.id && s.status === 1
                )
              : null;

            return (
              <div
                key={note.id}
                className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-2 hover:border-slate-300 transition"
              >
                {/* Note Header / Meta */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Author Profile Icon */}
                    <div
                      className="flex items-center gap-1 cursor-pointer"
                      title={note.user?.name || 'Student'}
                    >
                      <span className="text-base leading-none select-none">
                        {getUserProfileIcon(note.user)}
                      </span>
                      <span className="font-semibold text-slate-700 text-[11px]">
                        {note.user?.name || 'Student'}
                      </span>
                      {note.user?.role !== undefined && note.user.role >= 1 && (
                        <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1 py-0.2 rounded font-semibold border border-indigo-200">
                          Teacher
                        </span>
                      )}
                    </div>

                    {note.is_global ? (
                      <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                        Public
                      </span>
                    ) : (
                      <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-medium">
                        Shared ({note.note_shares?.length || 0})
                      </span>
                    )}

                    {currentUser && note.user_id !== currentUser.id && userShare && (
                      <span className="text-[10px] text-blue-600">
                        • {userShare.can_edit ? 'Can edit' : 'View only'}
                      </span>
                    )}
                  </div>

                  <span className="font-mono text-[10px] shrink-0">
                    {formatTimeAgo(note.updated_at || note.created_at)}
                  </span>
                </div>

                {isEditing ? (
                  <div className="space-y-2 pt-1">
                    <textarea
                      rows={3}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 bg-white resize-none"
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-2.5 py-1 rounded-lg text-[11px] text-slate-600 hover:bg-slate-100 transition cursor-pointer font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!editContent.trim() || isUpdating}
                        onClick={() => handleSaveEdit(note.id, note)}
                        className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-xs"
                      >
                        {isUpdating ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-800 leading-relaxed whitespace-pre-wrap font-sans text-xs">
                      {note.content}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-1 pt-1.5 border-t border-slate-100 text-[10px] text-slate-400">
                      <div>
                        {note.updated_at && note.updated_at !== note.created_at && (
                          <span className="text-[10px] text-amber-600 italic">(edited)</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <ReactionBar
                          reactions={note.reactions}
                          onReact={(emoji) => handleReact(note.id, emoji)}
                          compact
                        />

                        {(canEdit || canDelete) && (
                          <div className="flex items-center gap-1 pl-1.5 border-l border-slate-200">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => startEdit(note)}
                                className="text-slate-400 hover:text-slate-900 transition cursor-pointer p-1"
                                title="Edit note"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDelete(note.id)}
                                className="text-slate-400 hover:text-rose-600 transition cursor-pointer p-1"
                                title="Delete note"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Note Form */}
      {currentUser ? (
        <form
          onSubmit={handleAddNote}
          className="p-3 border-t border-slate-200 bg-white space-y-2 shrink-0"
        >
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={2}
            placeholder="Write a note for this lesson..."
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 transition resize-none"
          />

          {showShareOptions && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="lesson_sharing_mode"
                    value="global"
                    checked={sharingMode === 'global'}
                    onChange={() => setSharingMode('global')}
                    className="text-brand-600 focus:ring-brand-600"
                  />
                  <span>Public</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="lesson_sharing_mode"
                    value="shared"
                    checked={sharingMode === 'shared'}
                    onChange={() => setSharingMode('shared')}
                    className="text-brand-600 focus:ring-brand-600"
                  />
                  <span>Share with classmates</span>
                </label>
              </div>

              {sharingMode === 'shared' && (
                <div className="space-y-2 pt-1 border-t border-slate-200">
                  <div className="max-h-28 overflow-y-auto border border-slate-200 bg-white rounded-lg p-1.5 space-y-1">
                    {availableStudents.length === 0 ? (
                      <p className="text-[11px] text-slate-400 p-1 italic">No classmates found.</p>
                    ) : (
                      availableStudents.map((s) => (
                        <label
                          key={s.id}
                          className="flex items-center gap-1.5 hover:bg-slate-50 p-1 rounded cursor-pointer transition"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(s.id)}
                            onChange={() => toggleStudent(s.id)}
                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                          />
                          <span className="text-[11px] text-slate-800">{s.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-700 font-medium">
                    <input
                      type="checkbox"
                      checked={inviteCanEdit}
                      onChange={(e) => setInviteCanEdit(e.target.checked)}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                    />
                    <span>Allow invited classmates to edit</span>
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-0.5">
            <button
              type="button"
              onClick={() => setShowShareOptions(!showShareOptions)}
              className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer font-medium"
            >
              {sharingMode === 'global' ? (
                <>
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>Public</span>
                </>
              ) : (
                <>
                  <Users className="w-3.5 h-3.5 text-brand-600" />
                  <span>Shared ({selectedStudentIds.length})</span>
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={!newContent.trim() || isSaving}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>Save Note</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="p-3.5 border-t border-slate-200 bg-white text-center text-xs text-slate-500 shrink-0">
          <Link to="/auth/sign-in" className="text-brand-600 font-semibold hover:underline">
            Sign in
          </Link>{' '}
          to write and share notes for this lesson.
        </div>
      )}
    </div>
  );
}
