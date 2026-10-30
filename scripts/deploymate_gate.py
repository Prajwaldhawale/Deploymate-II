#!/usr/bin/env python3
"""
DeployMate-II CI/CD Gatekeeper CLI

Standalone, zero-dependency script designed to run inside CI/CD pipelines
(Jenkins, GitHub Actions, GitLab CI).

Gathers pipeline evidence (build status, test status, vulnerability reports,
system telemetry), submits them to the DeployMate-II Assessment API, formats the
deterministic decision and Amazon Bedrock AI explanation into the CI logs, and
returns an appropriate exit code:
  - Exit 0: APPROVE (or REVIEW when --fail-on-review is not set)
  - Exit 1: BLOCK
  - Exit 2: REVIEW (when --fail-on-review is set)
  - Exit 3: Network / API / System error
"""

import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from typing import Any, Dict, Optional, Tuple


def get_git_info() -> Tuple[str, str]:
    """Retrieve current commit hash and branch from environment or git."""
    commit = os.getenv("GIT_COMMIT")
    branch = os.getenv("GIT_BRANCH")

    if not commit:
        try:
            commit = (
                subprocess.check_output(
                    ["git", "rev-parse", "HEAD"], stderr=subprocess.DEVNULL
                )
                .decode()
                .strip()
            )
        except Exception:
            commit = "unknown-commit"

    if not branch:
        try:
            branch = (
                subprocess.check_output(
                    ["git", "rev-parse", "--abbrev-ref", "HEAD"],
                    stderr=subprocess.DEVNULL,
                )
                .decode()
                .strip()
            )
        except Exception:
            branch = "unknown-branch"

    return commit, branch


def parse_trivy_report(file_path: str) -> Dict[str, int]:
    """
    Parse a Trivy JSON scan report into DeployMate security findings count:
    {"critical": int, "high": int, "medium": int, "low": int}
    """
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}

    if not os.path.exists(file_path):
        print(f"[WARN] Trivy report not found at: {file_path}", file=sys.stderr)
        return counts

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        results = data.get("Results", [])
        if not results and isinstance(data, list):
            results = data

        for result in results:
            vulns = result.get("Vulnerabilities") or []
            for vuln in vulns:
                severity = str(vuln.get("Severity", "")).lower()
                if severity in counts:
                    counts[severity] += 1

    except Exception as exc:
        print(f"[WARN] Failed to parse Trivy report ({file_path}): {exc}", file=sys.stderr)

    return counts


