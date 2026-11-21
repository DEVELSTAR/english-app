import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/database';
import { api, setAuthToken, getAuthToken } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isStudent: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  adminLogin: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  updateProfile: (data: { name?: string; email_address?: string; password?: string; profile_icon?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  // Student Management (Admin)
  fetchStudents: () => Promise<User[]>;
  createStudent: (name: string, email: string, password: string) => Promise<User>;
  updateStudent: (id: number, data: { name?: string; email_address?: string; password?: string }) => Promise<User>;
  deleteStudent: (id: number) => Promise<void>;
  // Staff Admin Management (Super Admin)
  fetchAdmins: () => Promise<User[]>;
  createAdmin: (name: string, email: string, password: string) => Promise<User>;
  updateAdmin: (id: number, data: { name?: string; email_address?: string; password?: string }) => Promise<User>;
  deleteAdmin: (id: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session
  useEffect(() => {
    async function initAuth() {
      const token = getAuthToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const user = await api.getMe();
        setCurrentUser(user);
      } catch (e) {
        setAuthToken(null);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.login(email, password);
      setAuthToken(res.token);
      setCurrentUser(res.user);
      api.logActivity({
        action: 'login',
        resource_type: 'auth',
        details: res.user.role >= 1 ? 'Administrator signed in' : 'Student signed in',
      }).catch(() => {});
      return { success: true, user: res.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const adminLogin = async (email: string, password: string) => {
    try {
      const res = await api.adminLogin(email, password);
      setAuthToken(res.token);
      setCurrentUser(res.user);
      api.logActivity({
        action: 'login',
        resource_type: 'auth',
        details: 'Administrator logged into admin portal',
      }).catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Admin login failed' };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const res = await api.register(name, email, password);
      setAuthToken(res.token);
      setCurrentUser(res.user);
      api.logActivity({
        action: 'signup',
        resource_type: 'auth',
        details: 'New student self-registered account',
      }).catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const updateProfile = async (data: { name?: string; email_address?: string; password?: string; profile_icon?: string }) => {
    try {
      const res = await api.updateProfile(data);
      setAuthToken(res.token);
      setCurrentUser(res.user);
      api.logActivity({
        action: 'update',
        resource_type: 'user',
        details: 'User updated their personal profile settings',
      }).catch(() => {});
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Profile update failed' };
    }
  };

  const logout = () => {
    setAuthToken(null);
    setCurrentUser(null);
  };

  // Student CRUD (Admin)
  const fetchStudents = async () => api.getStudents();
  const createStudent = async (name: string, email: string, pass: string) => api.createStudent(name, email, pass);
  const updateStudent = async (id: number, data: any) => api.updateStudent(id, data);
  const deleteStudent = async (id: number) => {
    await api.deleteStudent(id);
  };

  // Admin CRUD (Super Admin)
  const fetchAdmins = async () => api.getAdmins();
  const createAdmin = async (name: string, email: string, pass: string) => api.createAdmin(name, email, pass);
  const updateAdmin = async (id: number, data: any) => api.updateAdmin(id, data);
  const deleteAdmin = async (id: number) => {
    await api.deleteAdmin(id);
  };

  const isStudent = currentUser?.role === 0;
  const isAdmin = currentUser?.role === 1 || currentUser?.role === 2;
  const isSuperAdmin = currentUser?.role === 2;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        isStudent,
        isAdmin,
        isSuperAdmin,
        login,
        adminLogin,
        register,
        updateProfile,
        logout,
        fetchStudents,
        createStudent,
        updateStudent,
        deleteStudent,
        fetchAdmins,
        createAdmin,
        updateAdmin,
        deleteAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
