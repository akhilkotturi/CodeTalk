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
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto mt-24 flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900">New incident</h1>
      <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input
        label="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      {error && <Toast message={error} variant="error" onDismiss={() => setError(null)} />}
      <Button type="submit" disabled={busy}>
        Start incident
      </Button>
    </form>
  );
}
