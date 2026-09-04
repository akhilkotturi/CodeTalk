import type { BlockType, IncidentBlock } from "@CodeTalk/types";
import { BLOCK_TYPE_ORDER, groupBlocksByType } from "../../lib/blockGrouping";
import { BlockCard } from "./BlockCard";
import { BlockComposer } from "./BlockComposer";

const COLUMN_LABELS: Record<BlockType, string> = {
  log: "Log",
  hypothesis: "Hypothesis",
  fix_attempt: "Fix attempts",
  root_cause: "Root cause",
  custom: "Custom",
};

interface BlockFeedProps {
  blocks: IncidentBlock[];
  readOnly: boolean;
  onCreate?: (input: { blockType: BlockType; body: string; subject?: string }) => Promise<void>;
  onEdit?: (blockId: string, patch: { body?: string; subject?: string }) => void;
  onDelete?: (blockId: string) => void;
}

export function BlockFeed({ blocks, readOnly, onCreate, onEdit, onDelete }: BlockFeedProps) {
  const groups = groupBlocksByType(blocks);

  return (
    <div className="flex flex-col gap-6">
      {!readOnly && onCreate && <BlockComposer onSubmit={onCreate} />}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {BLOCK_TYPE_ORDER.map((type) => (
          <div key={type} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-neutral-600">{COLUMN_LABELS[type]}</h2>
            {groups[type].map((block) => (
              <BlockCard
                key={block.id}
                block={block}
                readOnly={readOnly}
                onEdit={onEdit ?? (() => {})}
                onDelete={onDelete ?? (() => {})}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
