"""Unit tests for the security_scan module.

These tests cover normalisation helpers, snippet/pragma extraction, and
report assembly with a mocked slither invocation. They do NOT exercise the
real slither binary — that is handled by the integration commands in
``jz-work-doc/security_test_plan.md``.
"""

from __future__ import annotations

import io
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1].parent))

from backend import security_scan as ss  # noqa: E402  (path setup above)


# ---------------------------------------------------------------------------
# detector → type / impact → severity
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "check, expected",
    [
        ("reentrancy-eth", "Reentrancy"),
        ("reentrancy-no-eth", "Reentrancy"),
        ("unchecked-lowlevel", "Unchecked External Call"),
        ("unchecked-send", "Unchecked External Call"),
        ("low-level-calls", "Unchecked External Call"),
        ("arbitrary-send-eth", "Access Control Issue"),
        ("suicidal", "Access Control Issue"),
        ("tx-origin", "Access Control Issue"),
        ("incorrect-equality", "Logic Issue"),
        ("divide-before-multiply", "Arithmetic Precision Issue"),
        ("some-new-detector", "Some New Detector"),
        ("", "Unknown"),
    ],
)
def test_normalise_check_to_type(check, expected):
    assert ss.normalise_check_to_type(check) == expected


@pytest.mark.parametrize(
    "impact, expected",
    [
        ("High", "High"),
        ("Medium", "Medium"),
        ("Low", "Low"),
        ("Informational", "Informational"),
        ("Optimization", "Informational"),
        (None, "Informational"),
        ("Unknown", "Informational"),
    ],
)
def test_normalise_impact_to_severity(impact, expected):
    assert ss.normalise_impact_to_severity(impact) == expected


# ---------------------------------------------------------------------------
# snippet / contract-name / pragma extraction
# ---------------------------------------------------------------------------


def _write(tmp_path: Path, name: str, body: str) -> Path:
    path = tmp_path / name
    path.write_text(body, encoding="utf-8")
    return path


def test_extract_code_snippet_basic(tmp_path):
    src = _write(tmp_path, "A.sol", "line 1\n    interesting();\nline 3\n")
    assert ss.extract_code_snippet(src, 2) == "interesting();"


def test_extract_code_snippet_truncates_long_line(tmp_path):
    long_line = "x = " + "a" * 500 + ";"
    src = _write(tmp_path, "A.sol", long_line + "\n")
    result = ss.extract_code_snippet(src, 1, max_length=50)
    assert result.endswith("...")
    assert len(result) <= 50


def test_extract_code_snippet_falls_back_to_nearest_non_empty(tmp_path):
    src = _write(tmp_path, "A.sol", "code();\n\n\nmore();\n")
    assert ss.extract_code_snippet(src, 2) == "code();"


def test_extract_code_snippet_returns_empty_for_missing_file(tmp_path):
    assert ss.extract_code_snippet(tmp_path / "ghost.sol", 5) == ""


def test_extract_code_snippet_returns_empty_for_none_line(tmp_path):
    src = _write(tmp_path, "A.sol", "x;\n")
    assert ss.extract_code_snippet(src, None) == ""


def test_extract_contract_name_from_source(tmp_path):
    src = _write(
        tmp_path,
        "Sample.sol",
        "// SPDX\npragma solidity ^0.8.20;\ncontract MyVault { }\n",
    )
    assert ss.extract_contract_name(src) == "MyVault"


def test_extract_contract_name_handles_library(tmp_path):
    src = _write(tmp_path, "L.sol", "library SafeStuff {}\n")
    assert ss.extract_contract_name(src) == "SafeStuff"


def test_extract_contract_name_falls_back_to_stem(tmp_path):
    src = _write(tmp_path, "NoDecl.sol", "// no contract here\n")
    assert ss.extract_contract_name(src) == "NoDecl"


