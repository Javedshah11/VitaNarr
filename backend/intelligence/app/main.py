from fastapi import FastAPI
from pydantic import BaseModel

from app.api.extractions import router as extractions_router
from app.api.interviews import router as interviews_router


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

app.include_router(interviews_router)
app.include_router(extractions_router)


@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check() -> HealthResponse:
    return HealthResponse(status="ok", service="vitanarr-intelligence", version="0.1.0")
