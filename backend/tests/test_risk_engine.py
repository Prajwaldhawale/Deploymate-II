from app.services.risk_engine import assess_deployment_risk


def test_approve_when_all_pass():
    result = assess_deployment_risk(
        build_status="SUCCESS",
        test_status="PASS",
        security_findings={"critical": 0, "high": 0, "medium": 0, "low": 0},
        recent_failures=0,
    )
    assert result["decision"] == "APPROVE"
    assert result["risk_score"] == 0


def test_block_when_build_fails():
    result = assess_deployment_risk(
        build_status="FAIL",
        test_status="PASS",
    )
    assert result["decision"] == "BLOCK"
    assert result["risk_score"] >= 50
    assert any("Build did not pass" in r for r in result["reasons"])


def test_block_when_tests_fail():
    result = assess_deployment_risk(
        build_status="SUCCESS",
        test_status="FAIL",
    )
    assert result["decision"] == "BLOCK"
    assert any("Automated tests did not pass" in r for r in result["reasons"])


def test_block_when_critical_vulnerabilities_exist():
    result = assess_deployment_risk(
        build_status="SUCCESS",
        test_status="PASS",
        security_findings={"critical": 1, "high": 0},
    )
    assert result["decision"] == "BLOCK"
    assert any("critical security finding" in r for r in result["reasons"])


def test_review_on_elevated_risk():
    # High findings add 15 points each (max 30), medium add 5 each -> 35 points -> REVIEW
    result = assess_deployment_risk(
        build_status="SUCCESS",
        test_status="PASS",
        security_findings={"critical": 0, "high": 2, "medium": 1},
    )
    assert result["decision"] == "REVIEW"
    assert 30 <= result["risk_score"] < 60


def test_infrastructure_metrics_evaluation():
    result = assess_deployment_risk(
        build_status="SUCCESS",
        test_status="PASS",
        infrastructure_metrics={
            "cpu_usage_percent": 96.5,
            "memory_usage_percent": 88.0,
        },
    )
    # CPU >= 95 adds 15, Memory >= 85 adds 10 = 25 points -> APPROVE (score < 30)
    assert result["risk_score"] == 25
    assert any("critically high" in r for r in result["reasons"])
    assert any("elevated" in r for r in result["reasons"])
