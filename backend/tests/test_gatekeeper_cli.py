import json
import tempfile
import pytest
from scripts.deploymate_gate import parse_trivy_report, get_git_info, build_parser


def test_parse_trivy_report():
    sample_trivy = {
        "SchemaVersion": 2,
        "Results": [
            {
                "Target": "requirements.txt",
                "Class": "lang-pkgs",
                "Type": "pip",
                "Vulnerabilities": [
                    {
                        "VulnerabilityID": "CVE-2023-1111",
                        "PkgName": "urllib3",
                        "Severity": "CRITICAL",
                    },
                    {
                        "VulnerabilityID": "CVE-2023-2222",
                        "PkgName": "cryptography",
                        "Severity": "HIGH",
                    },
                    {
                        "VulnerabilityID": "CVE-2023-3333",
                        "PkgName": "requests",
                        "Severity": "HIGH",
                    },
                    {
                        "VulnerabilityID": "CVE-2023-4444",
                        "PkgName": "flask",
                        "Severity": "MEDIUM",
                    },
                    {
                        "VulnerabilityID": "CVE-2023-5555",
                        "PkgName": "certifi",
                        "Severity": "LOW",
                    },
                ],
            }
        ],
    }

    with tempfile.NamedTemporaryFile("w+", suffix=".json", delete=False) as f:
        json.dump(sample_trivy, f)
        temp_path = f.name

    try:
        findings = parse_trivy_report(temp_path)
        assert findings == {
            "critical": 1,
            "high": 2,
            "medium": 1,
            "low": 1,
        }
    finally:
        import os
        if os.path.exists(temp_path):
            os.remove(temp_path)


def test_parse_trivy_report_missing_file():
    findings = parse_trivy_report("/non/existent/file.json")
    assert findings == {"critical": 0, "high": 0, "medium": 0, "low": 0}


def test_get_git_info():
    commit, branch = get_git_info()
    assert isinstance(commit, str) and len(commit) > 0
    assert isinstance(branch, str) and len(branch) > 0


def test_cli_parser_defaults():
    parser = build_parser()
    args = parser.parse_args(["--token", "dummy-token"])
    assert args.build_status == "SUCCESS"
    assert args.test_status == "PASS"
    assert args.environment == "staging"
    assert args.fail_on_review is False

