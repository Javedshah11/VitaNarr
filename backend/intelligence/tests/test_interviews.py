import httpx
from fastapi.testclient import TestClient

from app.api.interviews import get_interview_service
from app.core.config import Settings
from app.main import app
from app.providers.ollama import OllamaProvider
from app.schemas.interview import SelectedQuestion
from app.services.interview import InterviewService


class StubInterviewService(InterviewService):
    async def generate_question(self, request):  # type: ignore[no-untyped-def]
        return SelectedQuestion(
            question="What did your teacher do that helped you feel comfortable?",
            category="education",
            strategy="follow_up",
            target_topic="education",
        )


def request_body() -> dict[str, object]:
    return {
        "language": "English",
        "focus_area": "School years",
        "conversation": [
            {
                "question": "Tell me about your earliest school memory?",
                "answer": "My teacher helped me feel comfortable.",
                "skipped": False,
            }
        ],
        "memories": [],
    }


def headers() -> dict[str, str]:
    return {"X-VitaNarr-Internal-Token": "development-only-internal-token-change-me"}


def test_generates_a_structured_question_without_ollama() -> None:
    app.dependency_overrides[get_interview_service] = lambda: StubInterviewService(None)  # type: ignore[arg-type]
    try:
        response = TestClient(app).post(
            "/internal/interviews/questions", json=request_body(), headers=headers()
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "question": "What did your teacher do that helped you feel comfortable?",
        "category": "education",
        "strategy": "follow_up",
        "target_topic": "education",
    }


def test_uses_safe_fallback_for_invalid_model_output() -> None:
    invalid_content = '{"question":"You went to school.","category":"education"}'
    transport = httpx.MockTransport(
        lambda request: httpx.Response(
            200,
            json={"message": {"content": invalid_content}},
        )
    )
    provider = OllamaProvider(
        Settings(), httpx.AsyncClient(transport=transport, base_url="http://ollama")
    )
    app.dependency_overrides[get_interview_service] = lambda: InterviewService(provider)
    try:
        response = TestClient(app).post(
            "/internal/interviews/questions", json=request_body(), headers=headers()
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["strategy"] == "fallback"
    assert response.json()["question"].endswith("?")


def test_returns_retryable_error_when_ollama_is_unavailable() -> None:
    transport = httpx.MockTransport(lambda request: httpx.Response(503))
    provider = OllamaProvider(
        Settings(), httpx.AsyncClient(transport=transport, base_url="http://ollama")
    )
    app.dependency_overrides[get_interview_service] = lambda: InterviewService(provider)
    try:
        response = TestClient(app).post(
            "/internal/interviews/questions", json=request_body(), headers=headers()
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.json()["detail"] == "The local language model is unavailable"


def test_rejects_calls_without_the_internal_token() -> None:
    response = TestClient(app).post("/internal/interviews/questions", json=request_body())
    assert response.status_code == 401
