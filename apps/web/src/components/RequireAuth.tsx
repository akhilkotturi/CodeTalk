import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { isUuid } from "../lib/identity";
import { useSessionStore } from "../lib/store/session";

export function RequireAuth({ children }: { children: ReactNode }) {
  const token = useSessionStore((state) => state.token);
  const userId = useSessionStore((state) => state.userId);
  if (!token || !isUuid(userId)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
