import { create } from "zustand";
import type { BlockEventAction, ClientRole, Incident, IncidentBlock } from "@CodeTalk/types";

export interface BlockEvent {
  userId: string;
  blockId: string;
  action: BlockEventAction;
  data: Record<string, unknown>;
}

export interface RoomMember {
  userId: string;
  role: ClientRole;
}

export interface RoomState {
  incident: Incident | null;
  blocks: IncidentBlock[];
  members: RoomMember[];
  applySnapshot: (incident: Incident | null, blocks: IncidentBlock[]) => void;
  applyBlockEvent: (event: BlockEvent) => void;
  applyUserJoined: (userId: string, role: ClientRole) => void;
  applyUserLeft: (userId: string) => void;
  updateIncident: (patch: Partial<Incident>) => void;
  reset: () => void;
}

const initialState = { incident: null, blocks: [], members: [] };

export const useRoomStore = create<RoomState>((set) => ({
  ...initialState,
  applySnapshot: (incident, blocks) => set({ incident, blocks }),
  applyBlockEvent: (event) =>
    set((state) => {
      if (event.action === "deleted") {
        return { blocks: state.blocks.filter((b) => b.id !== event.blockId) };
      }
      const incoming = event.data as IncidentBlock;
      const index = state.blocks.findIndex((b) => b.id === event.blockId);
      if (index === -1) return { blocks: [...state.blocks, incoming] };
      const blocks = state.blocks.slice();
      blocks[index] = incoming;
      return { blocks };
    }),
  applyUserJoined: (userId, role) =>
    set((state) => ({
      members: state.members.some((m) => m.userId === userId)
        ? state.members
        : [...state.members, { userId, role }],
    })),
  applyUserLeft: (userId) =>
    set((state) => ({ members: state.members.filter((m) => m.userId !== userId) })),
  updateIncident: (patch) =>
    set((state) => ({
      incident: state.incident ? { ...state.incident, ...patch } : state.incident,
    })),
  reset: () => set(initialState),
}));
