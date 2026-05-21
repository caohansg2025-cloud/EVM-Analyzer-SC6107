/**
 * ConnectWalletButton — Phase 4 full implementation (was a stub in Phase 1).
 *
 * Design reference: docs/frontend-design.md §10.1
 *
 * Three visual states driven by `useWallet`:
 *   1. Wallet not installed → "Install MetaMask" link to metamask.io
 *   2. Not connected        → "Connect Wallet" button (triggers MetaMask popup)
 *   3. Connected            → "<truncated 0x address> · <network name>" with
 *                              click-to-disconnect (client-side only — MetaMask
 *                              permission remains until revoked in the wallet)
 *
 * The connection state is reactive: switching accounts or networks inside
 * MetaMask updates the button instantly via the hook's event listeners.
 */
"use client";
import { Wallet, LogOut, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { getNetworkName } from "@/lib/wallet";
import { truncateAddress } from "@/lib/format";

export function ConnectWalletButton() {
  const {
    address,
    chainId,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    hasWallet,
  } = useWallet();

  // Branch 1 — wallet not installed: link out to install MetaMask.
  // (This shadcn Button doesn't support `asChild`, so we render a styled
  // anchor directly with the Button's outline classes via a click handler.)
  if (!hasWallet) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open("https://metamask.io/download/", "_blank", "noopener,noreferrer")}
        className="inline-flex items-center gap-2"
      >
        <Wallet className="w-4 h-4" />
        Install MetaMask
        <ExternalLink className="w-3 h-3" />
      </Button>
    );
  }

  // Branch 2 — wallet installed but not connected.
  if (!isConnected) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={connect}
          disabled={isConnecting}
          className="inline-flex items-center gap-2"
        >
          <Wallet className="w-4 h-4" />
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </Button>
        {/* Show last error inline so users know why a previous attempt failed. */}
        {error && (
          <span className="text-xs text-destructive max-w-xs text-right">
            {error}
          </span>
        )}
      </div>
    );
  }

  // Branch 3 — connected: show address + network, with click-to-disconnect.
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={disconnect}
      className="inline-flex items-center gap-2 group"
      title="Click to disconnect (client-side only)"
    >
      <div className="flex items-center gap-2">
        {/* Greenish dot indicates a live connection. */}
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <span className="font-mono text-xs">{truncateAddress(address ?? "")}</span>
        {chainId !== null && (
          <span className="text-xs text-muted-foreground hidden sm:inline">
            · {getNetworkName(chainId)}
          </span>
        )}
      </div>
      {/* LogOut icon appears on hover to hint at the disconnect action. */}
      <LogOut className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </Button>
  );
}
