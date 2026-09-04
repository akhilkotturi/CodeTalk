import type { IncidentBlock } from "@CodeTalk/types";
import { BlockFeed } from "../canvas/BlockFeed";

export function PlaybackFeed({
  blocks,
  revealedCount,
}: {
  blocks: IncidentBlock[];
  revealedCount: number;
}) {
  return <BlockFeed blocks={blocks.slice(0, revealedCount)} readOnly />;
}
