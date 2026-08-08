from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = (
        "postgresql://deploymate:deploymate_dev@localhost:5432/deploymate"
    )


settings = Settings()