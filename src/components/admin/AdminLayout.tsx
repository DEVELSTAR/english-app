import React from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  BookPlus,
  Users,
  ShieldCheck,
  History,
  FolderTree,
  LogOut,
  Loader2,
} from 'lucide-react';

export default function AdminLayout() {
  const { currentUser, isAdmin, isSuperAdmin, isLoading, logout } = useAuth();
  const location = useLocation();

  // If session is verifying, show admin loading spinner
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3 text-slate-400">
        <div className="w-10 h-10 rounded-2xl bg-brand-500 text-white flex items-center justify-center font-bold text-sm shadow-md animate-pulse">
          FE
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
          <span>Verifying administrator session...</span>
        </div>
      </div>
    );
  }

  // Route protection: if not logged in, go to sign in with return url
  if (!currentUser) {
    return <Navigate to="/auth/sign-in?redirectTo=/admin" replace />;
  }

  // If logged in as student: strictly cannot view admin panel -> redirect to student home
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'New Lesson', path: '/admin/lessons/new', icon: BookPlus },
    { name: 'Categories', path: '/admin/categories', icon: FolderTree },
    { name: 'Students', path: '/admin/students', icon: Users },
    ...(isSuperAdmin ? [{ name: 'Admin Staff', path: '/admin/admins', icon: ShieldCheck }] : []),
    { name: 'Audit Logs', path: '/admin/history', icon: History },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-100/60 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0">
        <div>
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <Link to="/admin" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-500 text-white flex items-center justify-center font-black text-sm shadow-sm">
                FE
              </div>
              <div>
                <span className="font-bold text-white text-sm block">Admin Center</span>
                <span className="text-[10px] text-brand-400 font-mono">
                  {isSuperAdmin ? 'Super Admin' : 'Staff Admin'}
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                    active
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer controls */}
        <div className="p-4 border-t border-slate-800">
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-900/50 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
