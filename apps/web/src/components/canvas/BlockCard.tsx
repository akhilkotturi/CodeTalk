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
    <article className="block-card" data-block-type={block.blockType}>
      {block.subject && (
        <div className="block-subject">{block.subject}</div>
      )}
      {editing ? (
        <textarea
          className="block-edit"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      ) : (
        <p className="block-body">{block.body}</p>
      )}
      <div className="block-meta">
        <span>{block.authorId}</span>
        <time dateTime={block.createdAt}>{new Date(block.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
      </div>
      {!readOnly && (
        <div className="block-actions">
          {editing ? (
            <Button variant="secondary" onClick={handleSave}>
              Save
            </Button>
          ) : (
            <button className="text-button" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
          <button className="text-button delete-action" onClick={() => onDelete(block.id)}>
            Delete
          </button>
        </div>
      )}
    </article>
  );
}
