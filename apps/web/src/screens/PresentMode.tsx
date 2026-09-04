import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BlockFeed } from "../components/canvas/BlockFeed";
import { PresenceList } from "../components/presence/PresenceList";
import { RoomCodeBadge } from "../components/shared/RoomCodeBadge";
import { Toast } from "../components/shared/Toast";
import { useRoomStore } from "../lib/store/room";
import * as wsClient from "../lib/wsClient";

const INVALID_CODE_CLOSE = 4401;

export function PresentMode() {
  const { joinCode } = useParams<{ joinCode: string }>();
  const incident = useRoomStore((state) => state.incident);
  const blocks = useRoomStore((state) => state.blocks);
  const members = useRoomStore((state) => state.members);
  const [invalidCode, setInvalidCode] = useState(false);

  useEffect(() => {
    if (!joinCode) return;
    wsClient.connect(
      { role: "viewer", joinCode },
      {
        onClose: (code) => {
          if (code === INVALID_CODE_CLOSE) setInvalidCode(true);
        },
      }
    );
    return () => {
      wsClient.disconnect();
      useRoomStore.getState().reset();
    };
  }, [joinCode]);

  if (invalidCode) {
    return (
      <main className="center-state">
        <a className="wordmark" href="/">CodeTalk<span className="wordmark-dot" aria-hidden="true" /></a>
        <Toast
          message="This room code is invalid or no longer active."
          variant="error"
          onDismiss={() => {}}
        />
      </main>
    );
  }

  return (
    <main className="room-shell present-shell">
      <header className="room-header">
        <a className="wordmark wordmark-small" href="/">CT<span className="wordmark-dot" aria-hidden="true" /></a>
        <div className="room-title-group">
          <div className="room-state active"><span className="signal-pulse" />Present mode · live</div>
          <h1>{incident?.title ?? "Incident"}</h1>
          <p>Read-only view · updates appear as the team works</p>
        </div>
        <div className="room-actions">
        {joinCode && <RoomCodeBadge code={joinCode} />}
        </div>
      </header>
      <div className="room-utility"><PresenceList members={members} /></div>
      <BlockFeed blocks={blocks} readOnly />
    </main>
  );
}
