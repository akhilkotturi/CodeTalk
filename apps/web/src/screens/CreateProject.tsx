import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/shared/Button";
import { Input } from "../components/shared/Input";
import { Toast } from "../components/shared/Toast";
import { createProject } from "../lib/apiClient";
import { useSessionStore } from "../lib/store/session";

export function CreateProject() {
  const navigate = useNavigate();
  const token = useSessionStore((state) => state.token)!;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const project = await createProject(token, {
        name,
        description: description || undefined,
      });
      navigate(`/projects/${project.id}/overview`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the project");
      setBusy(false);
    }
  }

  return (
    <main className="form-page">
      <header className="brand-bar compact-bar">
        <a className="wordmark" href="/">CodeTalk<span className="wordmark-dot" aria-hidden="true" /></a>
        <span className="status-label"><span className="signal-pulse" />Project setup</span>
      </header>
      <section className="form-stage">
        <div className="form-intro">
          <span className="step-label">New project</span>
          <h1>Start the<br />command center.</h1>
          <p>Bring the planning doc, task board, whiteboard, and debug sessions into one shared project.</p>
        </div>
        <form onSubmit={handleSubmit} className="incident-form">
          <Input label="Project name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Launch weekend" autoFocus />
          <Input label="Description (optional)" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What your team is trying to ship" />
          {error && <Toast message={error} variant="error" onDismiss={() => setError(null)} />}
          <Button type="submit" disabled={busy} className="wide-button">
            {busy ? "Opening project…" : "Create project"}
          </Button>
          <p className="form-footnote">A private join code is created automatically.</p>
        </form>
      </section>
    </main>
  );
}
