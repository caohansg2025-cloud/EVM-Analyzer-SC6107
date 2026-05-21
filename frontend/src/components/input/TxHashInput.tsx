/**
 * TxHashInput — Phase 4 full implementation (was a stub in Phase 1).
 *
 * Design reference: docs/frontend-design.md §10.2
 *
 * Lets the user supply two values:
 *   1. A transaction hash (drives the Trace + Gas & State tabs)
 *   2. A contract address (drives the Security tab)
 *
 * For each, users can either:
 *   - Pick from a curated dropdown (SAMPLE_TXS / SAMPLE_CONTRACTS in
 *     `src/lib/constants.ts`), which auto-applies on selection
 *   - Type their own value and click "Load", which validates against
 *     the appropriate hex regex before calling the parent's setter
 *
 * Validation errors are shown inline below the offending field; the
 * Load button is disabled while the input is invalid or unchanged.
 *
 * Marked "use client" — uses useState for the local input drafts and
 * error messages.
 */
"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SAMPLE_TXS, SAMPLE_CONTRACTS } from "@/lib/constants";

/** 0x + 64 hex chars (32 bytes) — Ethereum transaction hash. */
const TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/;
/** 0x + 40 hex chars (20 bytes) — Ethereum address. */
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

interface TxHashInputProps {
  /** Current tx hash from parent state (used to show what's loaded). */
  currentTxHash: string | null;
  /** Current contract address from parent state. */
  currentContract: string | null;
  /** Called when user picks/types a new tx hash. */
  onTxHashChange: (txHash: string) => void;
  /** Called when user picks/types a new contract address. */
  onContractChange: (address: string) => void;
}

export function TxHashInput({
  currentTxHash,
  currentContract,
  onTxHashChange,
  onContractChange,
}: TxHashInputProps) {
  // Draft values held locally — only committed to parent on valid input.
  const [txDraft, setTxDraft] = useState("");
  const [contractDraft, setContractDraft] = useState("");
  const [txError, setTxError] = useState<string | null>(null);
  const [contractError, setContractError] = useState<string | null>(null);

  const handleTxLoad = () => {
    if (!TX_HASH_RE.test(txDraft)) {
      setTxError("Invalid tx hash — must be 0x followed by 64 hex characters.");
      return;
    }
    setTxError(null);
    onTxHashChange(txDraft);
  };

  const handleContractLoad = () => {
    if (!ADDRESS_RE.test(contractDraft)) {
      setContractError("Invalid address — must be 0x followed by 40 hex characters.");
      return;
    }
    setContractError(null);
    onContractChange(contractDraft);
  };

  return (
    <Card>
      <CardContent className="py-4 space-y-4">
        {/* ── Transaction hash row (drives Trace + Gas & State) ──────────── */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wide text-muted-foreground">
            Transaction (Trace + Gas & State)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-start">
            {/* Sample dropdown — auto-applies on change. */}
            <Select
              value={
                // If currentTxHash matches a sample, pre-select it; otherwise
                // leave the dropdown blank so the user knows they're using a
                // custom value.
                SAMPLE_TXS.find((s) => s.txHash === currentTxHash)?.txHash ?? ""
              }
              onValueChange={(v) => {
                if (v) onTxHashChange(v);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick a sample transaction..." />
              </SelectTrigger>
              <SelectContent>
                {SAMPLE_TXS.map((s) => (
                  <SelectItem key={s.txHash} value={s.txHash}>
                    {s.label} — {s.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Manual tx hash entry with Load button. */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-start">
            <Input
              placeholder="…or paste a tx hash: 0x... (64 hex chars)"
              value={txDraft}
              onChange={(e) => {
                setTxDraft(e.target.value);
                if (txError) setTxError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTxLoad();
              }}
              aria-invalid={txError ? true : undefined}
            />
            <Button
              onClick={handleTxLoad}
              disabled={!txDraft || txDraft === currentTxHash}
            >
              Load
            </Button>
          </div>
          {txError && <p className="text-xs text-destructive">{txError}</p>}
        </div>

        {/* ── Contract address row (drives Security) ────────────────────── */}
        <div className="space-y-2 pt-2 border-t border-border">
          <label className="text-xs uppercase tracking-wide text-muted-foreground">
            Contract Address (Security)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-start">
            <Select
              value={
                SAMPLE_CONTRACTS.find((c) => c.address === currentContract)
                  ?.address ?? ""
              }
              onValueChange={(v) => {
                if (v) onContractChange(v);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick a sample contract..." />
              </SelectTrigger>
              <SelectContent>
                {SAMPLE_CONTRACTS.map((c) => (
                  <SelectItem key={c.address} value={c.address}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-start">
            <Input
              placeholder="…or paste a contract address: 0x... (40 hex chars)"
              value={contractDraft}
              onChange={(e) => {
                setContractDraft(e.target.value);
                if (contractError) setContractError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleContractLoad();
              }}
              aria-invalid={contractError ? true : undefined}
            />
            <Button
              onClick={handleContractLoad}
              disabled={!contractDraft || contractDraft === currentContract}
            >
              Load
            </Button>
          </div>
          {contractError && (
            <p className="text-xs text-destructive">{contractError}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
