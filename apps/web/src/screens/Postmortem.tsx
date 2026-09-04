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

  if (loading) return <p className="text-center mt-24 text-neutral-500">Loading postmortem…</p>;

  if (incident?.status !== "resolved") {
    return (
      <p className="max-w-sm mx-auto mt-24 text-center text-neutral-600">
        Postmortem is available once this incident is resolved.
      </p>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900">{incident.title} — Postmortem</h1>
      <Scrubber max={blocks.length} value={revealedCount} onChange={setRevealedCount} />
      <PlaybackFeed blocks={blocks} revealedCount={revealedCount} />
    </div>
  );
}
