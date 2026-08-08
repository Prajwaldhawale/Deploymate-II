from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DeploymentCreate(BaseModel):
    commit_hash: str
    branch: str
    build_status: str
    test_status: str


class DeploymentResponse(BaseModel):
    id: int
    commit_hash: str
    branch: str
    build_status: str
    test_status: str
    decision: str | None
    risk_score: int | None
    ai_reasoning: str | None
    deployment_status: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)