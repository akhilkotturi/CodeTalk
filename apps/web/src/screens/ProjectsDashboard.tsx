import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Toast } from "../components/shared/Toast";
import { deleteProject, listProjects, type Project } from "../lib/apiClient";
import { useSessionStore } from "../lib/store/session";

export function ProjectsDashboard() {
  const token = useSessionStore((state) => state.token)!;
  const displayName = useSessionStore((state) => state.displayName) ?? "Guest";
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  useEffect(() => {
    listProjects(token)
      .then(setProjects)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load projects"))
      .finally(() => setLoaded(true));
  }, [token]);

  async function handleDeleteProject(project: Project): Promise<void> {
    const confirmed = window.confirm(`Delete "${project.name}"? This removes the project for everyone.`);
    if (!confirmed) return;

    setDeletingProjectId(project.id);
    try {
      await deleteProject(token, project.id);
      setProjects((currentProjects) => currentProjects.filter((currentProject) => currentProject.id !== project.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete project");
    } finally {
      setDeletingProjectId(null);
    }
  }

  return (
    <main className="room-shell project-shell">
      <header className="room-header">
        <Link className="wordmark wordmark-small" to="/">CT<span className="wordmark-dot" aria-hidden="true" /></Link>
        <div className="room-title-group">
          <div className="room-state active"><span className="signal-pulse" />Active projects</div>
          <h1>Your command centers</h1>
          <p>{displayName}</p>
        </div>
        <div className="room-actions">
          <Link className="button button-secondary" to="/account">Account</Link>
          <Link className="button button-primary" to="/projects/new">New project</Link>
        </div>
      </header>

      {error && <div className="room-alert"><Toast message={error} variant="error" onDismiss={() => setError(null)} /></div>}
      {!loaded && <main className="center-state"><div className="loading-line" /><p>Loading projects...</p></main>}
      {loaded && projects.length === 0 && (
        <section className="project-empty-state">
          <span className="step-label">No active projects</span>
          <h2>Start a command center.</h2>
          <p>Create a project or join one with a project code from your team.</p>
          <Link className="button button-primary" to="/projects/new">Create project</Link>
        </section>
      )}
      {loaded && projects.length > 0 && (
        <section className="project-list" aria-label="Active projects">
          {projects.map((project) => (
            <article className="project-card" key={project.id}>
              <div>
                <span className="step-label">{project.role}</span>
                <h2>{project.name}</h2>
                {project.description && <p>{project.description}</p>}
              </div>
              <nav className="project-card-actions" aria-label={`${project.name} surfaces`}>
                <Link className="button button-secondary" to={`/projects/${project.id}/overview`}>Overview</Link>
                <Link className="button button-secondary" to={`/projects/${project.id}/plan`}>Plan</Link>
                <Link className="button button-secondary" to={`/projects/${project.id}/whiteboard`}>Whiteboard</Link>
                <Link className="button button-secondary" to={`/projects/${project.id}/tasks`}>Tasks</Link>
                {project.role === "owner" && (
                  <button className="button button-danger" type="button" disabled={deletingProjectId === project.id} onClick={() => void handleDeleteProject(project)}>
                    {deletingProjectId === project.id ? "Deleting…" : "Delete project"}
                  </button>
                )}
              </nav>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
