from secrets import compare_digest
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.core.config import Settings, get_settings
from app.providers.ollama import InvalidModelOutputError, ModelUnavailableError, OllamaProvider
from app.schemas.extraction import ExtractionRequest, ExtractionResponse
from app.services.extraction import ExtractionService

router = APIRouter(prefix="/internal/extractions", tags=["Internal extractions"])
SettingsDependency = Annotated[Settings, Depends(get_settings)]


def get_extraction_service(settings: SettingsDependency) -> ExtractionService:
    return ExtractionService(OllamaProvider(settings))


ServiceDependency = Annotated[ExtractionService, Depends(get_extraction_service)]


def verify_token(
    settings: SettingsDependency,
    token: Annotated[str | None, Header(alias="X-VitaNarr-Internal-Token")] = None,
) -> None:
    if token is None or not compare_digest(token, settings.intelligence_internal_token):
        raise HTTPException(status_code=401, detail="Invalid internal token")


Authentication = Annotated[None, Depends(verify_token)]


@router.post("", response_model=ExtractionResponse)
async def extract_memories(
    request: ExtractionRequest,
    service: ServiceDependency,
    _authentication: Authentication,
) -> ExtractionResponse:
    try:
        return await service.extract(request)
    except (ModelUnavailableError, InvalidModelOutputError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
            headers={"Retry-After": "5"},
        ) from exc
