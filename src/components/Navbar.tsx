import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProfileIconMeta } from '../lib/profileIcons';
import NotificationBell from './notifications/NotificationBell';
import {
  FileText,
  User,
  LogOut,
  X,
  ChevronDown,
  ChevronRight,
  Sparkles,
  LogIn,
  UserPlus,
  Trophy,
} from 'lucide-react';

export default function Navbar() {
  const { currentUser, isStudent, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  // Prevent background scrolling when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  const iconMeta = getProfileIconMeta(currentUser?.profile_icon);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center font-black text-base sm:text-lg shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              FE
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg leading-tight group-hover:text-brand-600 transition-colors">
                Fluent<span className="text-brand-600">Edge</span>
              </span>
              <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none">
                English Academy
              </span>
            </div>
          </Link>

          {/* Desktop Right Header: Profile / Auth Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isStudent && (
              <Link
                to="/leaderboard"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                  location.pathname === '/leaderboard'
                    ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:text-amber-700'
                }`}
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>Leaderboard</span>
              </Link>
            )}

            {/* Notification bell for students only (admins don't need notifications) */}
            {isStudent && <NotificationBell />}

            {currentUser ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/70 border border-slate-200 transition-colors cursor-pointer"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${iconMeta.color}`}
                  >
                    {iconMeta.emoji}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-800 leading-tight max-w-[120px] truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-[10px] font-medium text-slate-400 leading-none">
                      {currentUser.role === 2 ? 'Super Admin' : currentUser.role === 1 ? 'Admin' : 'Student'}
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Desktop Profile Dropdown */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{currentUser.email_address}</p>
                    </div>

                    {isStudent && (
                      <>
                        <Link
                          to="/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition"
                        >
                          <User className="w-4 h-4 text-slate-400" />
                          <span>Profile & Settings</span>
                        </Link>
                        <Link
                          to="/notes"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition"
                        >
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span>My Study Notes</span>
                        </Link>
                      </>
                    )}

                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-brand-700 hover:bg-brand-50 transition"
                      >
                        <User className="w-4 h-4 text-brand-600" />
                        <span>Admin Console</span>
                      </Link>
                    )}

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/auth/sign-in"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-brand-600 hover:bg-slate-100 transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth/sign-up"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 text-white shadow-sm shadow-brand-500/20 hover:bg-brand-700 hover:shadow-brand-500/30 transition"
                >
                  Join Free
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Action: Notification Bell (for students) & Profile Avatar */}
          <div className="flex md:hidden items-center gap-2">
            {isStudent && <NotificationBell />}

            {currentUser ? (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-base shadow-xs border border-slate-200 cursor-pointer active:scale-95 transition-transform ${iconMeta.color}`}
                aria-label="Open profile menu"
              >
                {iconMeta.emoji}
              </button>
            ) : (
              <Link
                to="/auth/sign-in"
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-brand-600 text-white shadow-xs hover:bg-brand-700 transition"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Modern Mobile Slide-Over Drawer with Backdrop                */}
      {/* ============================================================ */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-in Drawer Container */}
          <div className="relative w-[86vw] max-w-sm h-dvh bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300 ease-out">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  FE
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 leading-tight">FluentEdge</h4>
                  <p className="text-[10px] text-slate-400 font-medium">English Academy</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body (Scrollable Profile Actions) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {currentUser ? (
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-brand-50/80 via-white to-indigo-50/50 border border-brand-100/80 shadow-2xs space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-xs shrink-0 ${iconMeta.color}`}
                    >
                      {iconMeta.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-black text-slate-900 truncate">{currentUser.name}</p>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-brand-100 text-brand-700 rounded-md">
                          {currentUser.role === 2 ? 'Super Admin' : currentUser.role === 1 ? 'Admin' : 'Student'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5 font-mono">{currentUser.email_address}</p>
                    </div>
                  </div>

                  {isStudent && (
                    <div className="space-y-1.5 pt-1">
                      <Link
                        to="/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full py-2 px-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:border-brand-300 hover:text-brand-600 transition flex items-center justify-between shadow-2xs"
                      >
                        <span className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-brand-600" />
                          <span>Profile & Settings</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </Link>

                      <Link
                        to="/notes"
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full py-2 px-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:border-brand-300 hover:text-brand-600 transition flex items-center justify-between shadow-2xs"
                      >
                        <span className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-brand-600" />
                          <span>My Study Notes</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </Link>

                      <Link
                        to="/leaderboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full py-2 px-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:border-amber-300 hover:text-amber-700 transition flex items-center justify-between shadow-2xs"
                      >
                        <span className="flex items-center gap-2">
                          <Trophy className="w-3.5 h-3.5 text-amber-500" />
                          <span>Class Leaderboard</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </Link>
                    </div>
                  )}

                  {isAdmin && (
                    <div className="pt-1">
                      <Link
                        to="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full py-2 px-3 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 transition flex items-center justify-between shadow-2xs"
                      >
                        <span className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5" />
                          <span>Admin Console</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-white/70" />
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-600 text-white space-y-3 shadow-md shadow-brand-500/20">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-100">Join FluentEdge</span>
                  </div>
                  <p className="text-xs text-brand-50 leading-relaxed font-medium">
                    Sign in to track completed lessons, save practice notes, and ask Akib Sir questions!
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Link
                      to="/auth/sign-in"
                      onClick={() => setMobileMenuOpen(false)}
                      className="py-2 px-3 text-center rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition flex items-center justify-center gap-1"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In</span>
                    </Link>
                    <Link
                      to="/auth/sign-up"
                      onClick={() => setMobileMenuOpen(false)}
                      className="py-2 px-3 text-center rounded-xl bg-white text-brand-700 text-xs font-black shadow-xs hover:bg-brand-50 transition flex items-center justify-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Join Free</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0 space-y-3">
              {currentUser && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-rose-600 bg-rose-50/80 hover:bg-rose-100 border border-rose-200/60 transition cursor-pointer shadow-2xs"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              )}

              <div className="text-center">
                <span className="text-[11px] font-bold text-slate-400 tracking-wider">AkibWorks</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
