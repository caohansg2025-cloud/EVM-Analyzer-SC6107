/**
 * Display formatting helpers — pure functions, no side effects.
 *
 * Design reference: docs/frontend-design.md §6.3
 *
 * Kept tiny on purpose: each helper is used by multiple components
 * (CallTreeNode, AddressDisplay, TraceMetaCard) and consolidating them
 * here ensures consistent address truncation and number formatting
 * across the whole UI.
 */

/**
 * Shorten a 0x-prefixed address for compact display.
 * Example: truncateAddress("0xda9dfa130df4de4673b89022ee50ff26f6ea73cf")
 *       → "0xda9d...73cf"
 *
 * `head` and `tail` default to 6 and 4 (standard Etherscan style).
 * If the address is already short, returns it unchanged.
 */
export function truncateAddress(addr: string, head = 6, tail = 4): string {
  if (!addr || addr.length <= head + tail) return addr;
  return `${addr.slice(0, head)}...${addr.slice(-tail)}`;
}

/** Locale-aware thousands grouping. e.g. 125000 → "125,000" */
export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/** Format a gas count with its unit label. e.g. 125000 → "125,000 gas" */
export function formatGas(n: number): string {
  return `${formatNumber(n)} gas`;
}
