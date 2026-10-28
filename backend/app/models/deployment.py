from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Deployment(Base):
    __tablename__ = "deployments"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False
    )

    commit_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False
    )

    branch: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    build_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    test_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    decision: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True
    )

    risk_score: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    ai_reasoning: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    deployment_status: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )