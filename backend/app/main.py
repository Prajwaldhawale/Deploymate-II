from fastapi import FastAPI
from sqlalchemy import text

from .database import Base, engine
from .models import Deployment, User
from .routes.deployments import router as deployment_router
from .routes.auth import router as auth_router
from .routes.assessments import router as assessment_router

Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="DeployMate-II API",
    version="0.1.0"
)

app.include_router(deployment_router)
app.include_router(auth_router)
app.include_router(assessment_router)

@app.get("/")
def root():
    return {
        "service": "DeployMate-II API",
        "status": "running",
        "version": "0.1.0"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "deploymate-backend"
    }


@app.get("/health/db")
def database_health_check():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    return {
        "status": "healthy",
        "database": "postgresql"
    }