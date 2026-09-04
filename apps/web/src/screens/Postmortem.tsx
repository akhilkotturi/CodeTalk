import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { Incident, IncidentBlock } from "@CodeTalk/types";
import { Scrubber } from "../components/postmortem/Scrubber";
import { PlaybackFeed } from "../components/postmortem/PlaybackFeed";
import { getIncident, listBlocks } from "../lib/apiClient";
import { useSessionStore } from "../lib/store/session";

export function Postmortem() {
  const { id: incidentId } = useParams<{ id: string }>();
  const token = useSessionStore((state) => state.token)!;
  const [incident, setIncident] = useState<Incident | null>(null);
  const [blocks, setBlocks] = useState<IncidentBlock[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!incidentId) return;
    Promise.all([getIncident(token, incidentId), listBlocks(token, incidentId)]).then(
      ([fetchedIncident, fetchedBlocks]) => {
        setIncident(fetchedIncident);
        setBlocks(fetchedBlocks);
        setRevealedCount(fetchedBlocks.length);
        setLoading(false);
      }
    );
  }, [incidentId, token]);

  if (loading) return <main className="center-state"><span className="loading-line" />Loading postmortem…</main>;

  if (incident?.status !== "resolved") {
    return (
      <main className="center-state">
        <a className="wordmark" href="/">CodeTalk<span className="wordmark-dot" aria-hidden="true" /></a>
        <h1>The story is still being written.</h1>
        <p>Postmortem is available once this incident is resolved.</p>
      </main>
    );
  }

  return (
    <main className="room-shell postmortem-shell">
      <header className="room-header">
        <a className="wordmark wordmark-small" href="/">CT<span className="wordmark-dot resolved-dot" aria-hidden="true" /></a>
        <div className="room-title-group">
          <div className="room-state resolved">Resolved · postmortem</div>
          <h1>{incident.title}</h1>
          <p>Replay the room from first signal to root cause.</p>
        </div>
        <div className="room-actions"><span className="event-total">{blocks.length} events</span></div>
      </header>
      <div className="timeline-panel">
        <Scrubber max={blocks.length} value={revealedCount} onChange={setRevealedCount} />
      </div>
      <PlaybackFeed blocks={blocks} revealedCount={revealedCount} />
    </main>
  );
}
