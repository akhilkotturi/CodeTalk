import type { RoomMember } from "../../lib/store/room";

export function PresenceList({ members }: { members: RoomMember[] }) {
  return (
    <ul aria-label="Presence" className="flex gap-2 flex-wrap">
      {members.map((member) => (
        <li
          key={member.userId}
          className="text-xs px-2 py-1 rounded-full border border-neutral-300 text-neutral-700"
        >
          {member.userId} · {member.role}
        </li>
      ))}
    </ul>
  );
}
