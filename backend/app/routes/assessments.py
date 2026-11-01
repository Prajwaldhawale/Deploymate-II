from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models.assessment import Assessment
from ..models.user import User
from ..schemas.assessment import (
    AssessmentCreate,
    AssessmentOverrideRequest,
    AssessmentResponse,
)
from ..security import get_current_user
from ..services.bedrock_service import analyze_assessment
from ..services.risk_engine import assess_deployment_risk, build_remediation_plan

router = APIRouter(prefix="/assessments", tags=["Assessments"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("", response_model=AssessmentResponse, status_code=201)
def create_assessment(
    payload: AssessmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    findings = payload.security_findings

    for severity in ("critical", "high", "medium", "low"):
        value = findings.get(severity, 0)
        if isinstance(value, bool) or not isinstance(value, int) or value < 0:
            raise HTTPException(
                status_code=422,
                detail=f"security_findings.{severity} must be a non-negative integer",
            )

    risk = assess_deployment_risk(
        build_status=payload.build_status,
        test_status=payload.test_status,
        security_findings=findings,
        recent_failures=payload.recent_failures,
        infrastructure_metrics=payload.infrastructure_metrics,
    )
    remediation_plan = build_remediation_plan(
        risk,
        payload.build_status,
        payload.test_status,
        findings,
        payload.recent_failures,
        payload.infrastructure_metrics,
    )

    evidence = {
        "project_name": payload.project_name,
        "commit_hash": payload.commit_hash,
        "branch": payload.branch,
        "environment": payload.environment,
        "build_status": payload.build_status,
        "test_status": payload.test_status,
        "security_findings": findings,
        "security_details": payload.security_details,
        "infrastructure_metrics": payload.infrastructure_metrics,
        "recent_failures": payload.recent_failures,
        "risk_score": risk["risk_score"],
        "decision": risk["decision"],
        "risk_reasons": risk["reasons"],
        "missing_evidence": risk["missing_evidence"],
        "deterministic_remediation_plan": remediation_plan,
    }

    # The AI explains the assessment; it cannot change the decision.
    ai = analyze_assessment(evidence)

    # Always retain deterministic, score-specific actions. Bedrock may add
    # package/CVE-level recommendations from scanner evidence, but cannot replace
    # the actions required by the gate.
    recommendations = list(remediation_plan[:3])
    for recommendation in ai["recommendations"]:
        if recommendation not in recommendations and len(recommendations) < 5:
            recommendations.append(recommendation)

    record = Assessment(
        user_id=current_user.id,
        project_name=payload.project_name,
        commit_hash=payload.commit_hash,
        branch=payload.branch,
        environment=payload.environment,
        build_status=payload.build_status,
        test_status=payload.test_status,
        security_findings={**findings, "details": payload.security_details},
        infrastructure_metrics=payload.infrastructure_metrics,
        recent_failures=payload.recent_failures,
        risk_score=risk["risk_score"],
        decision=risk["decision"],
        risk_reasons=risk["reasons"],
        ai_status=ai["status"],
        ai_summary=ai["summary"],
        ai_risk_factors=ai["risk_factors"],
        ai_recommendations=recommendations,
        ai_missing_evidence=ai["missing_evidence"],
        ai_confidence=ai["confidence"],
    )

    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("", response_model=list[AssessmentResponse])
def list_assessments(
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Assessment)
        .filter(Assessment.user_id == current_user.id)
        .order_by(Assessment.created_at.desc())
        .limit(limit)
        .all()
    )


@router.get("/{assessment_id}", response_model=AssessmentResponse)
def get_assessment(
    assessment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = (
        db.query(Assessment)
        .filter(
            Assessment.id == assessment_id,
            Assessment.user_id == current_user.id,
        )
        .first()
    )

    if record is None:
        raise HTTPException(status_code=404, detail="Assessment not found")

    return record


@router.post("/{assessment_id}/override", response_model=AssessmentResponse)
def override_assessment_decision(
    assessment_id: int,
    payload: AssessmentOverrideRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = (
        db.query(Assessment)
        .filter(
            Assessment.id == assessment_id,
            Assessment.user_id == current_user.id,
        )
        .first()
    )

    if record is None:
        raise HTTPException(status_code=404, detail="Assessment not found")

    record.decision = payload.decision
    reasons = list(record.risk_reasons or [])
    note = payload.note or f"Manual authorization executed by {current_user.email}"
    reasons.append(f"Admin Decision: {payload.decision} ({note})")
    record.risk_reasons = reasons

    db.commit()
    db.refresh(record)
    return record

