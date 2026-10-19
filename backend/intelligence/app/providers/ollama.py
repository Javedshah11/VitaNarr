import json

import httpx

from app.core.config import Settings
from app.schemas.extraction import ExtractionRequest, ExtractionResponse
from app.schemas.interview import GeneratedQuestion, GenerateQuestionRequest, MemoryCategory


class ModelUnavailableError(RuntimeError):
    pass


class InvalidModelOutputError(RuntimeError):
    pass


class OllamaProvider:
    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self.settings = settings
        self.client = client

    async def generate_question(
        self, request: GenerateQuestionRequest, target_topic: MemoryCategory
    ) -> GeneratedQuestion:
        prompt = self._prompt(request, target_topic)
        owns_client = self.client is None
        client = self.client or httpx.AsyncClient(timeout=self.settings.ollama_timeout_seconds)
        try:
            response = await client.post(
                f"{str(self.settings.ollama_base_url).rstrip('/')}/api/chat",
                json={
                    "model": self.settings.ollama_model,
                    "stream": False,
                    "format": GeneratedQuestion.model_json_schema(),
                    "messages": [{"role": "user", "content": prompt}],
                    "options": {"temperature": 0.4},
                },
            )
            response.raise_for_status()
            content = response.json()["message"]["content"]
            return GeneratedQuestion.model_validate(json.loads(content))
        except (httpx.HTTPError, KeyError, TypeError) as exc:
            raise ModelUnavailableError("The local language model is unavailable") from exc
        except (json.JSONDecodeError, ValueError) as exc:
            raise InvalidModelOutputError("The model returned an invalid question") from exc
        finally:
            if owns_client:
                await client.aclose()

    async def extract_memories(self, request: ExtractionRequest) -> ExtractionResponse:
        prompt = (
            "Extract only explicit autobiographical memories from the supplied original answers. "
            "Every candidate must reference exactly one supplied answer id and include a verbatim "
            "evidence quote from that answer. Never infer unstated people, places, dates, motives, "
            "or events. Preserve uncertainty: use date_precision unknown with no date unless the "
            "answer supplies date information. Return JSON matching the schema.\n\n"
            f"Original answers:\n{request.model_dump_json()}"
        )
        owns_client = self.client is None
        client = self.client or httpx.AsyncClient(timeout=self.settings.ollama_timeout_seconds)
        try:
            response = await client.post(
                f"{str(self.settings.ollama_base_url).rstrip('/')}/api/chat",
                json={
                    "model": self.settings.ollama_model,
                    "stream": False,
                    "format": ExtractionResponse.model_json_schema(),
                    "messages": [{"role": "user", "content": prompt}],
                    "options": {"temperature": 0.1},
                },
            )
            response.raise_for_status()
            content = response.json()["message"]["content"]
            return ExtractionResponse.model_validate(json.loads(content))
        except (httpx.HTTPError, KeyError, TypeError) as exc:
            raise ModelUnavailableError("The local language model is unavailable") from exc
        except (json.JSONDecodeError, ValueError) as exc:
            raise InvalidModelOutputError("The model returned invalid extractions") from exc
        finally:
            if owns_client:
                await client.aclose()

    def _prompt(self, request: GenerateQuestionRequest, target_topic: MemoryCategory) -> str:
        context = request.model_dump_json(exclude_none=True)
        return (
            "You are VitaNarr's careful life interviewer. Ask exactly one concise, empathetic "
            f"question about the selected topic '{target_topic}' in the requested language. "
            "Use only details explicitly present "
            "in the supplied conversation or memories. Never assert names, dates, places, "
            "relationships, or events that are not supplied. Ask a question; do not summarize, "
            "diagnose, advise, or invent facts. Return only JSON matching the provided schema.\n\n"
            "Only user answers that are not skipped and confirmed memories are factual evidence. "
            "Previous interviewer questions, skipped turns, topic labels, and focus areas are "
            "instructions or conversation structure, not proof that an event happened. "
            "Do not ask about any topic marked skipped. Set category to the selected topic. "
            "Avoid repeating or paraphrasing any previous question.\n\n"
            f"Authorized context:\n{context}"
        )
