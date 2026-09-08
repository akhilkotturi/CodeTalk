import { useEffect } from "react";
import type { ReactNode } from "react";

type ExcalidrawProps = {
  children?: ReactNode;
  excalidrawAPI?: (api: { updateScene: (scene: unknown) => void }) => void;
  onChange?: (elements: Array<{ id: string; type: string; version: number; isDeleted: boolean }>) => void;
};

export function Excalidraw({ children, excalidrawAPI, onChange }: ExcalidrawProps) {
  useEffect(() => {
    excalidrawAPI?.({ updateScene: () => undefined });
  }, [excalidrawAPI]);

  return (
    <div data-testid="excalidraw-mock">
      {children}
      <button
        type="button"
        onClick={() => onChange?.([{ id: "stroke-1", type: "freedraw", version: 1, isDeleted: false }])}
      >
        Mock draw stroke
      </button>
    </div>
  );
}
