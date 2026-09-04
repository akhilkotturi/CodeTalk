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
    <div className="block-workspace">
      {!readOnly && onCreate && <BlockComposer onSubmit={onCreate} />}
      <div className="block-grid">
        {BLOCK_TYPE_ORDER.map((type) => (
          <section key={type} className="block-column" data-block-type={type}>
            <header className="column-head">
              <h2>{COLUMN_LABELS[type]}</h2>
              <span>{groups[type].length.toString().padStart(2, "0")}</span>
            </header>
            {groups[type].map((block) => (
              <BlockCard
                key={block.id}
                block={block}
                readOnly={readOnly}
                onEdit={onEdit ?? (() => {})}
                onDelete={onDelete ?? (() => {})}
              />
            ))}
            {groups[type].length === 0 && <p className="column-empty">Nothing recorded yet</p>}
          </section>
        ))}
      </div>
    </div>
  );
}
