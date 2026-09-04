import { useRef } from "react";
import type { MouseEvent, ReactNode } from "react";
import { useCursorsStore } from "../../lib/store/cursors";
import { sendCursorMove } from "../../lib/wsClient";

export function CursorOverlay({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const positions = useCursorsStore((state) => state.positions);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    sendCursorMove(x, y);
  }

  return (
    <div ref={containerRef} onMouseMove={handleMouseMove} className="cursor-stage">
      {children}
      {Object.entries(positions).map(([userId, position]) => (
        <div
          key={userId}
          data-testid={`cursor-${userId}`}
          className="remote-cursor"
          style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }}
        />
      ))}
    </div>
  );
}
