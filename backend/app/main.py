from fastapi import FastAPI
from sqlalchemy import text

from .database import Base, engine
from .models.deployment import Deployment
from .routes.deployments import router as deployment_router


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="DeployMate-II API",
    version="0.1.0"
)

app.include_router(deployment_router)


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