from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

MemoryCategory = Literal[
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
]
TopicStatus = Literal["unexplored", "exploring", "covered", "skipped"]


class ConversationTurn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str = Field(min_length=1, max_length=1000)
    answer: str | None = Field(default=None, max_length=20_000)
    skipped: bool = False


class MemoryContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=180)
    description: str = Field(min_length=1, max_length=4000)
    category: MemoryCategory
    event_date: str | None = None
    location: str | None = Field(default=None, max_length=255)


class TopicCoverage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    category: MemoryCategory
    status: TopicStatus
    questions_asked: int = Field(ge=0)
    answers_received: int = Field(ge=0)
    user_boundary: bool = False


class GenerateQuestionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    language: str = Field(min_length=1, max_length=64)
    focus_area: str | None = Field(default=None, max_length=100)
    conversation: list[ConversationTurn] = Field(min_length=1, max_length=50)
    memories: list[MemoryContext] = Field(default_factory=list, max_length=20)
    topic_coverage: list[TopicCoverage] = Field(default_factory=list, max_length=10)


class GeneratedQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str = Field(min_length=10, max_length=500)
    category: MemoryCategory

    @field_validator("question")
    @classmethod
    def question_must_be_safe(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if not normalized.endswith("?"):
            raise ValueError("Generated interview text must be a question")
        if normalized.count("?") != 1:
            raise ValueError("Generate exactly one question")
        return normalized


class SelectedQuestion(GeneratedQuestion):
    strategy: Literal["follow_up", "explore_topic", "fallback"]
    target_topic: MemoryCategory
