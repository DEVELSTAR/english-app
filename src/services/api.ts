// API client talking to Express /api backend
const TOKEN_KEY = 'fluentedge_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && !endpoint.includes('/login') && !endpoint.includes('/admin-login')) {
      // Clear token on unauthorized
      setAuthToken(null);
    }
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  register: (name: string, email: string, password: string) =>
    request<{ user: any; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ user: any; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  adminLogin: (email: string, password: string) =>
    request<{ user: any; token: string }>('/api/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: () => request<any>('/api/auth/me'),

  updateProfile: (data: { name?: string; email_address?: string; password?: string; profile_icon?: string }) =>
    request<{ user: any; token: string }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getClassmates: () => request<any[]>('/api/auth/classmates'),

  // Admin: Students CRUD
  getStudents: () => request<any[]>('/api/auth/students'),
  createStudent: (name: string, email: string, password: string) =>
    request<any>('/api/auth/students', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
  updateStudent: (id: number, data: { name?: string; email_address?: string; password?: string }) =>
    request<any>(`/api/auth/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteStudent: (id: number) =>
    request<{ success: boolean }>(`/api/auth/students/${id}`, { method: 'DELETE' }),

  // Super Admin: Admins CRUD
  getAdmins: () => request<any[]>('/api/auth/admins'),
  createAdmin: (name: string, email: string, password: string) =>
    request<any>('/api/auth/admins', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
  updateAdmin: (id: number, data: { name?: string; email_address?: string; password?: string }) =>
    request<any>(`/api/auth/admins/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteAdmin: (id: number) =>
    request<{ success: boolean }>(`/api/auth/admins/${id}`, { method: 'DELETE' }),

  // Categories
  getCategories: () => request<any[]>('/api/categories'),
  createCategory: (data: { name: string; icon?: string; description?: string; order_index?: number }) =>
    request<any>('/api/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (
    id: number,
    data: { name?: string; icon?: string; description?: string; order_index?: number }
  ) => request<any>(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: number) =>
    request<{ success: boolean; message: string }>(`/api/categories/${id}`, { method: 'DELETE' }),

  // Lessons
  getLessons: (options?: {
    category_id?: number;
    category?: string;
    lesson_type?: number;
    status?: number;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (options?.category_id !== undefined) params.append('category_id', String(options.category_id));
    if (options?.category) params.append('category', options.category);
    if (options?.lesson_type !== undefined) params.append('lesson_type', String(options.lesson_type));
    if (options?.status !== undefined) params.append('status', String(options.status));
    if (options?.search) params.append('search', options.search);
    return request<any[]>(`/api/lessons?${params.toString()}`);
  },

  getLessonDetail: (id: string | number) =>
    request<{ lesson: any; previousLesson: any; nextLesson: any }>(`/api/lessons/${id}`),

  createLesson: (data: any) =>
    request<any>('/api/lessons', { method: 'POST', body: JSON.stringify(data) }),

  updateLesson: (id: number, data: any) =>
    request<any>(`/api/lessons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteLesson: (id: number) =>
    request<{ success: boolean }>(`/api/lessons/${id}`, { method: 'DELETE' }),

  // Progress
  getLessonCompletion: (lessonId: number) =>
    request<{ completed: boolean; needs_revision: boolean; completed_at?: string }>(
      `/api/lessons/${lessonId}/completion`
    ),

  toggleLessonCompletion: (lessonId: number, data: { completed?: boolean; needs_revision?: boolean }) =>
    request<{ success: boolean; completed: boolean; needs_revision: boolean; completed_at?: string }>(
      `/api/lessons/${lessonId}/completion`,
      { method: 'POST', body: JSON.stringify(data) }
    ),

  // Comments
  getComments: (lessonId: number) => request<any[]>(`/api/lessons/${lessonId}/comments`),
  postComment: (lessonId: number, content: string, parentId?: number | null) =>
    request<any>(`/api/lessons/${lessonId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parent_id: parentId }),
    }),
  editComment: (lessonId: number, commentId: number, content: string) =>
    request<{ success: boolean }>(`/api/lessons/${lessonId}/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),
  deleteComment: (lessonId: number, commentId: number) =>
    request<{ success: boolean }>(`/api/lessons/${lessonId}/comments/${commentId}`, { method: 'DELETE' }),
  reactToComment: (lessonId: number, commentId: number, emoji: string) =>
    request<{ reactions: Record<string, number[]> }>(`/api/lessons/${lessonId}/comments/${commentId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    }),

  // AI Tutor
  getChatHistory: (lessonId: number) => request<any[]>(`/api/lessons/${lessonId}/chat`),
  clearChatHistory: (lessonId: number) => request<{ success: boolean }>(`/api/lessons/${lessonId}/chat`, { method: 'DELETE' }),
  sendAIChat: (data: { lesson_id?: number; messages: any[]; user_message?: string; audio_data?: any }) =>
    request<{ reply: string; usedModel: string }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Notes
  getNotes: (options?: { filter?: string; lesson_id?: number }) => {
    const params = new URLSearchParams();
    if (options?.filter) params.append('filter', options.filter);
    if (options?.lesson_id) params.append('lesson_id', String(options.lesson_id));
    return request<any[]>(`/api/notes?${params.toString()}`);
  },
  createNote: (data: {
    content: string;
    lesson_id?: number | null;
    is_global?: boolean;
    shared_student_ids?: number[];
    can_edit?: boolean;
  }) => request<{ id: number }>('/api/notes', { method: 'POST', body: JSON.stringify(data) }),

  updateNote: (
    id: number,
    data: {
      content: string;
      is_global?: boolean;
      shared_student_ids?: number[];
      can_edit?: boolean;
    }
  ) => request<{ success: boolean }>(`/api/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteNote: (id: number) => request<{ success: boolean }>(`/api/notes/${id}`, { method: 'DELETE' }),

  getPendingShares: () => request<any[]>('/api/notes/shares/pending'),

  respondToShare: (shareId: number, accept: boolean) =>
    request<{ success: boolean; status: number }>(`/api/notes/shares/${shareId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ accept }),
    }),

  reactToNote: (noteId: number, emoji: string) =>
    request<{ reactions: Record<string, number[]> }>(`/api/notes/${noteId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    }),

  // History
  getHistory: (options?: { user_id?: string; resource_type?: string; action?: string; search?: string }) => {
    const params = new URLSearchParams();
    if (options?.user_id) params.append('user_id', options.user_id);
    if (options?.resource_type) params.append('resource_type', options.resource_type);
    if (options?.action) params.append('action', options.action);
    if (options?.search) params.append('search', options.search);
    return request<any[]>(`/api/history?${params.toString()}`);
  },

  logActivity: (data: {
    action: string;
    resource_type: string;
    resource_id?: string | number;
    resource_title?: string;
    details: string;
  }) => request<{ success: boolean }>('/api/history', { method: 'POST', body: JSON.stringify(data) }),
};
