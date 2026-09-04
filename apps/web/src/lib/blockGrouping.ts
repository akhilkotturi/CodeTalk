import type { IncidentBlock, BlockType } from "@CodeTalk/types";

export const BLOCK_TYPE_ORDER: BlockType[] = ["log", "hypothesis", "fix_attempt", "root_cause", "custom"];

export function groupBlocksByType(blocks: IncidentBlock[]): Record<BlockType, IncidentBlock[]> {
  const groups = Object.fromEntries(
    BLOCK_TYPE_ORDER.map((type) => [type, [] as IncidentBlock[]])
  ) as Record<BlockType, IncidentBlock[]>;
  for (const block of blocks) {
    groups[block.blockType].push(block);
  }
  return groups;
}
