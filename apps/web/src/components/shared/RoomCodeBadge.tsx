interface RoomCodeBadgeProps {
  code: string;
}

export function RoomCodeBadge({ code }: RoomCodeBadgeProps) {
  return (
    <span className="inline-flex items-center gap-2 rounded border border-neutral-300 px-3 py-1 font-mono text-sm tracking-wider">
      {code}
    </span>
  );
}
