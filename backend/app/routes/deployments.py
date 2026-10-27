from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models.deployment import Deployment
from ..models.user import User
from ..schemas.deployment import DeploymentCreate, DeploymentResponse
from ..security import get_current_user
from ..services.risk_engine import assess_deployment_risk


router = APIRouter(
    prefix="/deployments",
    tags=["Deployments"]
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


@router.post(
    "",
    response_model=DeploymentResponse,
    status_code=201
)
def create_deployment(
    deployment: DeploymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Calculate risk using the existing build and test results.
    assessment = assess_deployment_risk(
        build_status=deployment.build_status,
        test_status=deployment.test_status
    )

    new_deployment = Deployment(
        user_id=current_user.id,
        commit_hash=deployment.commit_hash,
        branch=deployment.branch,
        build_status=deployment.build_status,
        test_status=deployment.test_status,
        decision=assessment["decision"],
        risk_score=assessment["risk_score"],
        ai_reasoning=" ".join(assessment["reasons"]),
        deployment_status=(
            "BLOCKED"
            if assessment["decision"] == "BLOCK"
            else "PENDING"
        )
    )

    db.add(new_deployment)
    db.commit()
    db.refresh(new_deployment)

    return new_deployment


@router.get(
    "",
    response_model=list[DeploymentResponse]
)
def get_deployments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return (
        db.query(Deployment)
        .filter(Deployment.user_id == current_user.id)
        .order_by(Deployment.created_at.desc())
        .all()
    )


@router.get(
    "/{deployment_id}",
    response_model=DeploymentResponse
)
def get_deployment(
    deployment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deployment = (
        db.query(Deployment)
        .filter(
            Deployment.id == deployment_id,
            Deployment.user_id == current_user.id
        )
        .first()
    )

    if not deployment:
        raise HTTPException(
            status_code=404,
            detail="Deployment not found"
        )

    return deployment