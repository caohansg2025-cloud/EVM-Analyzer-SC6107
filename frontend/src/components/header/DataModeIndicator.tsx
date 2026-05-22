/**
 * DataModeIndicator - small badge showing whether the frontend is hitting
 * a live backend or replaying local mocks.
 *
 * Reads NEXT_PUBLIC_USE_MOCKS at build time. When the badge says "Live API"
 * the audience knows the response data came over HTTP from the backend at
 * NEXT_PUBLIC_API_BASE_URL; when it says "Mock" the same shapes are served
 * from src/mocks/*.json locally.
 *
 * Marked client-only because process.env values prefixed with NEXT_PUBLIC_
 * are inlined into the client bundle at build time, but we read them in
 * a small client component to make hydration deterministic.
 */
"use client";
import { Database, Cloud } from "lucide-react";

export function DataModeIndicator() {
  // NEXT_PUBLIC_USE_MOCKS defaults to "true" — anything other than the
  // literal string "false" keeps mock mode on.
  const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

  if (useMocks) {
    return (
      <span
        className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-500"
        title="Frontend is replaying canned JSON from src/mocks/. To switch to live data, set NEXT_PUBLIC_USE_MOCKS=false in frontend/.env.local and restart the dev server."
      >
        <Database className="w-3 h-3" />
        Mock
      </span>
    );
  }

  // Show the base URL so the audience can see which backend we're calling.
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "(same-origin)";
  return (
    <span
      className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500"
      title={`Frontend is calling the live backend at ${baseUrl}. Open DevTools Network tab to see the requests.`}
    >
      <Cloud className="w-3 h-3" />
      Live API
    </span>
  );
}
