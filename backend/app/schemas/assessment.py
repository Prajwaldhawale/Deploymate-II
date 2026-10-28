from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class AssessmentCreate(BaseModel):
    project_name: str = Field(min_length=1, max_length=150)
    commit_hash: str = Field(min_length=1, max_length=64)
    branch: str = Field(min_length=1, max_length=100)
    environment: str = Field(default="unknown", max_length=50)

    build_status: Literal["SUCCESS", "PASS", "FAILED", "FAIL", "ERROR"]
    test_status: Literal["SUCCESS", "PASS", "FAILED", "FAIL", "ERROR"]

    security_findings: dict[str, int] = Field(default_factory=dict)
    infrastructure_metrics: dict[str, Any] = Field(default_factory=dict)
    recent_failures: int = Field(default=0, ge=0, le=1000)


class AssessmentResponse(BaseModel):
    id: int
    project_name: str
    commit_hash: str
    branch: str
    environment: str
    build_status: str
    test_status: str
    security_findings: dict
    infrastructure_metrics: dict
    recent_failures: int
    risk_score: int
    decision: str
    risk_reasons: list
    ai_status: str
    ai_summary: str | None
    ai_risk_factors: list
    ai_recommendations: list
    ai_missing_evidence: list
    ai_confidence: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
