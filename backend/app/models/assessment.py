from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )

    project_name: Mapped[str] = mapped_column(String(150), nullable=False)
    commit_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    branch: Mapped[str] = mapped_column(String(100), nullable=False)
    environment: Mapped[str] = mapped_column(
        String(50), default="unknown", nullable=False
    )

    build_status: Mapped[str] = mapped_column(String(30), nullable=False)
    test_status: Mapped[str] = mapped_column(String(30), nullable=False)

    security_findings: Mapped[dict] = mapped_column(
        JSON, default=dict, nullable=False
    )
    infrastructure_metrics: Mapped[dict] = mapped_column(
        JSON, default=dict, nullable=False
    )
    recent_failures: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )

    risk_score: Mapped[int] = mapped_column(Integer, nullable=False)
    decision: Mapped[str] = mapped_column(String(30), nullable=False)
    risk_reasons: Mapped[list] = mapped_column(JSON, nullable=False)

    ai_status: Mapped[str] = mapped_column(
        String(30), default="pending", nullable=False
    )
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_risk_factors: Mapped[list] = mapped_column(
        JSON, default=list, nullable=False
    )
    ai_recommendations: Mapped[list] = mapped_column(
        JSON, default=list, nullable=False
    )
    ai_missing_evidence: Mapped[list] = mapped_column(
        JSON, default=list, nullable=False
    )
    ai_confidence: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
