import { User } from '../types/database';

export interface ProfileIconOption {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

export const PROFILE_ICON_OPTIONS: ProfileIconOption[] = [
  { id: 'user', label: 'Scholar', emoji: '🎓', color: 'bg-brand-500 text-white' },
  { id: 'sparkles', label: 'Achiever', emoji: '✨', color: 'bg-amber-500 text-white' },
  { id: 'flame', label: 'Passionate', emoji: '🔥', color: 'bg-orange-500 text-white' },
  { id: 'rocket', label: 'Explorer', emoji: '🚀', color: 'bg-violet-500 text-white' },
  { id: 'book', label: 'Reader', emoji: '📖', color: 'bg-blue-500 text-white' },
  { id: 'star', label: 'Star', emoji: '⭐', color: 'bg-yellow-500 text-white' },
  { id: 'crown', label: 'Master', emoji: '👑', color: 'bg-indigo-600 text-white' },
  { id: 'mic', label: 'Speaker', emoji: '🎙️', color: 'bg-emerald-500 text-white' },
  { id: 'shield', label: 'Guardian', emoji: '🛡️', color: 'bg-slate-700 text-white' },
];

export function getUserProfileIcon(
  user?: Partial<User> | { id?: number; name?: string; profile_icon?: string } | null
): string {
  if (!user) return '🎓';
  if (user.profile_icon) {
    const match = PROFILE_ICON_OPTIONS.find(
      (opt) => opt.id === user.profile_icon || opt.emoji === user.profile_icon
    );
    if (match) return match.emoji;
    return user.profile_icon;
  }
  if (user.id) {
    const idx = Math.abs(user.id) % PROFILE_ICON_OPTIONS.length;
    return PROFILE_ICON_OPTIONS[idx].emoji;
  }
  return '🎓';
}

export function getProfileIconMeta(iconId?: string): ProfileIconOption {
  return (
    PROFILE_ICON_OPTIONS.find((opt) => opt.id === iconId || opt.emoji === iconId) ||
    PROFILE_ICON_OPTIONS[0]
  );
}
