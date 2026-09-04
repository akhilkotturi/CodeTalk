import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/shared/Button";
import { Input } from "../components/shared/Input";
import { Toast } from "../components/shared/Toast";
import { issueToken, getIncidentByJoinCode, addMember } from "../lib/apiClient";
import { useSessionStore } from "../lib/store/session";

export function Landing() {
  const navigate = useNavigate();
  const session = useSessionStore();
  const [displayName, setDisplayName] = useState(session.displayName ?? "");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function ensureSession(): Promise<{ token: string; userId: string }> {
    if (session.token && session.userId) return { token: session.token, userId: session.userId };
    const trimmed = displayName.trim();
    if (!trimmed) throw new Error("Enter your name first");
    const { token } = await issueToken(trimmed);
    session.setSession({ token, userId: trimmed, displayName: trimmed });
    return { token, userId: trimmed };
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

  return (
    <main className="landing-shell">
      <header className="brand-bar">
        <a className="wordmark" href="/" aria-label="CodeTalk home">
          CodeTalk<span className="wordmark-dot" aria-hidden="true" />
        </a>
        <span className="brand-note">Incident rooms for teams in motion</span>
      </header>

      <section className="landing-grid">
        <div className="landing-story">
          <div className="signal-line">
            <span className="signal-pulse" aria-hidden="true" />
            Live when the build is not
          </div>
          <h1>Think clearly<br />under pressure.</h1>
          <p className="landing-lede">
            A shared incident room for logs, hypotheses, fixes, and the root cause—kept in sync
            while your team gets back to shipping.
          </p>
          <div className="landing-proof" aria-label="CodeTalk features">
            <span>Live canvas</span>
            <span>Team presence</span>
            <span>Instant postmortem</span>
          </div>
        </div>

        <div className="access-panel">
          <div className="panel-heading">
            <span>Open a room</span>
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
