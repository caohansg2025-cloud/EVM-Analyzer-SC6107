"""Security analysis CLI for the EVM Transaction Debugger & Analyzer (SC6107).

Runs Slither against a local Solidity source file and emits a normalised
JSON report that matches the frontend data contract in
``mock_data/security_response.json``.

Usage:
    uv run python backend/security_scan.py test_contracts/VulnerableVault.sol
    uv run python backend/security_scan.py path/to/Foo.sol --pretty
    uv run python backend/security_scan.py path/to/Foo.sol --output out.json
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

# --- public schema constants -------------------------------------------------

SCHEMA_VERSION = "1.0"
DEFAULT_TOOL_NAME = "Slither"

# Slither check name -> project-facing vulnerability type.
# Prefix matches (``startswith``) are supported via the trailing ``*`` form.
DETECTOR_TYPE_MAP: dict[str, str] = {
    "reentrancy-*": "Reentrancy",
    "unchecked-lowlevel": "Unchecked External Call",
    "unchecked-send": "Unchecked External Call",
    "unchecked-transfer": "Unchecked External Call",
    "low-level-calls": "Unchecked External Call",
    "arbitrary-send-*": "Access Control Issue",
    "suicidal": "Access Control Issue",
    "tx-origin": "Access Control Issue",
    "incorrect-equality": "Logic Issue",
    "tautology": "Logic Issue",
    "tautological-compare": "Logic Issue",
    "divide-before-multiply": "Arithmetic Precision Issue",
    "weak-prng": "Weak Randomness",
    "timestamp": "Block Timestamp Dependence",
    "solc-version": "Compiler Version",
    "pragma": "Compiler Version",
}

IMPACT_SEVERITY_MAP: dict[str, str] = {
    "High": "High",
    "Medium": "Medium",
    "Low": "Low",
    "Informational": "Informational",
    "Optimization": "Informational",
}


# --- helpers -----------------------------------------------------------------


def normalise_check_to_type(check: str) -> str:
    """Map a Slither detector check name to a project vulnerability type."""
    if not check:
        return "Unknown"
    # exact match first
    if check in DETECTOR_TYPE_MAP:
        return DETECTOR_TYPE_MAP[check]
    # prefix wildcard match
    for key, value in DETECTOR_TYPE_MAP.items():
        if key.endswith("*") and check.startswith(key[:-1]):
            return value
    # fallback: convert detector name to Title Case ("foo-bar-baz" -> "Foo Bar Baz")
    return " ".join(part.capitalize() for part in re.split(r"[-_]", check) if part)


def normalise_impact_to_severity(impact: str | None) -> str:
    if not impact:
        return "Informational"
    return IMPACT_SEVERITY_MAP.get(impact, "Informational")


def _pick_primary_element(elements: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Choose the most specific source element from a detector finding.

    Prefer ``node`` elements (statements) over ``function``/``contract``
    elements; otherwise pick the element with the fewest reported lines.
    """
    if not elements:
        return None
    nodes = [e for e in elements if e.get("type") == "node"]
    candidates = nodes or elements
    return min(
        candidates,
        key=lambda e: (
            len((e.get("source_mapping") or {}).get("lines") or []) or 10**6
        ),
    )


def _line_for_element(element: dict[str, Any] | None) -> int | None:
    if not element:
        return None
    lines = (element.get("source_mapping") or {}).get("lines") or []
    return lines[0] if lines else None


def extract_code_snippet(
    source_path: Path,
    line: int | None,
    max_length: int = 200,
    window: int = 2,
) -> str:
    """Return a short snippet around ``line`` from ``source_path``.

    Falls back to the nearest non-empty line if the exact line is blank.
    """
    if line is None or not source_path.exists():
        return ""
    try:
        text = source_path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""
    lines = text.splitlines()
    if not lines:
        return ""
    idx = max(0, min(len(lines) - 1, line - 1))
    snippet = lines[idx].strip()
    if not snippet:
        for offset in range(1, window + 1):
            for candidate in (idx - offset, idx + offset):
                if 0 <= candidate < len(lines) and lines[candidate].strip():
                    snippet = lines[candidate].strip()
                    break
            if snippet:
                break
    if len(snippet) > max_length:
        snippet = snippet[: max_length - 3].rstrip() + "..."
    return snippet


def _summarise_description(raw: str) -> str:
    """Collapse Slither's multi-line description into a single readable line."""
    if not raw:
        return ""
    first_line = raw.strip().splitlines()[0].strip()
    return first_line.rstrip(":")


_PRAGMA_PATTERN = re.compile(
    r"pragma\s+solidity\s+([^;]+);",
    re.IGNORECASE,
)
_VERSION_TOKEN = re.compile(r"\b(\d+)\.(\d+)(?:\.(\d+))?\b")


