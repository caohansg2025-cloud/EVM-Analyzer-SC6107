/**
 * CallTypeBadge — colored label for an EVM call type.
 *
 * Design reference: docs/frontend-design.md §10.3
 *
 * Colour scheme chosen for semantic distinction at a glance:
 *   CALL          → blue   (standard message call, by far the most common)
 *   DELEGATECALL  → purple (proxy / library — important to spot for security)
 *   STATICCALL    → gray   (read-only, lower visual weight)
 *   CREATE        → green  (creation events are "positive" / additive)
 *
 * Pure server component — no state, no events, safe to render on the server.
 */
import { Badge } from "@/components/ui/badge";
import type { CallType } from "@/types/trace";

/** Tailwind class map keyed by call type. */
const COLOR_MAP: Record<CallType, string> = {
  CALL: "bg-blue-600 hover:bg-blue-600 text-white",
  DELEGATECALL: "bg-purple-600 hover:bg-purple-600 text-white",
  STATICCALL: "bg-gray-500 hover:bg-gray-500 text-white",
  CREATE: "bg-green-600 hover:bg-green-600 text-white",
};

interface CallTypeBadgeProps {
  type: CallType;
}

export function CallTypeBadge({ type }: CallTypeBadgeProps) {
  return (
    <Badge className={`${COLOR_MAP[type]} text-xs font-medium`}>
      {type}
    </Badge>
  );
}
