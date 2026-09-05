import { create } from "zustand";
import type { ProjectTask, TaskEventAction } from "@CodeTalk/types";

interface TaskEvent {
  taskId: string;
  action: TaskEventAction;
  data: Record<string, unknown>;
}

interface TaskState {
  tasks: ProjectTask[];
  setTasks: (tasks: ProjectTask[]) => void;
  applyEvent: (event: TaskEvent) => void;
  reset: () => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  applyEvent: (event) => set((state) => {
    if (event.action === "deleted") return { tasks: state.tasks.filter((task) => task.id !== event.taskId) };
    const incoming = event.data as unknown as ProjectTask;
    const index = state.tasks.findIndex((task) => task.id === event.taskId);
    if (index === -1) return { tasks: [...state.tasks, incoming] };
    const tasks = state.tasks.slice();
    tasks[index] = incoming;
    return { tasks };
  }),
  reset: () => set({ tasks: [] }),
}));