from secrets import compare_digest
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.core.config import Settings, get_settings
from app.providers.ollama import (
    InvalidModelOutputError,
    ModelUnavailableError,
    OllamaProvider,
)
from app.schemas.interview import GenerateQuestionRequest, SelectedQuestion
from app.services.interview import InterviewService

router = APIRouter(prefix="/internal/interviews", tags=["Internal interviews"])


SettingsDependency = Annotated[Settings, Depends(get_settings)]


def get_interview_service(settings: SettingsDependency) -> InterviewService:
    return InterviewService(OllamaProvider(settings))


InterviewServiceDependency = Annotated[InterviewService, Depends(get_interview_service)]


def verify_internal_token(
    settings: SettingsDependency,
    supplied_token: Annotated[str | None, Header(alias="X-VitaNarr-Internal-Token")] = None,
) -> None:
    if supplied_token is None or not compare_digest(
        supplied_token, settings.intelligence_internal_token
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal token",
        )


InternalAuthentication = Annotated[None, Depends(verify_internal_token)]


@router.post("/questions", response_model=SelectedQuestion)
async def generate_question(
    request: GenerateQuestionRequest,
    service: InterviewServiceDependency,
    _authentication: InternalAuthentication,
) -> SelectedQuestion:
    try:
        return await service.generate_question(request)
    except (ModelUnavailableError, InvalidModelOutputError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
            headers={"Retry-After": "5"},
        ) from exc
