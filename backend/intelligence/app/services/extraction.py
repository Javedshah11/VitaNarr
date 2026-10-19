from app.providers.ollama import InvalidModelOutputError, OllamaProvider
from app.schemas.extraction import ExtractionRequest, ExtractionResponse


class ExtractionService:
    def __init__(self, provider: OllamaProvider) -> None:
        self.provider = provider

    async def extract(self, request: ExtractionRequest) -> ExtractionResponse:
        result = await self.provider.extract_memories(request)
        sources = {answer.id: answer.content for answer in request.answers}
        verified = []
        for candidate in result.candidates:
            source = sources.get(candidate.source_answer_id)
            if source is None:
                continue
            if candidate.evidence_quote.casefold() not in source.casefold():
                continue
            verified.append(candidate)
        if result.candidates and not verified:
            raise InvalidModelOutputError("No extraction candidate had valid source evidence")
        return ExtractionResponse(candidates=verified)
