import { create } from "zustand";

export interface CursorPosition {
  x: number;
  y: number;
}

export interface CursorsState {
  positions: Record<string, CursorPosition>;
  setCursor: (userId: string, x: number, y: number) => void;
  removeCursor: (userId: string) => void;
  reset: () => void;
}

export const useCursorsStore = create<CursorsState>((set) => ({
  positions: {},
  setCursor: (userId, x, y) =>
    set((state) => ({ positions: { ...state.positions, [userId]: { x, y } } })),
  removeCursor: (userId) =>
    set((state) => {
      const { [userId]: _removed, ...rest } = state.positions;
      return { positions: rest };
    }),
  reset: () => set({ positions: {} }),
}));
