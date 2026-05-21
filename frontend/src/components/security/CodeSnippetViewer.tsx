/**
 * CodeSnippetViewer — syntax-highlighted Solidity code snippet.
 *
 * Design reference: docs/frontend-design.md §10.5
 * Library docs:     https://github.com/react-syntax-highlighter/react-syntax-highlighter
 *
 * Wraps the Prism-based renderer from `react-syntax-highlighter`. Prism's
 * `solidity` grammar is auto-registered when we import the Prism variant
 * (different from the lighter `light` build which requires manual lang reg).
 *
 * The `atomDark` theme is imported from a deep ESM path:
 *   react-syntax-highlighter/dist/esm/styles/prism
 * This path is locked by the library — don't shorten it.
 *
 * CRITICAL: needs "use client" — Prism uses browser-only APIs during
 * tokenisation. `next.config.ts` already has the package in
 * `transpilePackages` so build-time compilation works.
 */
"use client";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodeSnippetViewerProps {
  /** Raw Solidity source as a single string (may contain newlines). */
  code: string;
  /**
   * Starting line number to display. Use the `vulnerability.line` so the
   * visible line numbers in the snippet match the reported location.
   */
  startLine?: number;
}

export function CodeSnippetViewer({ code, startLine = 1 }: CodeSnippetViewerProps) {
  return (
    <SyntaxHighlighter
      language="solidity"
      style={atomDark}
      showLineNumbers
      startingLineNumber={startLine}
      customStyle={{
        borderRadius: "0.5rem",
        fontSize: "0.85rem",
        margin: 0,
        // Match shadcn's card padding so the snippet doesn't look like
        // it's escaping its container.
        padding: "0.75rem 1rem",
      }}
      codeTagProps={{
        style: {
          fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        },
      }}
    >
      {code}
    </SyntaxHighlighter>
  );
}
