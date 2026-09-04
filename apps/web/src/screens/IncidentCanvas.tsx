import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { BlockType } from "@CodeTalk/types";
import { BlockFeed } from "../components/canvas/BlockFeed";
import { PresenceList } from "../components/presence/PresenceList";
import { CursorOverlay } from "../components/presence/CursorOverlay";
import { RoomCodeBadge } from "../components/shared/RoomCodeBadge";
import { ReconnectBanner } from "../components/shared/ReconnectBanner";
import { Button } from "../components/shared/Button";
import { Toast } from "../components/shared/Toast";
import { useRoomStore } from "../lib/store/room";
import { useCursorsStore } from "../lib/store/cursors";
import { useSessionStore } from "../lib/store/session";
import * as wsClient from "../lib/wsClient";
import { createBlock, updateBlock, deleteBlock, resolveIncident } from "../lib/apiClient";

export function IncidentCanvas() {
  const { id: incidentId } = useParams<{ id: string }>();
  const token = useSessionStore((state) => state.token)!;
  const userId = useSessionStore((state) => state.userId)!;
  const incident = useRoomStore((state) => state.incident);
  const blocks = useRoomStore((state) => state.blocks);
  const members = useRoomStore((state) => state.members);
  const [reconnecting, setReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!incidentId) return;
    wsClient.connect(
      { role: "editor", token, incidentId },
      {
        onOpen: () => setReconnecting(false),
        onReconnecting: () => setReconnecting(true),
      }
    );
    return () => {
      wsClient.disconnect();
      useRoomStore.getState().reset();
      useCursorsStore.getState().reset();
    };
  }, [incidentId, token]);

  async function handleCreate(input: { blockType: BlockType; body: string; subject?: string }) {
    const block = await createBlock(token, incidentId!, input);
    const data = block as unknown as Record<string, unknown>;
    useRoomStore
      .getState()
      .applyBlockEvent({ userId, blockId: block.id, action: "created", data });
    wsClient.sendBlockEvent(block.id, "created", data);
  }

  async function handleEdit(blockId: string, patch: { body?: string; subject?: string }) {
    const block = await updateBlock(token, incidentId!, blockId, patch);
    const data = block as unknown as Record<string, unknown>;
    useRoomStore
      .getState()
      .applyBlockEvent({ userId, blockId: block.id, action: "updated", data });
    wsClient.sendBlockEvent(block.id, "updated", data);
  }

  async function handleDelete(blockId: string) {
    await deleteBlock(token, incidentId!, blockId);
    useRoomStore.getState().applyBlockEvent({ userId, blockId, action: "deleted", data: {} });
    wsClient.sendBlockEvent(blockId, "deleted", {});
  }

  async function handleResolve() {
    try {
      const updated = await resolveIncident(token, incidentId!);
      useRoomStore.getState().updateIncident(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resolve the incident");
    }
  }

  return (
    <main className="room-shell">
      {reconnecting && <ReconnectBanner />}
      <header className="room-header">
        <a className="wordmark wordmark-small" href="/">CT<span className="wordmark-dot" aria-hidden="true" /></a>
        <div className="room-title-group">
          <div className="room-state active"><span className="signal-pulse" />Live incident</div>
          <h1>{incident?.title ?? "Incident"}</h1>
          {incident?.description && <p>{incident.description}</p>}
        </div>
        <div className="room-actions">
          {incident && <RoomCodeBadge code={incident.joinCode} />}
          {incident?.status === "active" && (
            <Button variant="danger" onClick={handleResolve}>
              Resolve
            </Button>
          )}
        </div>
      </header>
      <div className="room-utility">
        <PresenceList members={members} />
        <span className="sync-note">Changes sync automatically</span>
      </div>
      {error && <div className="room-alert"><Toast message={error} variant="error" onDismiss={() => setError(null)} /></div>}
      <CursorOverlay>
        <BlockFeed
          blocks={blocks}
          readOnly={false}
          onCreate={handleCreate}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </CursorOverlay>
    </main>
  );
}
