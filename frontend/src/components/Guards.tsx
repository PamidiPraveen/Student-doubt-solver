import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Role } from "../api/types";
import { homePathFor, useAuth } from "../lib/auth";
import { FullPageSpinner } from "./ui";

/** Navigation convenience only. The server enforces every rule. */
export function RequireSession({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const location = useLocation();

  if (session.status === "loading") return <FullPageSpinner />;
  if (session.status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}

export function RequireRole({
  roles,
  children,
}: {
  roles?: Role[];
  children: ReactNode;
}) {
  const { user } = useAuth();
  if (!user) return null; // RequireSession wraps this and handles it
  if (roles && !roles.includes(user.role)) return <Navigate to="/forbidden" replace />;
  return <>{children}</>;
}

/** Login and register pages are not for people already signed in. */
export function PublicOnly({ children }: { children: ReactNode }) {
  const { session, user } = useAuth();
  if (session.status === "loading") return <FullPageSpinner />;
  if (user) return <Navigate to={homePathFor(user)} replace />;
  return <>{children}</>;
}
