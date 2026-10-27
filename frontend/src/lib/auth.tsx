import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { auth as authApi } from "../api/endpoints";
import { setSessionExpiredHandler, setToken } from "../api/client";
import type { User } from "../api/types";

const STORAGE_KEY = "sds.token";

/** sessionStorage survives a refresh but not closing the tab. */
function readStoredToken(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function writeStoredToken(value: string | null) {
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, value);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage can be unavailable (private mode); the session just won't persist */
  }
}

type SessionState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: User };

interface AuthContextValue {
  session: SessionState;
  user: User | null;
  /** Shown once on the login page after a session ends on its own. */
  notice: string | null;
  clearNotice: () => void;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<SessionState>({ status: "loading" });
  const [notice, setNotice] = useState<string | null>(null);
  const started = useRef(false);

  const endSession = useCallback(
    (message?: string) => {
      setToken(null);
      writeStoredToken(null);
      queryClient.clear();
      setSession({ status: "anonymous" });
      setNotice(message ?? null);
    },
    [queryClient],
  );

  useEffect(() => {
    setSessionExpiredHandler(() => endSession("Your session ended. Sign in again."));
    return () => setSessionExpiredHandler(null);
  }, [endSession]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const stored = readStoredToken();
    if (!stored) {
      setSession({ status: "anonymous" });
      return;
    }
    setToken(stored);
    authApi
      .me()
      .then((user) => setSession({ status: "authenticated", user }))
      .catch(() => endSession());
  }, [endSession]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login({ email, password });
    setToken(result.access_token);
    writeStoredToken(result.access_token);
    setNotice(null);
    setSession({ status: "authenticated", user: result.user });
    return result.user;
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const user = await authApi.me();
      setSession({ status: "authenticated", user });
      return user;
    } catch {
      return null;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session.status === "authenticated" ? session.user : null,
      notice,
      clearNotice: () => setNotice(null),
      login,
      logout: () => endSession(),
      refreshUser,
    }),
    [session, notice, login, endSession, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Where a signed-in user belongs. */
export function homePathFor(user: User): string {
  if (user.role === "faculty") return "/faculty";
  return "/app";
}

const AREAS: Record<User["role"], string[]> = {
  student: ["/app", "/doubts", "/questions", "/library", "/notifications", "/profile"],
  faculty: ["/faculty", "/doubts", "/questions", "/library", "/notifications", "/profile"],
};

/** True when `path` is a page this user's role can open. Used to honour "return to" links. */
export function canVisit(user: User, path: string): boolean {
  return AREAS[user.role].some((area) => path === area || path.startsWith(`${area}/`) || path.startsWith(`${area}?`));
}

/** Explicit sign-out: leave the page first so nobody is sent "back" to it by the next sign-in. */
export function useSignOut() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return useCallback(() => {
    navigate("/login", { replace: true, state: null });
    logout();
  }, [logout, navigate]);
}
