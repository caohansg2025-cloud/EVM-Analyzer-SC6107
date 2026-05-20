# Security Analysis Module

The security analysis module of the **EVM Transaction Debugger & Analyzer
(SC6107)** scans a local Solidity source file and emits a normalised JSON
report that the frontend consumes. The implementation is a thin wrapper
around [Slither](https://github.com/crytic/slither) plus a deterministic
schema mapping.

## Module purpose

- Accept a local Solidity contract path.
- Run static security analysis (Slither) against it.
- Normalise detector output into the project schema
  (`mock_data/security_response.json`).
- Print the report to stdout and optionally write it to a file.

## Installation

The project uses [`uv`](https://docs.astral.sh/uv/) for environment
management. From the repository root:

```bash
uv sync
```

This installs:

- `slither-analyzer` — static analyzer.
- `solc-select` — manages and switches between Solidity compiler versions.
- `pytest` — for running unit tests.

`solc-select` artefacts live under `.venv/.solc-select/`. Install the
compiler versions used by the fixtures (one-off):

```bash
uv run solc-select install 0.8.20
uv run solc-select install 0.7.6
```

The scanner auto-switches to the version declared in each contract's
`pragma solidity` directive, so you do not need to manually `solc-select use`
between scans.

## Running a scan

```bash
uv run python backend/security_scan.py test_contracts/VulnerableVault.sol --pretty
```

Common options:

| Flag | Description |
| --- | --- |
| `--pretty` | Indent the JSON output. |
| `--output PATH` | Also write the JSON to a file. |
| `--solc-version X.Y.Z` | Force a specific `solc` version (overrides pragma detection). |

Exit codes:

- `0` — scan completed (including `CompletedWithNoFindings`).
- `1` — scan failed (Slither error, missing `solc`, etc.); the JSON report still includes a structured `error` field.
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

Field reference:

- `contractAddress` — `null` for local source files.
- `contractName` — parsed from the first `contract` / `library` /
  `interface` declaration, falling back to the file stem.
- `scanStatus` — one of `Completed`, `CompletedWithNoFindings`, `Failed`.
- `toolsUsed` — analyzer label, includes the version when probable
  (e.g. `Slither v0.11.5`).
- `vulnerabilities[]` — normalised findings, sorted by severity then line.
- `id` — deterministic `ERR-001`, `ERR-002`, … assigned after sort.
- `type` — project-facing vulnerability category (see mapping below).
- `severity` — `High`, `Medium`, `Low`, `Informational`.
- `line` — primary line for the finding; `null` when unavailable.
- `description` — first line of Slither's description, cleaned up.
- `codeSnippet` — short source line at the reported location.

## Supported vulnerability categories

The detector-name → project-type mapping lives in
`backend/security_scan.py::DETECTOR_TYPE_MAP`. Initial coverage:

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

Severity mapping (`impact` → `severity`):

| Slither impact | Project severity |
| --- | --- |
| `High` | High |
| `Medium` | Medium |
| `Low` | Low |
| `Informational` | Informational |
| `Optimization` | Informational |

## Fixtures

Located in `test_contracts/`:

| File | Expected detection |
| --- | --- |
| `VulnerableVault.sol` | Reentrancy (`reentrancy-eth`, **High**). |
| `AccessControlBug.sol` | `suicidal`, `arbitrary-send-eth`, `tx-origin`. |
| `UncheckedCall.sol` | `unchecked-lowlevel`, `unchecked-send`. |
| `OverflowToken.sol` | Tautology on `>= 0` underflow check (Slither does not ship a generic overflow detector — see limitations). |

## Known limitations

- **Slither does not include a built-in arithmetic overflow detector.** It
  relies on the Solidity compiler. The `OverflowToken.sol` fixture is
  compiled with `solc 0.7.6` (no built-in checks) and surfaces as a
  *tautology* / *Logic Issue*, not as `overflow`. This is documented for
  transparency; the implementation deliberately does not fabricate
  findings.
- **Compiler version is required.** Slither shells out to `solc`. If
  `solc-select` does not have the version mentioned in the contract's
  pragma installed, the scanner reports `scanStatus: Failed` with a clear
  error pointing at the missing version.
- **Local source only.** This module does not fetch verified source from
  Etherscan or scan deployed bytecode. Those are listed as future work.
- **Findings depend on Slither's detector set.** Adding new categories
  amounts to extending `DETECTOR_TYPE_MAP`.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `scanStatus: Failed`, error mentions missing `solc` | The required compiler version is not installed under `solc-select`. | `uv run solc-select install X.Y.Z` (the error message includes the exact version). |
| `Slither was not found on PATH` | The uv environment is not active. | Run via `uv run python backend/security_scan.py …` or `source .venv/bin/activate`. |
| `Slither produced no JSON output` | A solc compilation error prevented analysis. | Check the contract compiles standalone with the matching `solc`. |
| Wrong contract name in output | Multi-contract source files; the scanner uses the first declared `contract`/`library`/`interface`. | Split the file or pass a single-contract file. |

## Programmatic use

```python
from pathlib import Path
from backend.security_scan import build_report

report = build_report(Path("test_contracts/VulnerableVault.sol"))
print(report["scanStatus"], len(report["vulnerabilities"]))
```

The same normalisation helpers (`normalise_check_to_type`,
`normalise_impact_to_severity`, `extract_code_snippet`) are exposed for
reuse if other backend services want to ingest Slither output directly.
