from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = (
        "postgresql://deploymate:deploymate_dev@localhost:5432/deploymate"
    )

    secret_key: str = "deploymate-dev-secret-change-in-production"

    algorithm: str = "HS256"

    access_token_expire_minutes: int = 60


settings = Settings()