@pytest.mark.parametrize(
    "pragma, expected",
    [
        ("pragma solidity ^0.8.20;", "0.8.20"),
        ("pragma solidity 0.7.6;", "0.7.6"),
        ("pragma solidity >=0.6.0 <0.7.0;", "0.6.0"),
        ("pragma solidity ^0.4;", "0.4.0"),
    ],
)
def test_extract_pragma_version(tmp_path, pragma, expected):
    src = _write(tmp_path, "P.sol", f"{pragma}\ncontract X {{}}\n")
    assert ss.extract_pragma_version(src) == expected


def test_extract_pragma_version_missing(tmp_path):
    src = _write(tmp_path, "P.sol", "contract X {}\n")
    assert ss.extract_pragma_version(src) is None


# ---------------------------------------------------------------------------
# element selection
# ---------------------------------------------------------------------------


def test_pick_primary_element_prefers_node():
    elements = [
        {"type": "function", "source_mapping": {"lines": [10, 11, 12]}},
        {"type": "node", "source_mapping": {"lines": [11]}},
    ]
    chosen = ss._pick_primary_element(elements)
    assert chosen["type"] == "node"


def test_pick_primary_element_uses_smallest_when_no_node():
    elements = [
        {"type": "contract", "source_mapping": {"lines": [1, 2, 3, 4]}},
        {"type": "function", "source_mapping": {"lines": [3]}},
    ]
    chosen = ss._pick_primary_element(elements)
    assert chosen["type"] == "function"


def test_pick_primary_element_empty():
    assert ss._pick_primary_element([]) is None


# ---------------------------------------------------------------------------
# normalise_findings + ordering + ID assignment
# ---------------------------------------------------------------------------


def test_normalise_findings_orders_by_severity_then_line(tmp_path):
    src = _write(
        tmp_path,
        "F.sol",
        "line1\nline2\nline3\nline4\nline5\nline6\n",
    )
    detectors = [
        {
            "check": "solc-version",
            "impact": "Informational",
            "description": "Version note",
            "elements": [{"type": "pragma", "source_mapping": {"lines": [1]}}],
        },
        {
            "check": "reentrancy-eth",
            "impact": "High",
            "description": "Reentrancy here",
            "elements": [{"type": "node", "source_mapping": {"lines": [4]}}],
        },
        {
            "check": "unchecked-lowlevel",
            "impact": "Medium",
            "description": "Unchecked call",
            "elements": [{"type": "node", "source_mapping": {"lines": [3]}}],
        },
    ]
    vulns = ss.normalise_findings(detectors, src)
    assert [v.id for v in vulns] == ["ERR-001", "ERR-002", "ERR-003"]
    assert [v.severity for v in vulns] == ["High", "Medium", "Informational"]
    assert [v.type for v in vulns] == [
        "Reentrancy",
        "Unchecked External Call",
        "Compiler Version",
    ]
    assert vulns[0].line == 4
    assert vulns[0].codeSnippet == "line4"


def test_normalise_findings_handles_missing_lines(tmp_path):
    src = _write(tmp_path, "F.sol", "only line\n")
    detectors = [
        {
            "check": "naming-convention",
            "impact": "Informational",
            "description": "minor naming",
            "elements": [],
        }
    ]
    vulns = ss.normalise_findings(detectors, src)
    assert vulns[0].line is None
    assert vulns[0].codeSnippet == ""
    assert vulns[0].id == "ERR-001"


def test_summarise_description_collapses_multiline():
    raw = "Reentrancy in Foo.bar():\n\tExternal calls:\n\t- call()"
    assert ss._summarise_description(raw) == "Reentrancy in Foo.bar()"


# ---------------------------------------------------------------------------
# build_report — with run_slither monkeypatched
# ---------------------------------------------------------------------------


