import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Lesson, LessonComment } from '../../types/database';
import { useAuth } from '../../context/AuthContext';
import ReactionBar, { ReactionEmoji } from '../common/ReactionBar';
import { formatTimeAgo } from '../../lib/dateUtils';
import { getProfileIconMeta } from '../../lib/profileIcons';
import { MessageCircle, Send, Reply, Trash2, Edit2, Loader2, X, Check } from 'lucide-react';

interface ChatRoomProps {
  lesson: Lesson;
  onCommentCountChange?: (count: number) => void;
}

export default function ChatRoom({ lesson, onCommentCountChange }: ChatRoomProps) {
  const { currentUser } = useAuth();
  const [comments, setComments] = useState<LessonComment[]>([]);
  const [content, setContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<LessonComment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const data = await api.getComments(lesson.id);
      setComments(data);
      onCommentCountChange?.(data.length);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [lesson.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    if (!currentUser) {
      alert('Please sign in to join the class discussion.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.postComment(lesson.id, content.trim(), replyingTo ? replyingTo.id : null);
      setContent('');
      setReplyingTo(null);
      await loadComments();
    } catch (err: any) {
      alert(err.message || 'Failed to post comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (commentId: number) => {
    if (!editContent.trim()) return;
    try {
      await api.editComment(lesson.id, commentId, editContent.trim());
      setEditingId(null);
      await loadComments();
    } catch (err: any) {
      alert(err.message || 'Failed to edit comment.');
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      await api.deleteComment(lesson.id, commentId);
      await loadComments();
    } catch (err: any) {
      alert(err.message || 'Failed to delete comment.');
    }
  };

  const handleReact = async (commentId: number, emoji: ReactionEmoji) => {
    try {
      await api.reactToComment(lesson.id, commentId, emoji);
      await loadComments();
    } catch (err) {
      // ignore
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Comments List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-[300px]">
        {isLoading ? (
          <div className="text-center py-10 text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
            <span className="text-xs">Loading discussion...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-2">
            <MessageCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <h5 className="text-xs font-bold text-slate-700">No comments yet</h5>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Be the first student to share your practice sentence or ask a question!
            </p>
          </div>
        ) : (
          comments.map((comment) => {
            const iconMeta = getProfileIconMeta(comment.user?.profile_icon);
            const isAuthor = currentUser?.id === comment.user_id;
            const canDelete = isAuthor || (currentUser?.role && currentUser.role >= 1);

            return (
              <div key={comment.id} className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-2xs space-y-2">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${iconMeta.color}`}
                    >
                      {iconMeta.emoji}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900">{comment.user?.name}</span>
                      <span className="text-[10px] text-slate-400 ml-2 font-mono">
                        {formatTimeAgo(comment.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setReplyingTo(comment)}
                      className="p-1 rounded text-slate-400 hover:text-brand-600 transition cursor-pointer"
                      title="Reply"
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>
                    {isAuthor && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(comment.id);
                          setEditContent(comment.content);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-amber-600 transition cursor-pointer"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(comment.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Body or Edit Form */}
                {editingId === comment.id ? (
                  <div className="space-y-2 pt-1">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-600"
                      rows={2}
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1 text-[11px] font-semibold text-slate-600 rounded-lg hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditSubmit(comment.id)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-brand-600 text-white rounded-lg shadow-2xs"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                )}

                {/* Reactions */}
                <ReactionBar
                  reactions={comment.reactions}
                  canReact={Boolean(currentUser && comment.user_id !== currentUser.id)}
                  onReact={(emoji) => handleReact(comment.id, emoji)}
                />

                {/* Nested Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="pl-4 mt-2 border-l-2 border-brand-100 space-y-2 pt-2">
                    {comment.replies.map((reply) => {
                      const replyIcon = getProfileIconMeta(reply.user?.profile_icon);
                      const isReplyAuthor = currentUser?.id === reply.user_id;
                      return (
                        <div key={reply.id} className="bg-slate-50 p-2.5 rounded-xl text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px]">{replyIcon.emoji}</span>
                              <span className="font-bold text-slate-900">{reply.user?.name}</span>
                              <span className="text-[10px] text-slate-400">{formatTimeAgo(reply.created_at)}</span>
                            </div>
                            {(isReplyAuthor || (currentUser?.role && currentUser.role >= 1)) && (
                              <button
                                type="button"
                                onClick={() => handleDelete(reply.id)}
                                className="text-slate-400 hover:text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-slate-700 leading-relaxed">{reply.content}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Input Box */}
      <div className="p-3 bg-white border-t border-slate-200/80 space-y-2">
        {replyingTo && (
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-brand-50 text-brand-700 rounded-xl text-[11px]">
            <span>Replying to <strong>{replyingTo.user?.name}</strong></span>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="p-0.5 hover:bg-brand-100 rounded text-brand-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={replyingTo ? "Write your reply..." : "Ask a question or share a sentence..."}
            className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 transition"
          />
          <button
            type="submit"
            disabled={!content.trim() || isSubmitting}
            className="p-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
