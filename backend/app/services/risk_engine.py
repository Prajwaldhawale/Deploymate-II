from typing import Any


def assess_deployment_risk(
    build_status: str,
    test_status: str,
    security_findings: dict[str, int] | None = None,
    recent_failures: int = 0,
) -> dict[str, Any]:
    """
    Deterministically assess deployment risk.

    Returns a risk score from 0 to 100, a decision,
    and the reasons behind that decision.
    """

    score = 0
    reasons: list[str] = []
    security_findings = security_findings or {}

    build = build_status.strip().upper()
    tests = test_status.strip().upper()

    # Mandatory build gate
    if build not in {"SUCCESS", "PASS"}:
        score += 50
        reasons.append("Build did not pass.")

    # Mandatory test gate
    if tests not in {"SUCCESS", "PASS"}:
        score += 30
        reasons.append("Automated tests did not pass.")

    critical = max(0, security_findings.get("critical", 0))
    high = max(0, security_findings.get("high", 0))
    medium = max(0, security_findings.get("medium", 0))

    if critical:
        score += 40
        reasons.append(
            f"{critical} critical security finding(s) detected."
        )

    if high:
        score += min(high * 15, 30)
        reasons.append(
            f"{high} high-severity security finding(s) detected."
        )

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

    score = min(score, 100)

    # Hard gates override the numeric score.
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
    }