def authenticate(api_url: str, email: str, password: str) -> str:
    """Authenticate with DeployMate-II to acquire a JWT token."""
    login_url = f"{api_url.rstrip('/')}/auth/login"
    payload = json.dumps({"email": email, "password": password}).encode("utf-8")

    req = urllib.request.Request(
        login_url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            token = data.get("access_token")
            if not token:
                raise ValueError("No access_token returned by auth endpoint")
            return token
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Authentication failed ({e.code}): {error_body}") from e
    except Exception as e:
        raise RuntimeError(f"Could not connect to DeployMate auth endpoint: {e}") from e


def submit_assessment(api_url: str, token: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Post assessment payload to DeployMate-II API."""
    endpoint = f"{api_url.rstrip('/')}/assessments"
    req_body = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(
        endpoint,
        data=req_body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Assessment submission failed ({e.code}): {error_body}") from e
    except Exception as e:
        raise RuntimeError(f"Could not connect to DeployMate assessment endpoint: {e}") from e


def print_banner(assessment: Dict[str, Any]):
    """Print an executive, formatted summary in the CI/CD console."""
    decision = str(assessment.get("decision", "UNKNOWN")).upper()
    risk_score = assessment.get("risk_score", 0)
    reasons = assessment.get("risk_reasons", [])
    findings = assessment.get("security_findings", {})
    ai_status = assessment.get("ai_status", "unavailable")
    ai_summary = assessment.get("ai_summary")
    ai_factors = assessment.get("ai_risk_factors", [])
    ai_recommendations = assessment.get("ai_recommendations", [])
    missing_evidence = assessment.get("ai_missing_evidence", [])
    confidence = assessment.get("ai_confidence", "N/A")

    if decision == "APPROVE":
        badge = "[✓ APPROVE] PASS - SAFE TO DEPLOY"
        border_char = "="
    elif decision == "REVIEW":
        badge = "[! REVIEW]  WARNING - MANUAL APPROVAL REQUIRED"
        border_char = "-"
    else:
        badge = "[✕ BLOCK]   FAIL - DEPLOYMENT BLOCKED"
        border_char = "="

    width = 76
    print("\n" + border_char * width)
    print(f"             DEPLOYMATE-II RELEASE GATEWAY ASSESSMENT")
    print(border_char * width)
    print(f" Project:      {assessment.get('project_name')}")
    print(f" Commit:       {assessment.get('commit_hash')} ({assessment.get('branch')})")
    print(f" Environment:  {assessment.get('environment')}")
    print(f" Assessment ID:#{assessment.get('id', 'N/A')}")
    print("-" * width)
    print(f" DECISION:     {badge}")
    print(f" RISK SCORE:   {risk_score} / 100")
    print(
        f" VULNERABILITIES: Critical={findings.get('critical', 0)} | "
        f"High={findings.get('high', 0)} | Med={findings.get('medium', 0)} | "
        f"Low={findings.get('low', 0)}"
    )

    if reasons:
        print("\n DETERMINISTIC GATE REASONS:")
        for r in reasons:
            print(f"   • {r}")

    if ai_status == "success" and ai_summary:
        print("-" * width)
        print(f" AI ADVISORY ANALYSIS (Amazon Bedrock - Confidence: {confidence}):")
        print(f"   {ai_summary.strip()}")

        if ai_factors:
            print("\n   Key Risk Factors:")
            for f in ai_factors:
                print(f"     - {f}")

        if ai_recommendations:
            print("\n   Actionable Recommendations:")
            for rec in ai_recommendations:
                print(f"     ✓ {rec}")

        if missing_evidence:
            print("\n   Missing Telemetry / Evidence:")
            for m in missing_evidence:
                print(f"     ? {m}")
    else:
        print("-" * width)
        print(f" AI Advisory: Not available ({ai_status})")

    print(border_char * width + "\n")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="DeployMate-II CI/CD Gatekeeper CLI - Automated Deployment Risk Gate"
    )
    # Target & API Options
    parser.add_argument(
        "--api-url",
        default=os.getenv("DEPLOYMATE_API_URL", "http://localhost:8000"),
        help="DeployMate-II API base URL (env: DEPLOYMATE_API_URL)",
    )
    parser.add_argument(
        "--token",
        default=os.getenv("DEPLOYMATE_TOKEN"),
        help="Pre-issued JWT bearer token (env: DEPLOYMATE_TOKEN)",
    )
    parser.add_argument(
        "--email",
        default=os.getenv("DEPLOYMATE_EMAIL"),
        help="DeployMate user email (env: DEPLOYMATE_EMAIL)",
    )
    parser.add_argument(
        "--password",
        default=os.getenv("DEPLOYMATE_PASSWORD"),
        help="DeployMate user password (env: DEPLOYMATE_PASSWORD)",
    )

    # Deployment Metadata
    parser.add_argument(
        "--project-name",
        default=os.getenv("JOB_NAME") or os.getenv("GITHUB_REPOSITORY") or "deploymate-target",
        help="Project or Repository Name",
    )
    parser.add_argument("--commit", help="Commit hash (defaults to git rev-parse)")
    parser.add_argument("--branch", help="Branch name (defaults to git rev-parse)")
    parser.add_argument(
        "--environment",
        default=os.getenv("DEPLOY_ENV", "staging"),
        help="Target environment (e.g. production, staging, dev)",
    )

    # Gates & Evidence
    parser.add_argument(
        "--build-status",
        choices=["SUCCESS", "PASS", "FAILED", "FAIL", "ERROR"],
        default="SUCCESS",
        help="Build execution status (default: SUCCESS)",
    )
    parser.add_argument(
        "--test-status",
        choices=["SUCCESS", "PASS", "FAILED", "FAIL", "ERROR"],
        default="PASS",
        help="Test execution status (default: PASS)",
    )

    # Security findings & Scanners
    parser.add_argument(
        "--trivy-json",
        help="Path to Trivy vulnerability scan JSON report to parse automatically",
    )
    parser.add_argument(
        "--security-findings",
        help="Direct JSON string with security findings: '{\"critical\": 0, \"high\": 1, ...}'",
    )
    parser.add_argument("--critical-vulns", type=int, default=None, help="Explicit critical vulnerability count")
    parser.add_argument("--high-vulns", type=int, default=None, help="Explicit high vulnerability count")
    parser.add_argument("--med-vulns", type=int, default=None, help="Explicit medium vulnerability count")
    parser.add_argument("--low-vulns", type=int, default=None, help="Explicit low vulnerability count")

    # Telemetry
    parser.add_argument("--cpu-usage", type=float, default=None, help="Target system CPU usage percent")
    parser.add_argument("--memory-usage", type=float, default=None, help="Target system Memory usage percent")
    parser.add_argument("--disk-usage", type=float, default=None, help="Target system Disk usage percent")
    parser.add_argument("--recent-failures", type=int, default=0, help="Count of recent failed deployments")

    # Policy Enforcement
    parser.add_argument(
        "--fail-on-review",
        action="store_true",
        help="Exit with code 2 if decision is REVIEW (default: only exit code 1 on BLOCK)",
    )
    parser.add_argument(
        "--output-file",
        help="Path to save the JSON assessment response for downstream CI steps",
    )

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    # 1. Resolve Git metadata
    default_commit, default_branch = get_git_info()
    commit_hash = args.commit or default_commit
    branch = args.branch or default_branch

    # 2. Resolve Security findings
    findings = {"critical": 0, "high": 0, "medium": 0, "low": 0}

    if args.trivy_json:
        findings = parse_trivy_report(args.trivy_json)

    if args.security_findings:
        try:
            custom_findings = json.loads(args.security_findings)
            for k in findings:
                if k in custom_findings:
                    findings[k] = int(custom_findings[k])
        except Exception as e:
            print(f"[ERROR] Failed to parse --security-findings JSON: {e}", file=sys.stderr)
            return 3

    # Explicit flag overrides
    if args.critical_vulns is not None:
        findings["critical"] = args.critical_vulns
    if args.high_vulns is not None:
        findings["high"] = args.high_vulns
    if args.med_vulns is not None:
        findings["medium"] = args.med_vulns
    if args.low_vulns is not None:
        findings["low"] = args.low_vulns

    # 3. Resolve Infrastructure metrics
    infra_metrics = {}
    if args.cpu_usage is not None:
        infra_metrics["cpu_usage_percent"] = args.cpu_usage
    if args.memory_usage is not None:
        infra_metrics["memory_usage_percent"] = args.memory_usage
    if args.disk_usage is not None:
        infra_metrics["disk_usage_percent"] = args.disk_usage

    # 4. Authenticate
    token = args.token
    if not token:
        if not args.email or not args.password:
            print(
                "[ERROR] Either --token or (--email and --password) must be provided "
                "(or set DEPLOYMATE_TOKEN or DEPLOYMATE_EMAIL/DEPLOYMATE_PASSWORD env vars).",
                file=sys.stderr,
            )
            return 3
        try:
            token = authenticate(args.api_url, args.email, args.password)
        except Exception as e:
            print(f"[ERROR] {e}", file=sys.stderr)
            return 3

    # 5. Build payload
    payload = {
        "project_name": args.project_name,
        "commit_hash": commit_hash,
        "branch": branch,
        "environment": args.environment,
        "build_status": args.build_status,
        "test_status": args.test_status,
        "security_findings": findings,
        "infrastructure_metrics": infra_metrics,
        "recent_failures": args.recent_failures,
    }

    # 6. Submit assessment
    try:
        assessment = submit_assessment(args.api_url, token, payload)
    except Exception as e:
        print(f"[ERROR] Assessment submission error: {e}", file=sys.stderr)
        return 3

    # 7. Print banner
    print_banner(assessment)

    # 8. Save output file if requested
    if args.output_file:
        try:
            with open(args.output_file, "w", encoding="utf-8") as f:
                json.dump(assessment, f, indent=2)
            print(f"[INFO] Assessment result exported to: {args.output_file}")
        except Exception as e:
            print(f"[WARN] Failed to write output file ({args.output_file}): {e}", file=sys.stderr)

    # 9. Evaluate exit code
    decision = str(assessment.get("decision", "")).upper()
    if decision == "APPROVE":
        return 0
    elif decision == "REVIEW":
        if args.fail_on_review:
            print("[GATE] Pipeline halted: Deployment requires manual review/approval (--fail-on-review enabled).")
            return 2
        print("[GATE] Warning: Risk score is elevated, but proceeding under non-blocking review mode.")
        return 0
    else:  # BLOCK
        print("[GATE] CRITICAL: Deployment BLOCKED by DeployMate-II risk gate.")
        return 1


if __name__ == "__main__":
    sys.exit(main())

