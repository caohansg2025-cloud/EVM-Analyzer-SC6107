# Security Analysis Module

The security analysis module of the **EVM Transaction Debugger & Analyzer
(SC6107)** scans a local Solidity source file with
[Slither](https://github.com/crytic/slither) and emits a normalised JSON
report that matches the frontend data contract in
`mock_data/security_response.json`.

## Responsibilities

- Accept a local `.sol` file path.
- Run static security analysis (Slither).
- Normalise detector output to the project schema.
- Print JSON to stdout, optionally writing to a file.

The module does not call the chain, fetch verified source, or depend on
the trace / gas modules.

## Architecture

```
test_contracts/*.sol
        │
        ▼
backend/security_scan.py
  ├─ extract_pragma_version()   → solc-select use X.Y.Z
  ├─ run_slither()              → slither --json -
  ├─ normalise_findings()       → detector → project type / severity
  └─ build_report()             → JSON matching the frontend schema
        │
        ▼
stdout  /  --output  /  mock_data/security_response.json
```

Key design choices:

- **Auto-select solc per pragma.** `extract_pragma_version()` reads the
  `pragma solidity` directive; `ensure_solc_version()` runs
  `solc-select use` so users do not have to switch compilers between
  fixtures. Missing versions are reported as `scanStatus: Failed` with a
  clear install hint instead of a traceback.
- **PATH-aware subprocess.** Slither calls `solc` via `shutil.which`. The
  scanner prepends the bin directory of its own `slither` executable to
  `PATH` so the `solc` shim resolves whether the user runs through
  `uv run` or invokes the script directly.
- **Detector mapping with wildcards.** `DETECTOR_TYPE_MAP` supports exact
  keys and `prefix-*` patterns (e.g. `reentrancy-*` covers both
  `reentrancy-eth` and `reentrancy-no-eth`). Unknown detectors are
  surfaced as Title-cased names rather than silently dropped.
- **Specific source location.** When a detector reports multiple
  elements (contract / function / statement), the scanner picks the
  `node`-type element first, otherwise the one with the smallest line
  range. This keeps `line` and `codeSnippet` pointing at the actual
  problem.
- **Deterministic IDs.** Findings are sorted by `(severity, line, type)`
  and then numbered `ERR-001`, `ERR-002`, … — stable enough for snapshot
  tests and frontend rendering.
- **Failures are data, not exceptions.** Slither exits non-zero whenever
  it has findings, so success is judged on parseable JSON, not exit
  code. Unrecoverable errors become `scanStatus: Failed` with a
  structured `error` field so the frontend never receives a broken
  payload.

## CLI

```bash
uv run python backend/security_scan.py <contract.sol> [--pretty] [--output PATH] [--solc-version X.Y.Z]
```

| Flag | Description |
| --- | --- |
| `--pretty` | Indent the JSON output. |
| `--output PATH` | Also write the JSON to a file (parent dirs created). |
| `--solc-version X.Y.Z` | Force a specific `solc` version, overriding pragma detection. |

Exit codes:

- `0` — scan completed (including `CompletedWithNoFindings`).
- `1` — scan failed; the JSON report still contains a structured `error` field.
- `2` — CLI misuse (missing file, non-`.sol` input).

## Output schema

```json
{
  "contractAddress": null,
  "contractName": "VulnerableVault",
  "scanStatus": "Completed",
  "toolsUsed": ["Slither v0.11.5"],
  "vulnerabilities": [
    {
      "id": "ERR-001",
      "type": "Reentrancy",
      "severity": "High",
      "line": 22,
      "description": "Reentrancy in VulnerableVault.withdraw(uint256) (...)",
      "codeSnippet": "(bool ok, ) = msg.sender.call{value: amount}(\"\");"
    }
  ]
}
```

| Field | Notes |
| --- | --- |
| `contractAddress` | `null` for local source files. |
| `contractName` | First `contract` / `library` / `interface` declaration; falls back to the file stem. |
| `scanStatus` | `Completed`, `CompletedWithNoFindings`, or `Failed`. |
| `toolsUsed` | Analyzer label with version when available (e.g. `Slither v0.11.5`). |
| `vulnerabilities[]` | Normalised findings, sorted by severity then line. |
| `id` | Deterministic `ERR-001`, `ERR-002`, …. |
| `type` | Project-facing category (see mapping). |
| `severity` | `High` / `Medium` / `Low` / `Informational`. |
| `line` | Primary line for the finding; `null` when unavailable. |
| `description` | First line of Slither's description, trimmed. |
| `codeSnippet` | Short source line at the reported location. |

## Detector / severity mapping

The Slither detector name is mapped to a project category in
`backend/security_scan.py::DETECTOR_TYPE_MAP`:

| Slither detector | Project type |
| --- | --- |
| `reentrancy-*` | Reentrancy |
| `unchecked-lowlevel`, `unchecked-send`, `unchecked-transfer`, `low-level-calls` | Unchecked External Call |
| `arbitrary-send-*`, `suicidal`, `tx-origin` | Access Control Issue |
| `incorrect-equality`, `tautology`, `tautological-compare` | Logic Issue |
| `divide-before-multiply` | Arithmetic Precision Issue |
| `weak-prng` | Weak Randomness |
| `timestamp` | Block Timestamp Dependence |
| `solc-version`, `pragma` | Compiler Version |
| anything else | Title-cased detector name |

Severity is derived from Slither's `impact` field:

| Slither impact | Project severity |
| --- | --- |
| `High` | High |
| `Medium` | Medium |
| `Low` | Low |
| `Informational` | Informational |
| `Optimization` | Informational |

## Fixtures

Vulnerable contracts under `test_contracts/`:

| File | Expected detection |
| --- | --- |
| `VulnerableVault.sol` | `reentrancy-eth` (**High**). |
| `AccessControlBug.sol` | `suicidal`, `arbitrary-send-eth`, `tx-origin`. |
| `UncheckedCall.sol` | `unchecked-lowlevel`, `unchecked-send`. |
| `OverflowToken.sol` | Tautology on a `>= 0` underflow check (`solc 0.7.6`). |

## Known limitations

- **No native overflow detector.** Slither defers integer overflow to
  the compiler; `OverflowToken.sol` is compiled with `solc 0.7.6` and
  surfaces as a *Logic Issue* (tautology), not an explicit `overflow`
  category. The implementation deliberately does not fabricate findings.
- **A matching `solc` must be installed.** If `solc-select` does not
  have the contract's pragma version installed, the scanner reports
  `scanStatus: Failed` with a clear install hint.
- **Local source only.** No Etherscan fetch, no deployed-bytecode
  scanning.
- **Single analyzer.** Mythril is not wired in; it is listed as a
  possible extension.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `scanStatus: Failed`, error mentions missing `solc` | Required compiler not installed under `solc-select`. | `uv run solc-select install X.Y.Z` (the error names the exact version). |
| `Slither was not found on PATH` | The uv environment is not active. | Run via `uv run python backend/security_scan.py …` or `source .venv/bin/activate`. |
| `Slither produced no JSON output` | A `solc` compile error prevented analysis. | Verify the contract compiles with the matching `solc` version. |
| Wrong `contractName` | Multi-contract source file. | Split the file or pass a single-contract file. |

## Programmatic use

```python
from pathlib import Path
from backend.security_scan import build_report

report = build_report(Path("test_contracts/VulnerableVault.sol"))
print(report["scanStatus"], len(report["vulnerabilities"]))
```

The normalisation helpers (`normalise_check_to_type`,
`normalise_impact_to_severity`, `extract_code_snippet`,
`extract_pragma_version`) are reusable if other backend services want to
ingest Slither output directly.

## Possible extensions

- Add Mythril as a second source and merge into `toolsUsed`.
- Wrap the CLI behind an HTTP / JSON service for the backend web layer.
- Support multi-file projects (Hardhat / Foundry layouts).
- Expand `DETECTOR_TYPE_MAP` (e.g. `controlled-delegatecall`, `shadowing-*`).
- Return a multi-line snippet window with line numbers for richer UI.
