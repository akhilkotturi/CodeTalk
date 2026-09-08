import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { ProjectTask, TaskStatus } from "@CodeTalk/types";
import { Button } from "../components/shared/Button";
import { Input } from "../components/shared/Input";
import { Toast } from "../components/shared/Toast";
import { createTask, deleteTask, getProject, listTasks, updateTask, type Project } from "../lib/apiClient";
import { useSessionStore } from "../lib/store/session";
import { useTaskStore } from "../lib/store/tasks";
import * as wsClient from "../lib/wsClient";

const COLUMNS: Array<{ status: TaskStatus; label: string }> = [
  { status: "backlog", label: "Backlog" },
  { status: "doing", label: "Doing" },
  { status: "blocked", label: "Blocked" },
  { status: "done", label: "Done" },
];

export function TaskBoard() {
  const { id } = useParams<{ id: string }>();
  const token = useSessionStore((state) => state.token)!;
  const tasks = useTaskStore((state) => state.tasks);
  const setTasks = useTaskStore((state) => state.setTasks);
  const applyEvent = useTaskStore((state) => state.applyEvent);
  const [project, setProject] = useState<Project | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([getProject(token, id), listTasks(token, id)])
      .then(([loadedProject, loadedTasks]) => {
        setProject(loadedProject);
        setTasks(loadedTasks);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load the task board"));
    wsClient.connect({ role: "project_editor", token, projectId: id });
    return () => {
      wsClient.disconnect();
      useTaskStore.getState().reset();
    };
  }, [id, token, setTasks]);

  async function addTask() {
    if (!id || !title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const task = await createTask(token, id, { title });
      applyEvent({ taskId: task.id, action: "created", data: task as unknown as Record<string, unknown> });
      wsClient.sendTaskEvent(task.id, "created", task as unknown as Record<string, unknown>);
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create task");
    } finally {
      setBusy(false);
    }
  }

  async function moveTask(task: ProjectTask, status: TaskStatus) {
    if (!id || status === task.status) return;
    try {
      const updated = await updateTask(token, id, task.id, { status });
      applyEvent({ taskId: updated.id, action: "updated", data: updated as unknown as Record<string, unknown> });
      wsClient.sendTaskEvent(updated.id, "updated", updated as unknown as Record<string, unknown>);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not move task");
    }
  }

  async function removeTask(task: ProjectTask) {
    if (!id) return;
    try {
      await deleteTask(token, id, task.id);
      applyEvent({ taskId: task.id, action: "deleted", data: {} });
      wsClient.sendTaskEvent(task.id, "deleted", {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete task");
    }
  }

  if (error && !project) return <main className="center-state"><Toast message={error} variant="error" onDismiss={() => setError(null)} /></main>;
  if (!project) return <main className="center-state"><div className="loading-line" /><p>Loading task board…</p></main>;

  return (
    <main className="room-shell project-shell">
      <header className="room-header">
        <Link className="wordmark wordmark-small" to={`/projects/${project.id}/overview`}>CT<span className="wordmark-dot" aria-hidden="true" /></Link>
        <div className="room-title-group">
          <div className="room-state active"><span className="signal-pulse" />Project tasks</div>
          <h1>{project.name}</h1>
          <p>Turn the next move into something visible.</p>
        </div>
        <div className="room-actions">
          <Link className="button button-secondary" to={`/projects/${project.id}/overview`}>Overview</Link>
          <Link className="button button-secondary" to={`/projects/${project.id}/plan`}>Plan</Link>
          <Link className="button button-secondary" to={`/projects/${project.id}/whiteboard`}>Whiteboard</Link>
        </div>
      </header>
      <section className="task-composer">
        <Input label="New task" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Write the next concrete move" />
        <Button onClick={addTask} disabled={busy || !title.trim()}>{busy ? "Adding…" : "Add task"}</Button>
      </section>
      {error && <div className="room-alert"><Toast message={error} variant="error" onDismiss={() => setError(null)} /></div>}
      <section className="task-grid" aria-label="Task board">
        {COLUMNS.map((column) => {
          const columnTasks = tasks.filter((task) => task.status === column.status);
          return (
            <section className="task-column" key={column.status} data-task-status={column.status}>
              <header className="task-column-head"><h2>{column.label}</h2><span>{columnTasks.length.toString().padStart(2, "0")}</span></header>
              <div className="task-column-body">
                {columnTasks.map((task) => (
                  <article className="task-card" key={task.id}>
                    <p>{task.title}</p>
                    <div className="task-card-actions">
                      {COLUMNS.filter((option) => option.status !== task.status).map((option) => (
                        <button key={option.status} className="text-button" onClick={() => moveTask(task, option.status)}>{option.label}</button>
                      ))}
                      <button className="text-button delete-action" onClick={() => removeTask(task)}>Delete</button>
                    </div>
                  </article>
                ))}
                {columnTasks.length === 0 && <p className="column-empty">Nothing here yet.</p>}
              </div>
            </section>
          );
        })}
      </section>
    </main>
  );
}