def extract_pragma_version(source_path: Path) -> str | None:
    """Return the first concrete X.Y.Z version mentioned in a pragma.

    Slither relies on a matching ``solc`` binary; ``^0.8.20`` resolves to
    ``0.8.20`` which is what we hand to ``solc-select``.
    """
    try:
        text = source_path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None
    match = _PRAGMA_PATTERN.search(text)
    if not match:
        return None
    constraint = match.group(1)
    token = _VERSION_TOKEN.search(constraint)
    if not token:
        return None
    major, minor, patch = token.group(1), token.group(2), token.group(3) or "0"
    return f"{major}.{minor}.{patch}"


def ensure_solc_version(version: str) -> str | None:
    """Switch ``solc-select`` to ``version`` if installed; return error msg on failure.

    Returns ``None`` on success (or when the active version already matches).
    """
    exe = shutil.which("solc-select")
    if not exe:
        return None  # solc-select not installed; let slither try whatever solc is on PATH
    env = _subprocess_env(shutil.which("slither"))
    try:
        current = subprocess.run(
            [exe, "versions"],
            capture_output=True,
            text=True,
            timeout=15,
            env=env,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    stdout = current.stdout or ""
    if f"{version} (current" in stdout:
        return None
    if version not in stdout:
        return (
            f"solc {version} is not installed under solc-select. "
            f"Install it with: uv run solc-select install {version}"
        )
    try:
        result = subprocess.run(
            [exe, "use", version],
            capture_output=True,
            text=True,
            timeout=30,
            env=env,
            check=False,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        return f"failed to switch solc-select to {version}: {exc}"
    if result.returncode != 0:
        return f"solc-select use {version} failed: {(result.stderr or '').strip()}"
    return None


def extract_contract_name(source_path: Path, fallback: str | None = None) -> str:
    """Parse the first ``contract`` / ``library`` / ``interface`` declaration."""
    try:
        text = source_path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return fallback or source_path.stem
    match = re.search(
        r"^\s*(?:abstract\s+)?(?:contract|library|interface)\s+([A-Za-z_]\w*)",
        text,
        flags=re.MULTILINE,
    )
    if match:
        return match.group(1)
    return fallback or source_path.stem


def detect_tool_version(slither_path: str | None = None) -> str:
    """Return ``"Slither vX.Y.Z"`` if version can be probed, else ``"Slither"``."""
    exe = slither_path or shutil.which("slither")
    if not exe:
        return DEFAULT_TOOL_NAME
    try:
        result = subprocess.run(
            [exe, "--version"],
            capture_output=True,
            text=True,
            timeout=15,
            env=_subprocess_env(exe),
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return DEFAULT_TOOL_NAME
    version = (result.stdout or result.stderr or "").strip().splitlines()
    if version:
        return f"{DEFAULT_TOOL_NAME} v{version[0].strip()}"
    return DEFAULT_TOOL_NAME


def _subprocess_env(slither_exe: str | None) -> dict[str, str]:
    """Build an env where slither's bin dir is on PATH (for the ``solc`` shim)."""
    env = os.environ.copy()
    if slither_exe:
        bin_dir = os.path.dirname(os.path.abspath(slither_exe))
        existing = env.get("PATH", "")
        if bin_dir and bin_dir not in existing.split(os.pathsep):
            env["PATH"] = bin_dir + os.pathsep + existing if existing else bin_dir
    return env


# --- normalisation -----------------------------------------------------------


@dataclass
class Vulnerability:
    id: str
    type: str
    severity: str
    line: int | None
    description: str
    codeSnippet: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "type": self.type,
            "severity": self.severity,
            "line": self.line,
            "description": self.description,
            "codeSnippet": self.codeSnippet,
        }


_SEVERITY_ORDER = {"High": 0, "Medium": 1, "Low": 2, "Informational": 3}


def normalise_findings(
    detectors: Iterable[dict[str, Any]],
    source_path: Path,
) -> list[Vulnerability]:
    """Convert Slither detector dicts to project ``Vulnerability`` records."""
    vulns: list[Vulnerability] = []
    for detector in detectors:
        check = detector.get("check", "") or ""
        impact = detector.get("impact")
        element = _pick_primary_element(detector.get("elements") or [])
        line = _line_for_element(element)
        snippet = extract_code_snippet(source_path, line)
        description = _summarise_description(detector.get("description", "") or "")
        vulns.append(
            Vulnerability(
                id="",  # filled in after sorting
                type=normalise_check_to_type(check),
                severity=normalise_impact_to_severity(impact),
                line=line,
                description=description,
                codeSnippet=snippet,
            )
        )
    # Order by severity (High first) then by line number for stable output.
    vulns.sort(
        key=lambda v: (
            _SEVERITY_ORDER.get(v.severity, 99),
            v.line if v.line is not None else 10**6,
            v.type,
        )
    )
    for index, vuln in enumerate(vulns, start=1):
        vuln.id = f"ERR-{index:03d}"
    return vulns


# --- slither invocation ------------------------------------------------------


class ScannerError(Exception):
    """Raised when slither cannot produce usable output."""


def run_slither(source_path: Path) -> dict[str, Any]:
    """Invoke slither and return its parsed JSON report.

    Slither's exit code reflects the number of findings, so we treat any
    valid JSON on stdout as a success regardless of return code.
    """
    slither_exe = shutil.which("slither")
    if not slither_exe:
        raise ScannerError(
            "Slither was not found on PATH. Install with `uv sync` or "
            "`pip install slither-analyzer`."
        )
    cmd = [slither_exe, str(source_path), "--json", "-"]
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=180,
            env=_subprocess_env(slither_exe),
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise ScannerError(f"Slither timed out after {exc.timeout}s.") from exc
    except OSError as exc:
        raise ScannerError(f"Failed to launch Slither: {exc}") from exc

    stdout = result.stdout or ""
    if not stdout.strip():
        stderr_tail = (result.stderr or "").strip().splitlines()[-5:]
        raise ScannerError(
            "Slither produced no JSON output. "
            + ("Last stderr lines: " + " | ".join(stderr_tail) if stderr_tail else "")
        )
    try:
        return json.loads(stdout)
    except json.JSONDecodeError as exc:
        raise ScannerError(f"Slither output was not valid JSON: {exc}") from exc


# --- report construction -----------------------------------------------------


def build_report(source_path: Path, *, solc_version: str | None = None) -> dict[str, Any]:
    """Run a scan and return the normalised report dictionary.

    If ``solc_version`` is provided, the matching solc-select binary is
    activated before invoking slither. Otherwise the version is inferred
    from the contract's ``pragma solidity`` directive when possible.
    """
    contract_name = extract_contract_name(source_path)
    tool_label = detect_tool_version()
    base_report: dict[str, Any] = {
        "contractAddress": None,
        "contractName": contract_name,
        "scanStatus": "Completed",
        "toolsUsed": [tool_label],
        "vulnerabilities": [],
    }
    target_version = solc_version or extract_pragma_version(source_path)
    if target_version:
        err = ensure_solc_version(target_version)
        if err:
            base_report["scanStatus"] = "Failed"
            base_report["error"] = err
            return base_report
    try:
        raw = run_slither(source_path)
    except ScannerError as exc:
        base_report["scanStatus"] = "Failed"
        base_report["error"] = str(exc)
        return base_report

    if not raw.get("success", True):
        base_report["scanStatus"] = "Failed"
        base_report["error"] = raw.get("error") or "Slither reported failure."
        return base_report

    detectors = ((raw.get("results") or {}).get("detectors")) or []
    vulns = normalise_findings(detectors, source_path)
    base_report["vulnerabilities"] = [v.to_dict() for v in vulns]
    base_report["scanStatus"] = (
        "Completed" if vulns else "CompletedWithNoFindings"
    )
    return base_report


# --- CLI ---------------------------------------------------------------------


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="security_scan",
        description=(
            "Run a Slither-based security scan on a local Solidity contract "
            "and emit JSON matching the SC6107 security_response schema."
        ),
    )
    parser.add_argument(
        "contract",
        help="Path to a Solidity (.sol) source file.",
    )
    parser.add_argument(
        "-o",
        "--output",
        help="Write JSON output to this file in addition to stdout.",
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print JSON with indentation.",
    )
    parser.add_argument(
        "--solc-version",
        dest="solc_version",
        help=(
            "Force a specific solc version via solc-select (e.g. 0.7.6). "
            "If omitted, the version is inferred from the contract's pragma."
        ),
    )
    return parser


def _validate_input(raw_path: str) -> Path:
    path = Path(raw_path)
    if not path.exists():
        raise SystemExit(f"error: contract file not found: {path}")
    if not path.is_file():
        raise SystemExit(f"error: path is not a file: {path}")
    if path.suffix.lower() != ".sol":
        raise SystemExit(
            f"error: expected a Solidity (.sol) file, got: {path.name}"
        )
    return path


def _emit(report: dict[str, Any], *, output: str | None, pretty: bool) -> None:
    indent = 2 if pretty else None
    text = json.dumps(report, indent=indent, ensure_ascii=False)
    sys.stdout.write(text + "\n")
    if output:
        out_path = Path(output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(text + "\n", encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    try:
        source_path = _validate_input(args.contract)
    except SystemExit as exc:
        # Argparse-style: print to stderr and return non-zero without traceback.
        print(exc, file=sys.stderr)
        return 2
    report = build_report(source_path, solc_version=args.solc_version)
    _emit(report, output=args.output, pretty=args.pretty)
    return 0 if report.get("scanStatus") != "Failed" else 1


if __name__ == "__main__":
    sys.exit(main())
