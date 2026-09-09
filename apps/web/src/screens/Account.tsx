import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/shared/Button";
import { Toast } from "../components/shared/Toast";
import { listProjects, type Project } from "../lib/apiClient";
import { useSessionStore } from "../lib/store/session";

export function Account() {
  const navigate = useNavigate();
  const token = useSessionStore((state) => state.token)!;
  const userId = useSessionStore((state) => state.userId)!;
  const displayName = useSessionStore((state) => state.displayName) ?? "Guest";
  const githubLogin = useSessionStore((state) => state.githubLogin);
  const clearSession = useSessionStore((state) => state.clearSession);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProjects(token)
      .then(setProjects)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load account projects"));
  }, [token]);

  function signOut() {
    clearSession();
    navigate("/", { replace: true });
  }

  return (
    <main className="room-shell account-shell">
      <header className="room-header">
        <Link className="wordmark wordmark-small" to="/projects">CT<span className="wordmark-dot" aria-hidden="true" /></Link>
        <div className="room-title-group">
          <div className="room-state active"><span className="signal-pulse" />Account</div>
          <h1>{displayName}</h1>
          <p>{userId}</p>
        </div>
        <div className="room-actions">
          <Link className="button button-secondary" to="/projects">Projects</Link>
          <Button variant="danger" onClick={signOut}>Sign out</Button>
        </div>
      </header>

      {error && <div className="room-alert"><Toast message={error} variant="error" onDismiss={() => setError(null)} /></div>}
      <section className="account-grid">
        <div className="account-panel">
          <span className="step-label">Session</span>
          <dl className="account-details">
            <div><dt>Name</dt><dd>{displayName}</dd></div>
            <div><dt>User ID</dt><dd>{userId}</dd></div>
            {githubLogin && <div><dt>GitHub</dt><dd>@{githubLogin}</dd></div>}
            <div><dt>Auth</dt><dd>{githubLogin ? "GitHub" : "Local development token"}</dd></div>
          </dl>
        </div>
        <div className="account-panel">
          <span className="step-label">Active projects</span>
          <div className="account-project-list">
            {projects.map((project) => (
              <Link key={project.id} className="account-project-row" to={`/projects/${project.id}/overview`}>
                <strong>{project.name}</strong>
                <span>{project.role}</span>
              </Link>
            ))}
            {projects.length === 0 && <p>No active projects yet.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
