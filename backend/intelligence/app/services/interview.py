import re
from typing import Literal

from app.providers.ollama import InvalidModelOutputError, OllamaProvider
from app.schemas.interview import (
    GenerateQuestionRequest,
    MemoryCategory,
    SelectedQuestion,
)

TOPIC_ORDER: tuple[MemoryCategory, ...] = (
    "childhood",
    "family",
    "education",
    "friendship",
    "career",
    "achievement",
    "challenge",
    "celebration",
    "travel",
    "other",
)

FALLBACK_QUESTIONS: dict[MemoryCategory, str] = {
    "childhood": "Is there another childhood experience you would like to preserve?",
    "family": "Would you like to share a family experience that feels meaningful to you?",
    "education": "Would you like to describe an educational experience that shaped you?",
    "friendship": "Would you like to tell me about a friendship that mattered to you?",
    "career": "Would you like to share a work experience that influenced your journey?",
    "travel": "Would you like to preserve a memory connected to a place or journey?",
    "celebration": "Would you like to describe a celebration that remains meaningful to you?",
    "challenge": "Is there a challenge you feel comfortable discussing and preserving?",
    "achievement": "Would you like to share an achievement that was meaningful to you?",
    "other": "What other experience would you like to include in your life story?",
}


class InterviewService:
    def __init__(self, provider: OllamaProvider) -> None:
        self.provider = provider

    async def generate_question(self, request: GenerateQuestionRequest) -> SelectedQuestion:
        target, strategy = self._select_strategy(request)
        previous = [turn.question for turn in request.conversation]
        if strategy == "fallback":
            return SelectedQuestion(
                question="Would you like to continue with another part of your life story?",
                category="other",
                strategy="fallback",
                target_topic="other",
            )
        for _attempt in range(2):
            try:
                candidate = await self.provider.generate_question(request, target)
            except InvalidModelOutputError:
                continue
            if candidate.category == target and not self._is_repetitive(
                candidate.question, previous
            ):
                return SelectedQuestion(
                    **candidate.model_dump(),
                    strategy=strategy,
                    target_topic=target,
                )
        fallback = FALLBACK_QUESTIONS[target]
        if self._is_repetitive(fallback, previous):
            fallback = "What experience feels most important for your life story to explore next?"
            target = "other"
        return SelectedQuestion(
            question=fallback,
            category=target,
            strategy="fallback",
            target_topic=target,
        )

    def _select_strategy(
        self, request: GenerateQuestionRequest
    ) -> tuple[MemoryCategory, Literal["follow_up", "explore_topic", "fallback"]]:
        coverage = {item.category: item for item in request.topic_coverage}
        allowed = [
            topic
            for topic in TOPIC_ORDER
            if coverage.get(topic) is None or coverage[topic].status != "skipped"
        ]
        if not allowed:
            return "other", "fallback"

        preferred = (request.focus_area or "").strip().casefold()
        preferred_topic = next((topic for topic in allowed if topic == preferred), None)
        if preferred_topic is not None:
            return preferred_topic, "explore_topic"

        last = request.conversation[-1]
        last_topic = self._last_answered_topic(request)
        if last.answer and len(last.answer.split()) >= 6 and last_topic in allowed:
            item = coverage.get(last_topic)
            if item is None or item.answers_received < 2:
                return last_topic, "follow_up"

        ranked = sorted(
            allowed,
            key=lambda topic: (
                coverage[topic].answers_received if topic in coverage else 0,
                TOPIC_ORDER.index(topic),
            ),
        )
        return ranked[0], "explore_topic"

    def _last_answered_topic(self, request: GenerateQuestionRequest) -> MemoryCategory:
        for item in reversed(request.topic_coverage):
            if item.questions_asked > 0:
                return item.category
        return "other"

    def _is_repetitive(self, candidate: str, previous: list[str]) -> bool:
        candidate_tokens = self._tokens(candidate)
        if not candidate_tokens:
            return True
        for question in previous:
            tokens = self._tokens(question)
            union = candidate_tokens | tokens
            if union and len(candidate_tokens & tokens) / len(union) >= 0.55:
                return True
        return False

    def _tokens(self, value: str) -> set[str]:
        return set(re.findall(r"[a-z0-9]+", value.casefold()))
