import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export type ReactionEmoji = '👍' | '❤️' | '💡' | '👏' | '🔥' | '🎯';

const AVAILABLE_REACTIONS: ReactionEmoji[] = ['👍', '❤️', '💡', '👏', '🔥', '🎯'];

interface ReactionBarProps {
  reactions?: Record<string, number[]>;
  onReact: (emoji: ReactionEmoji) => void;
  compact?: boolean;
  canReact?: boolean; // When false, the current user cannot react (e.g. author cannot react to own content)
}

export default function ReactionBar({
  reactions = {},
  onReact,
  compact = false,
  canReact = true,
}: ReactionBarProps) {
  const { currentUser } = useAuth();
  const [showPicker, setShowPicker] = useState(false);

  const userId = currentUser?.id;

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1">
      {/* Existing Reactions with Count Badges */}
      {AVAILABLE_REACTIONS.map((emoji) => {
        const users = reactions[emoji] || [];
        if (users.length === 0) return null;
        const hasReacted = userId ? users.includes(userId) : false;

        if (!canReact) {
          // Read-only reaction badge for content author
          return (
            <span
              key={emoji}
              title={`${users.length} reaction${users.length > 1 ? 's' : ''}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-50 border border-slate-200/80 text-slate-600 select-none cursor-default"
            >
              <span>{emoji}</span>
              <span className="text-[10px] font-mono">{users.length}</span>
            </span>
          );
        }

        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onReact(emoji)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition cursor-pointer border ${
              hasReacted
                ? 'bg-brand-50 border-brand-300 text-brand-700 shadow-2xs'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{emoji}</span>
            <span className="text-[10px] font-mono">{users.length}</span>
          </button>
        );
      })}

      {/* Add Reaction Picker Button (Only visible if canReact is true) */}
      {canReact && (
        <div className="relative inline-block">
          <button
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs transition cursor-pointer"
            title="Add Reaction"
          >
            +
          </button>

          {showPicker && (
            <div className="absolute left-0 bottom-full mb-1 flex items-center gap-1 bg-white p-1 rounded-full shadow-lg border border-slate-200 z-30 animate-in fade-in zoom-in-95 duration-100">
              {AVAILABLE_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onReact(emoji);
                    setShowPicker(false);
                  }}
                  className="w-7 h-7 flex items-center justify-center hover:scale-125 transition-transform text-sm cursor-pointer rounded-full hover:bg-slate-100"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
