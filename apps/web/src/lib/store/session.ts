import { create } from "zustand";

const STORAGE_KEY = "codetalk.session";

export interface SessionState {
  token: string | null;
  userId: string | null;
  displayName: string | null;
  githubLogin: string | null;
  setSession: (session: { token: string; userId: string; displayName: string; githubLogin?: string | null }) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  token: null,
  userId: null,
  displayName: null,
  githubLogin: null,
  setSession: ({ token, userId, displayName, githubLogin = null }) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, userId, displayName, githubLogin }));
    set({ token, userId, displayName, githubLogin });
  },
  clearSession: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ token: null, userId: null, displayName: null, githubLogin: null });
  },
}));

export function hydrateSessionFromStorage(): void {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as { token: string; userId: string; displayName: string; githubLogin?: string | null };
    useSessionStore.setState({ ...parsed, githubLogin: parsed.githubLogin ?? null });
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}
