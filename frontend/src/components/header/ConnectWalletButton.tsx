/**
 * ConnectWalletButton — placeholder shell for Phase 1.
 *
 * Design reference: docs/frontend-design.md §10.1
 *
 * In Commit 15 (Phase 4 — Day 4) this stub gets replaced with a real
 * implementation that:
 *   - calls useWallet() to read connection state
 *   - shows "Connect Wallet" when disconnected
 *   - triggers MetaMask popup via connectWallet() on click
 *   - shows truncated address + network name once connected
 *   - reacts to `accountsChanged` and `chainChanged` events
 *
 * Marked `"use client"` because Phase 4 will introduce hooks (useState,
 * useEffect). Doing it now means later commits don't need to touch
 * Header.tsx — only this file.
 */
"use client";
import { Button } from "@/components/ui/button";

export function ConnectWalletButton() {
  return <Button variant="outline">Connect Wallet</Button>;
}
