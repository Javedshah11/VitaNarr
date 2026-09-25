# VitaNarr architecture

VitaNarr uses explicit service boundaries so that security, business logic, and local AI workloads can evolve independently.

```text
Browser
  -> Next.js frontend
  -> NestJS API
       -> PostgreSQL + pgvector
       -> Redis
       -> FastAPI intelligence service
            -> Ollama, embeddings, and speech systems (planned)
```

## Responsibilities

- **Frontend:** Presentation, browser-safe validation, and calls to the NestJS API. It never receives database, Redis, or private AI credentials.
- **NestJS API:** The security and business-logic boundary. It will own authentication and authorization, coordinate persistence and jobs, and broker intelligence requests.
- **FastAPI intelligence service:** Isolated AI and data-processing workloads. It does not own user identity or authorization. Future retrieved documents are untrusted data and must never be treated as system instructions.
- **PostgreSQL:** Future canonical source of truth. `pgvector` supports planned local embedding search.
- **Redis:** Local cache and future background-job transport. BullMQ queues are planned, not implemented.

The frontend cannot call Python or infrastructure directly because doing so would bypass centralized authorization, validation, rate limiting, and audit boundaries in the NestJS API.

## Current scope

Implemented: service scaffolds, health endpoints, environment validation, database/Redis client foundations, local infrastructure, and automated foundation tests.

Planned: authentication, domain schemas, BullMQ jobs, Ollama, qwen3, Whisper-compatible transcription, local embeddings, pgvector retrieval, RAG, agents, memory extraction, and chapter writing.
