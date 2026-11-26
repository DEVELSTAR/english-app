import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Loader2, Sparkles, X } from 'lucide-react';
import { api } from '../../services/api';
import { AppNotification } from '../../types/database';
import { formatTimeAgo } from '../../lib/dateUtils';
import { useAuth } from '../../context/AuthContext';

export default function NotificationBell() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileSheetRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    if (!currentUser) return;
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      // Silently fail if unauthenticated or network error
    }
  };

  useEffect(() => {
    loadNotifications();

    // Poll every 45 seconds for new notifications
    const interval = setInterval(() => {
      loadNotifications();
    }, 45000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const inDesktop = dropdownRef.current && dropdownRef.current.contains(target);
      const inMobile = mobileSheetRef.current && mobileSheetRef.current.contains(target);
      if (!inDesktop && !inMobile) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Prevent background scrolling when open on mobile
  useEffect(() => {
    if (isOpen && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      loadNotifications();
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    // Optimistically mark as read
    if (!notif.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await api.markNotificationRead(notif.id);
      } catch {
        // ignore
      }
    }
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleClearAll = async () => {
    setIsClearingAll(true);
    try {
      await api.clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    } finally {
      setIsClearingAll(false);
    }
  };

  if (!currentUser) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lesson_added':
        return <span className="text-base">🚀</span>;
      case 'revision_due':
        return <span className="text-base">⏰</span>;
      case 'note_reaction':
        return <span className="text-base">❤️</span>;
      case 'comment_reaction':
        return <span className="text-base">👍</span>;
      case 'comment_reply':
        return <span className="text-base">💬</span>;
      default:
        return <Sparkles className="w-4 h-4 text-brand-600" />;
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer border border-slate-200/70 active:scale-95"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center shadow-xs animate-in zoom-in-50 duration-200">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Desktop Popover */}
      {isOpen && (
        <div className="hidden md:flex absolute right-0 top-full mt-2 w-96 max-h-[520px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-100 text-brand-700">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={isMarkingAll}
                  className="text-[11px] font-bold text-brand-600 hover:text-brand-800 disabled:opacity-50 transition cursor-pointer px-2 py-1 rounded-lg hover:bg-brand-50"
                >
                  {isMarkingAll ? 'Marking...' : 'Mark read'}
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={isClearingAll}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-800 disabled:opacity-50 transition cursor-pointer px-2 py-1 rounded-lg hover:bg-rose-50"
                >
                  {isClearingAll ? 'Clearing...' : 'Clear all'}
                </button>
              )}
            </div>
          </div>

          {/* Notifications List (Scrollable) */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
                  🔔
                </div>
                <p className="text-xs font-bold text-slate-700">No notifications yet</p>
                <p className="text-[11px] text-slate-400 max-w-[220px] mx-auto leading-relaxed">
                  You'll be alerted when new lessons are added or when classmates react to your notes & comments!
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => handleNotificationClick(notif)}
                  className={`w-full text-left p-3 rounded-2xl transition-all flex items-start gap-3 cursor-pointer ${
                    notif.is_read
                      ? 'hover:bg-slate-50 text-slate-700'
                      : 'bg-brand-50/50 hover:bg-brand-50 text-slate-900 font-medium'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-white shadow-2xs border border-slate-200/80 flex items-center justify-center shrink-0 mt-0.5">
                    {getTypeIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{notif.title}</p>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0" />
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-snug line-clamp-2">
                      {notif.message}
                    </p>

                    <p className="text-[10px] text-slate-400 font-medium">
                      {formatTimeAgo(notif.created_at)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-2 border-t border-slate-100 bg-slate-50/50 text-center shrink-0">
              <span className="text-[10px] font-semibold text-slate-400">
                Timestamps shown in Indian Standard Time (IST)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Mobile Bottom Sheet rendered into document.body to bypass sticky header backdrop-filter */}
      {isOpen &&
        createPortal(
          <div className="md:hidden">
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-50 animate-in fade-in duration-200"
              onClick={() => setIsOpen(false)}
            />
            <div
              ref={mobileSheetRef}
              className="fixed inset-x-3 top-[68px] bottom-3 bg-white rounded-3xl shadow-2xl border border-slate-200/90 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-100 text-brand-700">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      disabled={isMarkingAll}
                      className="text-[11px] font-bold text-brand-600 hover:text-brand-800 disabled:opacity-50 transition cursor-pointer px-2 py-1 rounded-lg hover:bg-brand-50"
                    >
                      {isMarkingAll ? 'Marking...' : 'Mark read'}
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      disabled={isClearingAll}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-800 disabled:opacity-50 transition cursor-pointer px-2 py-1 rounded-lg hover:bg-rose-50"
                    >
                      {isClearingAll ? 'Clearing...' : 'Clear all'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer ml-1"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1">
                {notifications.length === 0 ? (
                  <div className="py-12 px-4 text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
                      🔔
                    </div>
                    <p className="text-xs font-bold text-slate-700">No notifications yet</p>
                    <p className="text-[11px] text-slate-400 max-w-[220px] mx-auto leading-relaxed">
                      You'll be alerted when new lessons are added or when classmates react to your notes & comments!
                    </p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <button
                      key={notif.id}
                      type="button"
                      onClick={() => handleNotificationClick(notif)}
                      className={`w-full text-left p-3 rounded-2xl transition-all flex items-start gap-3 cursor-pointer ${
                        notif.is_read
                          ? 'hover:bg-slate-50 text-slate-700'
                          : 'bg-brand-50/50 hover:bg-brand-50 text-slate-900 font-medium'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-white shadow-2xs border border-slate-200/80 flex items-center justify-center shrink-0 mt-0.5">
                        {getTypeIcon(notif.type)}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-slate-900 truncate">{notif.title}</p>
                          {!notif.is_read && (
                            <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0" />
                          )}
                        </div>

                        <p className="text-xs text-slate-600 leading-snug line-clamp-2">
                          {notif.message}
                        </p>

                        <p className="text-[10px] text-slate-400 font-medium">
                          {formatTimeAgo(notif.created_at)}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-2 border-t border-slate-100 bg-slate-50/50 text-center shrink-0">
                  <span className="text-[10px] font-semibold text-slate-400">
                    Timestamps shown in Indian Standard Time (IST)
                  </span>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
