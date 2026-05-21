/**
 * CallTreeNode — recursive renderer for one frame in the EVM call tree.
 *
 * Design reference: docs/frontend-design.md §10.3 (the "hardest component")
 *
 * Behaviour:
 *   - Each instance renders its own row, then conditionally renders its
 *     children by recursively returning more <CallTreeNode/> elements.
 *   - Expand/collapse is local state — each node tracks its own
 *     `isExpanded`. First 2 depth levels auto-expand for fast skimming.
 *   - Indentation is computed from `depth` (24px per level).
 *   - A depth guard at 50 prevents stack overflow on malicious / malformed
 *     inputs (real EVM traces almost never exceed 20 levels).
 *
 * Performance: for the tiny mock data (3 nodes) this is trivial. Real
 * traces can have hundreds of nodes — in Phase 4 we may add React.memo,
 * but it's not necessary for Phase 2 demos.
 */
"use client";
import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { CallTypeBadge } from "./CallTypeBadge";
import { formatGas } from "@/lib/format";
import type { CallNode } from "@/types/trace";

/** Hard cap on recursion depth. Surfacing the cap visually is better than crashing. */
const MAX_DEPTH = 50;

interface CallTreeNodeProps {
  /** Current call frame from the recursive `traceTree` structure. */
  node: CallNode;
  /** Current depth (0 for the root). Used for indentation and auto-expand. */
  depth: number;
}

export function CallTreeNode({ node, depth }: CallTreeNodeProps) {
  // Auto-expand the first two levels so users see the structure immediately.
  // Deeper levels start collapsed to keep the initial render compact.
  const [isExpanded, setIsExpanded] = useState(depth < 2);

  // Defensive depth guard — protects against runaway recursion if the
  // backend ever returns a malformed (e.g. circular) tree.
  if (depth > MAX_DEPTH) {
    return (
      <div
        className="text-xs text-muted-foreground italic px-2 py-1"
        style={{ paddingLeft: `${MAX_DEPTH * 24 + 8}px` }}
      >
        ...max depth ({MAX_DEPTH}) reached
      </div>
    );
  }

  const hasChildren = node.calls && node.calls.length > 0;
  // ETH value worth surfacing — hide "0 ETH" to reduce visual noise.
  const showValue = node.value && node.value !== "0 ETH";

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 px-2 rounded text-sm ${
          hasChildren ? "cursor-pointer hover:bg-accent/50" : ""
        }`}
        // Indent by depth. The +8 keeps the root from sitting flush left.
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
        onClick={() => hasChildren && setIsExpanded((v) => !v)}
      >
        {/* Chevron only when the node actually has children. */}
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="w-4 h-4 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 shrink-0" />
          )
        ) : (
          // Empty placeholder maintains alignment with chevron-bearing rows.
          <div className="w-4 h-4 shrink-0" />
        )}

        <CallTypeBadge type={node.type} />

        {/*
         * Function signature in monospace. `truncate` enables the
         * ellipsis when names are very long (e.g. multi-arg signatures).
         */}
        <code className="text-xs font-mono truncate flex-1">
          {node.functionName}
        </code>

        {showValue && (
          <span className="text-xs text-yellow-500 shrink-0">{node.value}</span>
        )}

        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
          {formatGas(node.gasUsed)}
        </span>
      </div>

      {/* Children render only when expanded. Recursion ends naturally when calls=[]. */}
      {isExpanded && hasChildren && (
        <div>
          {node.calls.map((child, i) => (
            <CallTreeNode key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
