import { useState } from "react";
import type { IncidentBlock } from "@CodeTalk/types";
import { Button } from "../shared/Button";

interface BlockCardProps {
  block: IncidentBlock;
  readOnly: boolean;
  onEdit: (blockId: string, patch: { body?: string; subject?: string }) => void;
  onDelete: (blockId: string) => void;
}

export function BlockCard({ block, readOnly, onEdit, onDelete }: BlockCardProps) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(block.body);

  function handleSave() {
    onEdit(block.id, { body });
    setEditing(false);
  }

  return (
    <div className="border border-neutral-200 rounded p-3 flex flex-col gap-2 bg-white">
      {block.subject && (
        <div className="text-xs uppercase tracking-wide text-neutral-500">{block.subject}</div>
      )}
      {editing ? (
        <textarea
          className="border border-neutral-300 rounded p-2 text-sm"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      ) : (
        <p className="text-sm text-neutral-900 whitespace-pre-wrap">{block.body}</p>
      )}
      {!readOnly && (
        <div className="flex gap-2 text-xs">
          {editing ? (
            <Button variant="secondary" onClick={handleSave}>
              Save
            </Button>
          ) : (
            <button className="underline text-neutral-500" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
          <button className="underline text-neutral-500" onClick={() => onDelete(block.id)}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
