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
    <div className="max-w-sm mx-auto mt-24 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-neutral-900">CodeTalk</h1>
      <Input label="Your name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      {error && <Toast message={error} variant="error" onDismiss={() => setError(null)} />}
      <div className="flex flex-col gap-3">
        <Button onClick={handleCreate} disabled={busy}>
          Create room
        </Button>
        <div className="flex gap-2">
          <Input label="Room code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
          <Button variant="secondary" onClick={handleJoin} disabled={busy}>
            Join
          </Button>
        </div>
      </div>
    </div>
  );
}
