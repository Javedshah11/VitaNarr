import httpx
from fastapi.testclient import TestClient

from app.api.extractions import get_extraction_service
from app.core.config import Settings
from app.main import app
from app.providers.ollama import OllamaProvider
from app.schemas.extraction import ExtractionRequest
from app.services.extraction import ExtractionService

TOKEN = {"X-VitaNarr-Internal-Token": "development-only-internal-token-change-me"}


def payload() -> dict[str, object]:
    return {
        "language": "English",
        "answers": [
            {
                "id": "answer-1",
                "content": "In 2022, I built my first website and felt proud.",
            }
        ],
    }


def provider_with(content: str) -> OllamaProvider:
    transport = httpx.MockTransport(
        lambda request: httpx.Response(200, json={"message": {"content": content}})
    )
    return OllamaProvider(
        Settings(), httpx.AsyncClient(transport=transport, base_url="http://ollama")
    )


def test_extracts_only_source_backed_candidate() -> None:
    content = (
        '{"candidates":[{"source_answer_id":"answer-1",'
        '"title":"My First Website","description":"I built my first website in 2022.",'
        '"category":"achievement","event_date":"2022-01-01","date_precision":"year",'
        '"location":null,"evidence_quote":"I built my first website"}]}'
    )
    service = ExtractionService(provider_with(content))
    app.dependency_overrides[get_extraction_service] = lambda: service
    try:
        response = TestClient(app).post("/internal/extractions", json=payload(), headers=TOKEN)
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json()["candidates"][0]["source_answer_id"] == "answer-1"


def test_rejects_fabricated_evidence() -> None:
    content = (
        '{"candidates":[{"source_answer_id":"answer-1",'
        '"title":"A University Degree","description":"I earned a degree.",'
        '"category":"education","event_date":null,"date_precision":"unknown",'
        '"location":null,"evidence_quote":"I earned a degree"}]}'
    )
    service = ExtractionService(provider_with(content))
    app.dependency_overrides[get_extraction_service] = lambda: service
    try:
        response = TestClient(app).post("/internal/extractions", json=payload(), headers=TOKEN)
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 503


def test_extraction_schema_preserves_unknown_dates() -> None:
    request = ExtractionRequest.model_validate(payload())
    assert request.answers[0].content.endswith("proud.")


def test_returns_retryable_error_when_ollama_is_unavailable() -> None:
    transport = httpx.MockTransport(lambda request: httpx.Response(503))
    provider = OllamaProvider(
        Settings(), httpx.AsyncClient(transport=transport, base_url="http://ollama")
    )
    app.dependency_overrides[get_extraction_service] = lambda: ExtractionService(provider)
    try:
        response = TestClient(app).post("/internal/extractions", json=payload(), headers=TOKEN)
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 503
    assert response.headers["retry-after"] == "5"
