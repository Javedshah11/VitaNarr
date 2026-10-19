from collections.abc import Iterable

import pytest

from app.providers.ollama import InvalidModelOutputError
from app.schemas.interview import GeneratedQuestion, GenerateQuestionRequest, MemoryCategory
from app.services.interview import InterviewService


class SequenceProvider:
    def __init__(self, results: Iterable[GeneratedQuestion | Exception]) -> None:
        self.results = iter(results)
        self.targets: list[MemoryCategory] = []

    async def generate_question(
        self, request: GenerateQuestionRequest, target: MemoryCategory
    ) -> GeneratedQuestion:
        self.targets.append(target)
        result = next(self.results)
        if isinstance(result, Exception):
            raise result
        return result


def context(**overrides: object) -> GenerateQuestionRequest:
    payload: dict[str, object] = {
        "language": "English",
        "conversation": [
            {
                "question": "What is an early memory you would like to preserve?",
                "answer": "I remember building kites with my older brother every summer.",
                "skipped": False,
            }
        ],
        "topic_coverage": [
            {
                "category": "childhood",
                "status": "exploring",
                "questions_asked": 1,
                "answers_received": 1,
                "user_boundary": False,
            }
        ],
    }
    payload.update(overrides)
    return GenerateQuestionRequest.model_validate(payload)


@pytest.mark.asyncio
async def test_prioritizes_a_meaningful_follow_up() -> None:
    provider = SequenceProvider(
        [
            GeneratedQuestion(
                question="What did you enjoy most about building those kites?",
                category="childhood",
            )
        ]
    )
    result = await InterviewService(provider).generate_question(context())  # type: ignore[arg-type]
    assert result.strategy == "follow_up"
    assert provider.targets == ["childhood"]


@pytest.mark.asyncio
async def test_avoids_skipped_topics_and_explores_an_unknown_stage_conditionally() -> None:
    provider = SequenceProvider(
        [
            GeneratedQuestion(
                question="Would you like to share an educational experience?",
                category="education",
            )
        ]
    )
    request = context(
        conversation=[
            {
                "question": "Would you like to discuss family experiences?",
                "answer": None,
                "skipped": True,
            }
        ],
        topic_coverage=[
            {
                "category": "childhood",
                "status": "covered",
                "questions_asked": 2,
                "answers_received": 2,
                "user_boundary": False,
            },
            {
                "category": "family",
                "status": "skipped",
                "questions_asked": 1,
                "answers_received": 0,
                "user_boundary": True,
            },
        ],
    )
    result = await InterviewService(provider).generate_question(request)  # type: ignore[arg-type]
    assert result.category == "education"
    assert "family" not in provider.targets


@pytest.mark.asyncio
async def test_retries_repetition_then_uses_safe_fallback() -> None:
    repeated = GeneratedQuestion(
        question="What is an early memory you would like to preserve?", category="childhood"
    )
    provider = SequenceProvider([repeated, InvalidModelOutputError("invalid")])
    result = await InterviewService(provider).generate_question(context())  # type: ignore[arg-type]
    assert result.strategy == "fallback"
    assert result.question != repeated.question


@pytest.mark.asyncio
async def test_exhausted_topics_return_a_neutral_fallback_without_model_call() -> None:
    provider = SequenceProvider([])
    coverage = [
        {
            "category": topic,
            "status": "skipped",
            "questions_asked": 1,
            "answers_received": 0,
            "user_boundary": True,
        }
        for topic in (
            "childhood",
            "family",
            "education",
            "friendship",
            "career",
            "travel",
            "celebration",
            "challenge",
            "achievement",
            "other",
        )
    ]
    result = await InterviewService(provider).generate_question(  # type: ignore[arg-type]
        context(topic_coverage=coverage)
    )
    assert result.strategy == "fallback"
    assert provider.targets == []
