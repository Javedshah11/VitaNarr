from functools import lru_cache

from pydantic import HttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ollama_base_url: HttpUrl = HttpUrl("http://localhost:11434")
    ollama_model: str = "qwen3:8b"
    ollama_timeout_seconds: float = 30.0
    intelligence_internal_token: str = "development-only-internal-token-change-me"


@lru_cache
def get_settings() -> Settings:
    return Settings()
