import { useState } from "react";
import type { FormEvent } from "react";
import type { BlockType } from "@CodeTalk/types";
import { Button } from "../shared/Button";

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  log: "Log",
  hypothesis: "Hypothesis",
  fix_attempt: "Fix attempt",
  root_cause: "Root cause",
  custom: "Custom",
};

interface BlockComposerProps {
  onSubmit: (input: { blockType: BlockType; body: string; subject?: string }) => Promise<void>;
}

export function BlockComposer({ onSubmit }: BlockComposerProps) {
  const [blockType, setBlockType] = useState<BlockType>("log");
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      await onSubmit({
        blockType,
        body,
        subject: blockType === "custom" ? subject : undefined,
      });
      setBody("");
      setSubject("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 border border-neutral-200 rounded p-3 bg-white">
      <select
        aria-label="Block type"
        value={blockType}
        onChange={(e) => setBlockType(e.target.value as BlockType)}
        className="border border-neutral-300 rounded px-2 py-1 text-sm w-fit"
      >
        {Object.entries(BLOCK_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {blockType === "custom" && (
        <input
          aria-label="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="border border-neutral-300 rounded px-2 py-1 text-sm"
        />
      )}
      <textarea
        aria-label="Block body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What's happening?"
        className="border border-neutral-300 rounded p-2 text-sm"
      />
      <Button type="submit" disabled={busy}>
        Add
      </Button>
    </form>
  );
}
