import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/shared/Button";
import { Input } from "../components/shared/Input";
import { Toast } from "../components/shared/Toast";
import { createIncident } from "../lib/apiClient";
import { useSessionStore } from "../lib/store/session";

export function CreateIncident() {
  const navigate = useNavigate();
  const token = useSessionStore((state) => state.token)!;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const incident = await createIncident(token, {
        title,
        description: description || undefined,
      });
      navigate(`/incidents/${incident.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the room");
      setBusy(false);
    }
  }

  return (
    <main className="form-page">
      <header className="brand-bar compact-bar">
        <a className="wordmark" href="/">CodeTalk<span className="wordmark-dot" aria-hidden="true" /></a>
        <span className="status-label"><span className="signal-pulse" />Ready</span>
      </header>
      <section className="form-stage">
        <div className="form-intro">
          <span className="step-label">New incident</span>
          <h1>Name what<br />is breaking.</h1>
          <p>Keep it plain. Your team can add evidence, theories, and attempts once the room opens.</p>
        </div>
        <form onSubmit={handleSubmit} className="incident-form">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Checkout API returning 500s"
            autoFocus
          />
          <Input
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What changed, what is affected, what you know so far"
          />
          {error && <Toast message={error} variant="error" onDismiss={() => setError(null)} />}
          <Button type="submit" disabled={busy} className="wide-button">
            {busy ? "Starting incident…" : "Start incident"}
          </Button>
          <p className="form-footnote">A share code is created automatically.</p>
        </form>
      </section>
    </main>
  );
}
