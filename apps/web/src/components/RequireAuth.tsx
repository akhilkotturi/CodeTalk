import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSessionStore } from "../lib/store/session";

export function RequireAuth({ children }: { children: ReactNode }) {
  const token = useSessionStore((state) => state.token);
  if (!token) return <Navigate to="/" replace />;
  return <>{children}</>;
}
