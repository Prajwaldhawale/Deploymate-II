from typing import Any


def assess_deployment_risk(
    build_status: str,
    test_status: str,
    security_findings: dict[str, int] | None = None,
    recent_failures: int = 0,
    infrastructure_metrics: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Deterministically assess risk from available deployment evidence."""

    score = 0
    reasons: list[str] = []
    missing_evidence: list[str] = []

    findings = security_findings or {}
    metrics = infrastructure_metrics or {}

    build = build_status.strip().upper()
    tests = test_status.strip().upper()

    if build not in {"SUCCESS", "PASS"}:
        score += 50
        reasons.append("Build did not pass.")

    if tests not in {"SUCCESS", "PASS"}:
        score += 30
        reasons.append("Automated tests did not pass.")

    critical = max(0, int(findings.get("critical", 0)))
    high = max(0, int(findings.get("high", 0)))
    medium = max(0, int(findings.get("medium", 0)))

    if critical:
        score += 40
        reasons.append(f"{critical} critical security finding(s) detected.")

    if high:
        score += min(high * 15, 30)
        reasons.append(f"{high} high-severity security finding(s) detected.")

    if medium:
        score += min(medium * 5, 15)
        reasons.append(
            f"{medium} medium-severity security finding(s) detected."
        )

    if recent_failures > 0:
        score += min(recent_failures * 5, 20)
        reasons.append(
            f"{recent_failures} recent deployment failure(s) detected."
        )

    # Infrastructure values are only scored when actually supplied.
    for key in ("cpu_usage_percent", "memory_usage_percent",
                "disk_usage_percent"):
        value = metrics.get(key)

        if value is None:
            missing_evidence.append(key)
            continue

        try:
            value = float(value)
        except (TypeError, ValueError):
            missing_evidence.append(key)
            continue

        if not 0 <= value <= 100:
            missing_evidence.append(key)
            continue

        if value >= 95:
            score += 15
            reasons.append(f"Infrastructure metric {key} is critically high.")
        elif value >= 85:
            score += 10
            reasons.append(f"Infrastructure metric {key} is elevated.")

    score = min(score, 100)

    # Hard gates take precedence over the score.
    if build not in {"SUCCESS", "PASS"}:
        decision = "BLOCK"
    elif tests not in {"SUCCESS", "PASS"}:
        decision = "BLOCK"
    elif critical > 0:
        decision = "BLOCK"
    elif score >= 60:
        decision = "BLOCK"
    elif score >= 30:
        decision = "REVIEW"
    else:
        decision = "APPROVE"

    if not reasons:
        reasons.append(
            "Build and tests passed with no reported security findings "
            "or recent deployment failures."
        )

    return {
        "risk_score": score,
        "decision": decision,
        "reasons": reasons,
        "missing_evidence": missing_evidence,
    }
