/**
 * useWallet — MetaMask connection state and lifecycle.
 *
 * Design reference: docs/frontend-design.md §7.1
 * EIP spec:         https://eips.ethereum.org/EIPS/eip-1193
 *
 * Returns a small state machine the UI reads:
 *   - isConnected          : true once the user has authorized
 *   - isConnecting         : true while the MetaMask popup is open
 *   - address, chainId     : the connected account & network
 *   - error                : last error message (null when none)
 *   - connect / disconnect : action callbacks
 *
 * Subscribes to MetaMask's `accountsChanged` and `chainChanged` events
 * so the UI updates without a page reload when the user swaps accounts
 * or networks in MetaMask. Listeners are cleaned up on unmount.
 *
 * On mount, the hook tries `eth_accounts` (NOT `eth_requestAccounts`) —
 * that's a silent check for an already-authorized account. It does NOT
 * pop up MetaMask. Only the explicit `connect()` call shows the popup.
 *
 * SSR safety: all `window.ethereum` access is gated by `hasEthereum()`
 * inside `src/lib/wallet.ts`. The hook itself is marked "use client" so
 * useState/useEffect are valid.
 */
"use client";
import { useCallback, useEffect, useState } from "react";
import { connectWallet, getProvider, hasEthereum } from "@/lib/wallet";

interface UseWalletReturn {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  /** Triggers the MetaMask popup; idempotent if already connected. */
  connect: () => Promise<void>;
  /** Clears local state; does NOT revoke wallet permission (impossible from dApp). */
  disconnect: () => void;
  /** True only when the dApp can speak to a wallet at all. */
  hasWallet: boolean;
}

export function useWallet(): UseWalletReturn {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Hold the wallet-installed flag in state so SSR and CSR agree after hydration.
  const [hasWallet, setHasWallet] = useState(false);

  // On mount: detect wallet presence and check for an already-authorized account.
  useEffect(() => {
    // Deliberate: set wallet flag inside the effect (not in initial useState)
    // because `window.ethereum` is undefined during SSR. Setting it eagerly
    // would create a hydration mismatch between server (false) and client (true).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasWallet(hasEthereum());
    if (!hasEthereum()) return;

    const provider = getProvider();
    if (!provider) return;

    // Silent check — does NOT trigger the MetaMask popup.
    provider.send("eth_accounts", []).then((accounts: unknown) => {
      if (Array.isArray(accounts) && accounts.length > 0) {
        setAddress(String(accounts[0]));
        provider.getNetwork().then((net) => setChainId(Number(net.chainId)));
      }
    }).catch(() => {
      // Silent fail — user simply isn't connected yet.
    });
  }, []);

  // Subscribe to MetaMask events so account/chain switches reflect in the UI.
  useEffect(() => {
    if (!hasEthereum()) return;

    const eth = window.ethereum as unknown as {
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
    if (!eth.on || !eth.removeListener) return;

    const onAccountsChanged = (...args: unknown[]) => {
      const accs = args[0] as string[] | undefined;
      if (!accs || accs.length === 0) {
        // User disconnected the account from inside MetaMask.
        setAddress(null);
        setChainId(null);
      } else {
        setAddress(accs[0]);
      }
    };

    const onChainChanged = (...args: unknown[]) => {
      const hex = args[0] as string;
      // chainChanged sends a hex string like "0x1" — parse to decimal.
      setChainId(parseInt(hex, 16));
    };

    eth.on("accountsChanged", onAccountsChanged);
    eth.on("chainChanged", onChainChanged);

    return () => {
      eth.removeListener?.("accountsChanged", onAccountsChanged);
      eth.removeListener?.("chainChanged", onChainChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    if (!hasEthereum()) {
      setError("MetaMask not installed");
      return;
    }
    setIsConnecting(true);
    setError(null);
    try {
      const { address: a, chainId: c } = await connectWallet();
      setAddress(a);
      setChainId(c);
    } catch (e) {
      // User rejected the popup, network error, etc.
      setError((e as Error).message ?? "Connection failed");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    // dApps can't actually revoke wallet permission — best we can do is
    // forget the connection client-side. The user must visit MetaMask
    // settings to fully un-authorize the site.
    setAddress(null);
    setChainId(null);
    setError(null);
  }, []);

  return {
    address,
    chainId,
    isConnected: !!address,
    isConnecting,
    error,
    connect,
    disconnect,
    hasWallet,
  };
}
