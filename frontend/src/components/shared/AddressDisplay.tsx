/**
 * AddressDisplay — truncated 0x address with click-to-copy.
 *
 * Design reference: docs/frontend-design.md §10.6
 *
 * Used everywhere an Ethereum address surfaces (TraceMetaCard, CallTreeNode
 * via gas-state tables in Phase 3, etc.). Centralising it ensures consistent
 * truncation, monospace styling, and clipboard behaviour.
 *
 * Note on the clipboard API: `navigator.clipboard.writeText` requires a
 * secure context (HTTPS or localhost). It works on the local dev server
 * and on Vercel (which serves over HTTPS). On plain HTTP it silently fails.
 */
"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { truncateAddress } from "@/lib/format";

interface AddressDisplayProps {
  /** Full 0x-prefixed address. */
  address: string;
  /**
   * "short" → "0xabcdef...1234" (6/4)        — default, used inline
   * "long"  → "0xabcdef0123...456789ab" (10/8) — used for tx hashes
   */
  length?: "short" | "long";
}

export function AddressDisplay({ address, length = "short" }: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);

  // Truncation widths chosen to balance readability vs horizontal space.
  const head = length === "long" ? 10 : 6;
  const tail = length === "long" ? 8 : 4;

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      // Reset back to the Copy icon after 1.5s so users can copy multiple times.
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="font-mono text-sm hover:text-primary inline-flex items-center gap-1 transition-colors"
      title={address /* full address shown on hover */}
    >
      {truncateAddress(address, head, tail)}
      {copied ? (
        <Check className="w-3 h-3 text-green-500" />
      ) : (
        <Copy className="w-3 h-3 opacity-60" />
      )}
    </button>
  );
}
