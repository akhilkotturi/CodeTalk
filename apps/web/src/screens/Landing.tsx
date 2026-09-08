import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/shared/Button";
import { Input } from "../components/shared/Input";
import { Toast } from "../components/shared/Toast";
import { issueToken, getIncidentByJoinCode, addMember, joinProject } from "../lib/apiClient";
import { isUuid } from "../lib/identity";
import { useSessionStore } from "../lib/store/session";

export function Landing() {
  const navigate = useNavigate();
  const session = useSessionStore();
  const [displayName, setDisplayName] = useState(session.displayName ?? "");
  const [joinCode, setJoinCode] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function ensureSession(): Promise<{ token: string; userId: string }> {
    if (session.token && isUuid(session.userId)) {
      return { token: session.token, userId: session.userId };
    }
    const trimmed = displayName.trim();
    if (!trimmed) throw new Error("Enter your name first");
    const { token, userId } = await issueToken(trimmed);
    const identity = userId ?? trimmed;
    session.setSession({ token, userId: identity, displayName: trimmed });
    return { token, userId: identity };
  }

  async function handleCreate() {
    setError(null);
    setBusy(true);
    try {
      await ensureSession();
      navigate("/incidents/new");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    setError(null);
    setBusy(true);
    try {
      const { token, userId } = await ensureSession();
      const code = joinCode.trim().toUpperCase();
      if (!code) throw new Error("Enter a room code");
      const incident = await getIncidentByJoinCode(token, code);
      await addMember(token, incident.id, userId);
      navigate(`/incidents/${incident.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Room not found");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateProject() {
    setError(null);
    setBusy(true);
    try {
      await ensureSession();
      navigate("/projects/new");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoinProject() {
    setError(null);
    setBusy(true);
    try {
      const { token } = await ensureSession();
      const project = await joinProject(token, projectCode.trim().toUpperCase());
      navigate(`/projects/${project.id}/overview`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Project not found");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="landing-shell">
      <header className="brand-bar">
        <a className="wordmark" href="/" aria-label="CodeTalk home">
          CodeTalk<span className="wordmark-dot" aria-hidden="true" />
        </a>
        <div className="landing-nav">
          {session.token && isUuid(session.userId) && <Link to="/projects">My projects</Link>}
          {session.token && isUuid(session.userId) && <Link to="/account">Account</Link>}
          <span className="brand-note">Project command center for teams in motion</span>
        </div>
      </header>

      <section className="landing-grid">
        <div className="landing-story">
          <div className="signal-line">
            <span className="signal-pulse" aria-hidden="true" />
            Live when the build is not
          </div>
          <h1>Think clearly<br />under pressure.</h1>
          <p className="landing-lede">
            A shared project space for the plan, tasks, whiteboard, and debug sessions, kept in sync
            while your team ships.
          </p>
          <div className="landing-proof" aria-label="CodeTalk features">
            <span>Planning doc</span>
            <span>Task board</span>
            <span>Whiteboard</span>
          </div>
        </div>

        <div className="access-panel">
          <div className="panel-heading">
            <span>Open a project</span>
            <span className="panel-index">01</span>
          </div>
          <Input
            label="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How your team will see you"
            autoComplete="name"
          />
          {error && <Toast message={error} variant="error" onDismiss={() => setError(null)} />}
          <Button variant="secondary" onClick={handleCreateProject} disabled={busy} className="wide-button">
            Create project
          </Button>
          <div className="join-row">
            <Input
              label="Project code"
              value={projectCode}
              onChange={(e) => setProjectCode(e.target.value)}
              placeholder="PROJECT"
              className="code-input"
              maxLength={12}
            />
            <Button variant="secondary" onClick={handleJoinProject} disabled={busy}>
              Join project
            </Button>
          </div>
          <div className="panel-divider"><span>or open a debug room</span></div>
          <Button onClick={handleCreate} disabled={busy} className="wide-button">
            {busy ? "Opening room…" : "Create room"}
          </Button>
          <div className="panel-divider"><span>or join the response</span></div>
          <div className="join-row">
            <Input
              label="Room code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="ABC123"
              className="code-input"
              maxLength={12}
            />
            <Button variant="secondary" onClick={handleJoin} disabled={busy}>
              Join
            </Button>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <span>No setup. No on-call ceremony.</span>
        <span>One room. One source of truth.</span>
      </footer>
    </main>
  );
}
