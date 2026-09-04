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
      <div className="max-w-sm mx-auto mt-24">
        <Toast
          message="This room code is invalid or no longer active."
          variant="error"
          onDismiss={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">{incident?.title ?? "Incident"}</h1>
        {joinCode && <RoomCodeBadge code={joinCode} />}
      </div>
      <PresenceList members={members} />
      <BlockFeed blocks={blocks} readOnly />
    </div>
  );
}
