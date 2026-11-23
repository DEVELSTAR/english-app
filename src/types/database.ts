// Database Types matching MySQL Schema and API responses

export type UserRole = 0 | 1 | 2; // 0: student, 1: admin, 2: super_admin

export interface User {
  id: number;
  name: string;
  email_address: string;
  role: UserRole;
  profile_icon?: string;
  plain_password?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
  description?: string | null;
  order_index?: number;
  lessons_count?: number;
  created_at?: string;
  updated_at?: string;
}

export type LessonStatus = 0 | 1 | 2; // 0: draft, 1: published, 2: archived
export type LessonType = 0 | 1; // 0: daily_class, 1: foundational_topic

export interface Lesson {
  id: number;
  title: string;
  lesson_date: string;
  topic?: string | null;
  status: LessonStatus;
  author_id?: number | null;
  lesson_type?: LessonType;
  category_id?: number | null;
  category?: Category | null;
  content?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LessonCompletion {
  id: number;
  user_id: number;
  lesson_id: number;
  completed: boolean;
  needs_revision: boolean;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LessonComment {
  id: number;
  lesson_id: number;
  user_id: number;
  parent_id?: number | null;
  content: string;
  reactions: Record<string, number[]>; // { "👍": [userId1, userId2] }
  created_at: string;
  updated_at: string;
  user?: Pick<User, 'id' | 'name' | 'email_address' | 'role' | 'profile_icon'>;
  replies?: LessonComment[];
}

export interface NoteShare {
  id: number;
  note_id: number;
  user_id: number;
  can_edit: boolean;
  status: 0 | 1 | 2; // 0: pending, 1: accepted, 2: declined
  created_at: string;
  updated_at: string;
  user?: Pick<User, 'id' | 'name' | 'email_address' | 'role' | 'profile_icon'>;
  note?: Partial<Note>;
}

export interface Note {
  id: number;
  user_id: number;
  lesson_id?: number | null;
  content: string;
  is_global: boolean;
  reactions: Record<string, number[]>;
  created_at: string;
  updated_at: string;
  lesson_title?: string;
  user?: Pick<User, 'id' | 'name' | 'email_address' | 'role' | 'profile_icon'>;
  lesson?: Pick<Lesson, 'id' | 'title' | 'lesson_type'> | null;
  note_shares?: NoteShare[];
  can_edit?: boolean;
  can_delete?: boolean;
}

export interface LessonChatMessage {
  id: number;
  role: 'user' | 'model' | 'assistant';
  content: string;
  audio_url?: string;
  created_at: string;
}

export interface ActivityRecord {
  id: string;
  user_id: number;
  user_name: string;
  user_email: string;
  user_role: number;
  action: 'signup' | 'login' | 'create' | 'update' | 'destroy' | 'reaction';
  resource_type: 'auth' | 'note' | 'comment' | 'lesson' | 'chat' | 'user' | 'reaction' | 'category';
  resource_id?: string | null;
  resource_title?: string | null;
  details: string;
  created_at: string;
}

export type NotificationType = 'lesson_added' | 'note_reaction' | 'comment_reaction' | 'comment_reply';

export interface AppNotification {
  id: number;
  user_id: number;
  actor_id?: number | null;
  actor_name?: string | null;
  actor_icon?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}
