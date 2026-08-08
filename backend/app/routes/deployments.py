from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models.deployment import Deployment
from ..schemas.deployment import DeploymentCreate, DeploymentResponse


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
    db: Session = Depends(get_db)
):
    new_deployment = Deployment(
        commit_hash=deployment.commit_hash,
        branch=deployment.branch,
        build_status=deployment.build_status,
        test_status=deployment.test_status,
        deployment_status="PENDING"
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
    db: Session = Depends(get_db)
):
    return (
        db.query(Deployment)
        .order_by(Deployment.created_at.desc())
        .all()
    )


@router.get(
    "/{deployment_id}",
    response_model=DeploymentResponse
)
def get_deployment(
    deployment_id: int,
    db: Session = Depends(get_db)
):
    deployment = (
        db.query(Deployment)
        .filter(Deployment.id == deployment_id)
        .first()
    )

    if not deployment:
        raise HTTPException(
            status_code=404,
            detail="Deployment not found"
        )

    return deployment