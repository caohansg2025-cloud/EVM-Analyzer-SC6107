/**
 * Web3 wallet helpers — thin wrapper over ethers v6.
 *
 * Design reference: docs/frontend-design.md §6.2
 * EIP spec:         https://eips.ethereum.org/EIPS/eip-1193
 *
 * These functions are pure (no React) — UI integration happens in
 * src/hooks/useWallet.ts (Commit 15). Isolating ethers calls here makes
 * the rest of the codebase trivially mockable in tests.
 *
 * IMPORTANT: All `window.ethereum` access is gated by `hasEthereum()` so
 * the module is safe to import during SSR / build-time, where `window`
 * is undefined.
 */

import { BrowserProvider } from "ethers";

/** True only when an EIP-1193 wallet (e.g. MetaMask) is detected in the current window. */
export function hasEthereum(): boolean {
  return typeof window !== "undefined" && !!window.ethereum;
}

/**
 * Build a `BrowserProvider` bound to the injected wallet.
 * Returns null when no wallet is present — the caller decides how to
 * surface that (e.g. show an "Install MetaMask" link).
 */
export function getProvider(): BrowserProvider | null {
  if (!hasEthereum()) return null;
  return new BrowserProvider(window.ethereum!);
}

/**
 * Request account access and read the current chain.
 *
 * `eth_requestAccounts` triggers the MetaMask connection popup if the
 * site is not yet authorized. Throws if the user rejects.
 */
export async function connectWallet(): Promise<{ address: string; chainId: number }> {
  const provider = getProvider();
  if (!provider) throw new Error("MetaMask not installed");
  const accounts = (await provider.send("eth_requestAccounts", [])) as string[];
  const network = await provider.getNetwork();
  // `network.chainId` is a bigint in ethers v6; coerce to Number for our 4-byte ID range.
  return { address: accounts[0], chainId: Number(network.chainId) };
}

/**
 * Best-known networks for the demo. Anything unknown falls back to "Chain <id>"
 * so the UI never shows a confusing blank.
 */
const NETWORK_NAMES: Record<number, string> = {
  1: "Ethereum",
  11155111: "Sepolia",
  17000: "Holesky",
  137: "Polygon",
};

export function getNetworkName(chainId: number): string {
  return NETWORK_NAMES[chainId] ?? `Chain ${chainId}`;
}
