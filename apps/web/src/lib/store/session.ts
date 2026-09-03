import { create } from "zustand";

const STORAGE_KEY = "codetalk.session";

export interface SessionState {
  token: string | null;
  userId: string | null;
  displayName: string | null;
  setSession: (session: { token: string; userId: string; displayName: string }) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  token: null,
  userId: null,
  displayName: null,
  setSession: ({ token, userId, displayName }) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, userId, displayName }));
    set({ token, userId, displayName });
  },
  clearSession: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ token: null, userId: null, displayName: null });
  },
}));

export function hydrateSessionFromStorage(): void {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as { token: string; userId: string; displayName: string };
    useSessionStore.setState(parsed);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}
