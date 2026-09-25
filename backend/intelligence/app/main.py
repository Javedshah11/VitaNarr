from fastapi import FastAPI
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


app = FastAPI(
    title="VitaNarr Intelligence Service",
    description="Local AI and data-processing service for VitaNarr.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)


@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check() -> HealthResponse:
    return HealthResponse(status="ok", service="vitanarr-intelligence", version="0.1.0")
