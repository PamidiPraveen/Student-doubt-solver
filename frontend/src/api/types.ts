/** What a person chooses when they register. */
export type Role = "student" | "faculty";

export type QuestionStatus = "open" | "answered" | "closed";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface LoginResult {
  access_token: string;
  token_type: "Bearer";
  user: User;
}

export interface Question {
  id: number;
  student_id: number;
  student_name: string | null;
  subject: string;
  title: string;
  body: string;
  status: QuestionStatus;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  answer_count?: number;
}

export interface Answer {
  id: number;
  question_id: number;
  author_id: number;
  author_name: string | null;
  author_role: Role;
  body: string;
  created_at: string;
}

export interface LibraryItem {
  id: number;
  subject: string;
  title: string;
  body: string;
  published_at: string | null;
  answer_count: number;
}

export interface LibraryDetail extends LibraryItem {
  answers: Array<{
    id: number;
    body: string;
    /** Student answers are anonymous in the library, so the name is null. */
    author_name: string | null;
    author_role: Role;
    created_at: string;
  }>;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface AiMeta {
  label: string;
  engine: string;
  note: string;
  enabled: boolean;
  feature?: string;
}

export interface SimilarSuggestion {
  id: number;
  title: string;
  subject: string;
  snippet: string;
  answer_count: number;
  score: number;
}

export interface SubjectSuggestion {
  subject: string;
  confidence: number;
}

export interface AppNotification {
  id: number;
  kind: "content_blocked" | "new_answer" | string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface PublicStats {
  questions: number;
  answers: number;
  faculty: number;
  students: number;
}
