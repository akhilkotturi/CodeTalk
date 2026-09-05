import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { RoomCodeBadge } from "../components/shared/RoomCodeBadge";
import { Toast } from "../components/shared/Toast";
import { getProject, type Project } from "../lib/apiClient";
import { useSessionStore } from "../lib/store/session";

export function ProjectOverview() {
  const { id } = useParams<{ id: string }>();
  const token = useSessionStore((state) => state.token)!;
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getProject(token, id).then(setProject).catch((err) => setError(err instanceof Error ? err.message : "Could not load the project"));
  }, [id, token]);

  if (error) return <main className="center-state"><Toast message={error} variant="error" onDismiss={() => setError(null)} /></main>;
  if (!project) return <main className="center-state"><div className="loading-line" /><p>Loading project…</p></main>;

  return (
    <main className="room-shell project-shell">
      <header className="room-header">
        <a className="wordmark wordmark-small" href="/">CT<span className="wordmark-dot" aria-hidden="true" /></a>
        <div className="room-title-group">
          <div className="room-state active"><span className="signal-pulse" />Project command center</div>
          <h1>{project.name}</h1>
          {project.description && <p>{project.description}</p>}
        </div>
        <div className="room-actions"><RoomCodeBadge code={project.joinCode} /></div>
      </header>
      <section className="project-overview-grid">
        <div className="project-overview-intro">
          <span className="step-label">Overview</span>
          <h2>Keep the whole build<br />in view.</h2>
          <p>Project surfaces will gather the plan, tasks, shared whiteboard, GitHub activity, and debug sessions here.</p>
        </div>
        <nav className="project-surface-list" aria-label="Project surfaces">
          <div className="project-surface-row"><span>01</span><strong>Plan</strong><em>Next phase</em></div>
          <Link className="project-surface-row" to={`/projects/${project.id}/tasks`}><span>02</span><strong>Tasks</strong><em>Open board</em></Link>
          <div className="project-surface-row"><span>03</span><strong>Whiteboard</strong><em>Next phase</em></div>
          <div className="project-surface-row"><span>04</span><strong>GitHub</strong><em>Next phase</em></div>
        </nav>
      </section>
      <div className="project-legacy-link"><Link to="/incidents/new">Open a debug session</Link><span>Uses the existing incident workflow</span></div>
    </main>
  );
}