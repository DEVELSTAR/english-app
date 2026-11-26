import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { Loader2 } from 'lucide-react';

// Student Pages
import HomePage from './pages/HomePage';
import LessonsPage from './pages/LessonsPage';
import TopicsPage from './pages/TopicsPage';
import LessonDetailPage from './pages/LessonDetailPage';
import NotesPage from './pages/NotesPage';
import ProfilePage from './pages/ProfilePage';
import LeaderboardPage from './pages/LeaderboardPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';

// Admin Pages
import AdminLayout from './components/admin/AdminLayout';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage';
import NewLessonPage from './pages/admin/NewLessonPage';
import EditLessonPage from './pages/admin/EditLessonPage';
import AdminStudentsPage from './pages/admin/AdminStudentsPage';
import AdminStudentProgressPage from './pages/admin/AdminStudentProgressPage';
import AdminAdminsPage from './pages/admin/AdminAdminsPage';
import AdminHistoryPage from './pages/admin/AdminHistoryPage';

// Route Guard for authenticated students
function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { currentUser, isAdmin, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center space-y-3 text-slate-500">
        <div className="w-10 h-10 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-bold text-sm shadow-md animate-pulse">
          FE
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
          <span>Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth/sign-in?redirectTo=${returnUrl}`} replace />;
  }

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

function ScrollToTop() {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-brand-500 selection:text-white">
      <ScrollToTop />

      <div>
        {!isAdminRoute && <Navbar />}

        <Routes>
          {/* Public & Student Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/auth/sign-in" element={<SignInPage />} />
          <Route path="/auth/sign-up" element={<SignUpPage />} />

          <Route
            path="/lessons"
            element={
              <ProtectedRoute>
                <LessonsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/topics"
            element={
              <ProtectedRoute>
                <TopicsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/:id"
            element={
              <ProtectedRoute>
                <LessonDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/topics/:id"
            element={
              <ProtectedRoute>
                <LessonDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes"
            element={
              <ProtectedRoute>
                <NotesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <LeaderboardPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Dedicated Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="login" element={<Navigate to="/auth/sign-in?redirectTo=/admin" replace />} />
            <Route index element={<AdminDashboardPage />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="lessons/new" element={<NewLessonPage />} />
            <Route path="lessons/:id/edit" element={<EditLessonPage />} />
            <Route path="students" element={<AdminStudentsPage />} />
            <Route path="progress" element={<AdminStudentProgressPage />} />
            <Route path="admins" element={<AdminAdminsPage />} />
            <Route path="history" element={<AdminHistoryPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {!isAdminRoute && <Footer />}
    </div>
  );
}
