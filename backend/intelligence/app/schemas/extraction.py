from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.interview import MemoryCategory

DatePrecision = Literal["exact", "month", "year", "approximate", "unknown"]


class SourceAnswer(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(min_length=1, max_length=64)
    content: str = Field(min_length=1, max_length=20_000)


class ExtractionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    language: str = Field(min_length=1, max_length=64)
    answers: list[SourceAnswer] = Field(min_length=1, max_length=100)


class ExtractionCandidate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source_answer_id: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=180)
    description: str = Field(min_length=1, max_length=20_000)
    category: MemoryCategory
    event_date: date | None = None
    date_precision: DatePrecision = "unknown"
    location: str | None = Field(default=None, max_length=255)
    evidence_quote: str = Field(min_length=1, max_length=2000)

    @model_validator(mode="after")
    def validate_date(self) -> "ExtractionCandidate":
        if self.date_precision == "unknown" and self.event_date is not None:
            raise ValueError("Unknown dates cannot have an event date")
        if self.date_precision != "unknown" and self.event_date is None:
            raise ValueError("Known date precision requires an event date")
        return self


class ExtractionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    candidates: list[ExtractionCandidate] = Field(max_length=25)
