/**
 * Global ambient declarations.
 *
 * Purpose: TypeScript does not know about `window.ethereum` by default.
 * MetaMask and other EIP-1193 wallets inject this object at runtime;
 * declaring it here lets us call wallet methods type-safely without `any`.
 *
 * Spec: EIP-1193 — Ethereum Provider JavaScript API
 *       https://eips.ethereum.org/EIPS/eip-1193
 *
 * `Eip1193Provider` is the canonical type re-exported by ethers v6.
 * Used in src/lib/wallet.ts.
 */
import type { Eip1193Provider } from "ethers";

declare global {
  interface Window {
    /** MetaMask / any EIP-1193 provider. May be undefined when no wallet is installed. */
    ethereum?: Eip1193Provider;
  }
}

// An empty re-export turns this `.d.ts` file into a module, which is required
// for `declare global` to take effect.
export {};
