interface RoomCodeBadgeProps {
  code: string;
}

export function RoomCodeBadge({ code }: RoomCodeBadgeProps) {
  return (
    <span className="room-code">
      <span className="room-code-label">Room</span>
      <span>{code}</span>
    </span>
  );
}
