import type { RoomMember } from "../../lib/store/room";

export function PresenceList({ members }: { members: RoomMember[] }) {
  return (
    <div className="presence-bar">
      <span className="presence-label">In the room</span>
      <ul aria-label="Presence" className="presence-list">
      {members.map((member) => (
        <li key={member.userId} className="presence-person">
          <span className="presence-avatar" aria-hidden="true">{member.userId.slice(0, 1).toUpperCase()}</span>
          <span>{member.userId} · {member.role}</span>
        </li>
      ))}
      </ul>
      {members.length === 0 && <span className="presence-empty">Waiting for teammates</span>}
    </div>
  );
}