def test_build_report_success(tmp_path, monkeypatch):
    src = _write(
        tmp_path,
        "Sample.sol",
        "pragma solidity ^0.8.20;\ncontract Sample { function f() public {} }\n",
    )
    monkeypatch.setattr(ss, "ensure_solc_version", lambda v: None)
    monkeypatch.setattr(ss, "detect_tool_version", lambda: "Slither v0.11.5")
    monkeypatch.setattr(
        ss,
        "run_slither",
        lambda path: {
            "success": True,
            "error": None,
            "results": {
                "detectors": [
                    {
                        "check": "reentrancy-eth",
                        "impact": "High",
                        "description": "Reentrancy in Sample.f()",
                        "elements": [
                            {"type": "node", "source_mapping": {"lines": [2]}}
                        ],
                    }
                ]
            },
        },
    )
    report = ss.build_report(src)
    assert report["contractName"] == "Sample"
    assert report["scanStatus"] == "Completed"
    assert report["toolsUsed"] == ["Slither v0.11.5"]
    assert report["contractAddress"] is None
    assert len(report["vulnerabilities"]) == 1
    v = report["vulnerabilities"][0]
    assert v["id"] == "ERR-001"
    assert v["type"] == "Reentrancy"
    assert v["severity"] == "High"


def test_build_report_no_findings(tmp_path, monkeypatch):
    src = _write(tmp_path, "Clean.sol", "pragma solidity ^0.8.20;\ncontract Clean {}\n")
    monkeypatch.setattr(ss, "ensure_solc_version", lambda v: None)
    monkeypatch.setattr(ss, "detect_tool_version", lambda: "Slither")
    monkeypatch.setattr(
        ss, "run_slither",
        lambda path: {"success": True, "error": None, "results": {"detectors": []}},
    )
    report = ss.build_report(src)
    assert report["scanStatus"] == "CompletedWithNoFindings"
    assert report["vulnerabilities"] == []


def test_build_report_scanner_failure(tmp_path, monkeypatch):
    src = _write(tmp_path, "X.sol", "pragma solidity ^0.8.20;\ncontract X {}\n")
    monkeypatch.setattr(ss, "ensure_solc_version", lambda v: None)
    monkeypatch.setattr(ss, "detect_tool_version", lambda: "Slither")

    def boom(_path):
        raise ss.ScannerError("slither exploded")

    monkeypatch.setattr(ss, "run_slither", boom)
    report = ss.build_report(src)
    assert report["scanStatus"] == "Failed"
    assert "slither exploded" in report["error"]
    assert report["vulnerabilities"] == []


def test_build_report_solc_missing(tmp_path, monkeypatch):
    src = _write(tmp_path, "X.sol", "pragma solidity ^0.4.0;\ncontract X {}\n")
    monkeypatch.setattr(ss, "ensure_solc_version", lambda v: "solc 0.4.0 missing")
    monkeypatch.setattr(ss, "detect_tool_version", lambda: "Slither")
    report = ss.build_report(src)
    assert report["scanStatus"] == "Failed"
    assert "0.4.0" in report["error"]


# ---------------------------------------------------------------------------
# CLI error paths
# ---------------------------------------------------------------------------


def test_cli_missing_file(capsys):
    rc = ss.main(["test_contracts/__definitely_missing__.sol"])
    captured = capsys.readouterr()
    assert rc == 2
    assert "not found" in captured.err.lower()


def test_cli_non_solidity_input(capsys, tmp_path):
    bogus = _write(tmp_path, "thing.txt", "hello")
    rc = ss.main([str(bogus)])
    captured = capsys.readouterr()
    assert rc == 2
    assert ".sol" in captured.err.lower()


def test_cli_success_writes_json(monkeypatch, capsys, tmp_path):
    src = _write(tmp_path, "Sample.sol", "pragma solidity ^0.8.20;\ncontract Sample {}\n")
    monkeypatch.setattr(ss, "ensure_solc_version", lambda v: None)
    monkeypatch.setattr(ss, "detect_tool_version", lambda: "Slither")
    monkeypatch.setattr(
        ss, "run_slither",
        lambda p: {"success": True, "error": None, "results": {"detectors": []}},
    )
    out_path = tmp_path / "out" / "report.json"
    rc = ss.main([str(src), "--output", str(out_path), "--pretty"])
    captured = capsys.readouterr()
    assert rc == 0
    payload = json.loads(captured.out)
    assert payload["contractName"] == "Sample"
    assert payload["scanStatus"] == "CompletedWithNoFindings"
    assert out_path.exists()
    on_disk = json.loads(out_path.read_text())
    assert on_disk == payload
