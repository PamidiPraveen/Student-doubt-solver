import { get, post, remove, request } from "./client";
import type {
  AiMeta,
  Answer,
  AppNotification,
  LibraryDetail,
  LibraryItem,
  LoginResult,
  Page,
  PublicStats,
  Question,
  QuestionStatus,
  Role,
  SimilarSuggestion,
  SubjectSuggestion,
  User,
} from "./types";

export interface PageParams {
  limit?: number;
  offset?: number;
}

async function page<T>(path: string, query: Record<string, string | number | undefined>) {
  const { data, meta } = await request<T[]>(path, { query });
  return {
    items: data,
    total: meta?.total ?? data.length,
    limit: meta?.limit ?? data.length,
    offset: meta?.offset ?? 0,
  } satisfies Page<T>;
}

export const auth = {
  register: (input: { name: string; email: string; password: string; role: Role }) =>
    post<User>("/api/v1/auth/register", input, true),
  login: (input: { email: string; password: string }) =>
    post<LoginResult>("/api/v1/auth/login", input, true),
  me: () => get<User>("/api/v1/auth/me"),
};

export const subjects = {
  list: () => get<string[]>("/api/v1/subjects/"),
};

export interface QuestionFilters extends PageParams {
  /** Only questions the signed-in person asked. */
  mine?: boolean;
  subject?: string;
  status?: QuestionStatus | "";
  q?: string;
}

export const questions = {
  list: ({ mine, ...filters }: QuestionFilters = {}) =>
    page<Question>("/api/v1/questions/", { ...filters, mine: mine ? 1 : undefined }),
  get: (id: number) => get<Question>(`/api/v1/questions/${id}`),
  create: (input: { subject: string; title: string; body: string }) =>
    post<Question>("/api/v1/questions/", input),
  delete: (id: number) =>
    remove<{ deleted: boolean }>(`/api/v1/questions/${id}`),
  close: (id: number) => post<Question>(`/api/v1/questions/${id}/close`),
  publish: (id: number) => post<Question>(`/api/v1/questions/${id}/publish`),
  unpublish: (id: number) => post<Question>(`/api/v1/questions/${id}/unpublish`),
  answers: (id: number) => get<Answer[]>(`/api/v1/questions/${id}/answers`),
  answer: (id: number, body: string) =>
    post<Answer>(`/api/v1/questions/${id}/answers`, { body }),
  deleteAnswer: (questionId: number, answerId: number) =>
    remove<{ deleted: boolean }>(`/api/v1/questions/${questionId}/answers/${answerId}`),
};

export const library = {
  list: (filters: PageParams & { subject?: string; q?: string } = {}) =>
    page<LibraryItem>("/api/v1/library/", { ...filters }),
  get: (id: number) => get<LibraryDetail>(`/api/v1/library/${id}`),
};

export const ai = {
  similar: async (title: string, body: string) => {
    const r = await request<{ suggestions: SimilarSuggestion[] }>(
      "/api/v1/ai/similar",
      { method: "POST", body: { title, body } },
    );
    return { suggestions: r.data.suggestions, meta: r.ai as AiMeta };
  },
  suggestSubject: async (title: string, body: string) => {
    const r = await request<{ suggestions: SubjectSuggestion[] }>(
      "/api/v1/ai/suggest-subject",
      { method: "POST", body: { title, body } },
    );
    return { suggestions: r.data.suggestions, meta: r.ai as AiMeta };
  },
  feedback: (input: {
    feature: "similar_questions" | "subject_suggestion";
    helpful: boolean;
    target_id?: number;
  }) => post<{ recorded: boolean }>("/api/v1/ai/feedback", input),
};

export const notifications = {
  list: async (params: PageParams & { unread?: boolean } = {}) => {
    const { data, meta } = await request<AppNotification[]>("/api/v1/notifications/", {
      query: { limit: params.limit, offset: params.offset, unread: params.unread ? 1 : undefined },
    });
    return {
      items: data,
      total: meta?.total ?? data.length,
      limit: meta?.limit ?? data.length,
      offset: meta?.offset ?? 0,
      unread: meta?.unread ?? 0,
    };
  },
  unreadCount: async () => (await get<{ unread: number }>("/api/v1/notifications/unread-count")).unread,
  markRead: (id: number) => post<AppNotification>(`/api/v1/notifications/${id}/read`),
  markAllRead: () => post<{ unread: number }>("/api/v1/notifications/read-all"),
};

export const stats = {
  get: () => request<PublicStats>("/api/v1/stats/", { anonymous: true }).then((r) => r.data),
};
