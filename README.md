# VitaNarr

**Live it. Tell it. Preserve it.**

VitaNarr is a local-first, AI-powered autobiography and life-story platform. This repository currently provides the production-oriented engineering foundation; product features are intentionally deferred.

## Architecture

```text
Browser
  -> Next.js frontend
  -> NestJS API
       -> PostgreSQL + pgvector
       -> Redis
       -> FastAPI intelligence service
            -> local AI systems (planned)
```

The NestJS API is the security and business-logic boundary. The browser never connects directly to PostgreSQL, Redis, or Python.

## Technology stack

| Layer        | Technology                               | Status                                            |
| ------------ | ---------------------------------------- | ------------------------------------------------- |
| Frontend     | Next.js, React, TypeScript, Tailwind CSS | IMPLEMENTED foundation                            |
| Main API     | NestJS, TypeScript, Helmet, Pino         | IMPLEMENTED foundation                            |
| Intelligence | FastAPI, Python 3.13, uv                 | IMPLEMENTED foundation                            |
| Database     | PostgreSQL, pgvector, Drizzle ORM        | IMPLEMENTED infrastructure; domain schema PLANNED |
| Cache / jobs | Redis; BullMQ later                      | Redis infrastructure IMPLEMENTED; jobs PLANNED    |
| Local AI     | Ollama and qwen3                         | PLANNED                                           |
| Speech       | Local Whisper-compatible implementation  | PLANNED                                           |
| Containers   | Docker Compose                           | IMPLEMENTED for PostgreSQL and Redis              |

Authentication, users, memories, interviews, books, RAG, embeddings, transcription, and publishing are not implemented.

## Repository

```text
frontend/               Next.js browser application
backend/api/            NestJS application API
backend/intelligence/   FastAPI intelligence service
shared/contracts/       Shared TypeScript contracts
infrastructure/docker/  Local container initialization
storage/                Ignored local runtime data
docs/                   Architecture and development guides
```

## Requirements

- Windows 11 with PowerShell
- Node.js 24
- pnpm 11
- Python 3.13 managed by uv
- Docker Desktop with Docker Compose

## Installation

```powershell
pnpm install
uv sync --project backend\intelligence
Copy-Item .env.example .env
Copy-Item frontend\.env.example frontend\.env.local
Copy-Item backend\api\.env.example backend\api\.env
Copy-Item backend\intelligence\.env.example backend\intelligence\.env
```

Replace local placeholders in private `.env` files. Never commit those files.

## Development

```powershell
pnpm docker:up
pnpm dev
```

Individual services:

```powershell
pnpm dev:frontend
pnpm dev:api
pnpm dev:intelligence
```

| Service             | URL                              |
| ------------------- | -------------------------------- |
| Frontend            | http://localhost:3000            |
| API                 | http://localhost:4000/api        |
| API health          | http://localhost:4000/api/health |
| Intelligence        | http://127.0.0.1:8001            |
| Intelligence health | http://127.0.0.1:8001/health     |
| PostgreSQL          | localhost:5432                   |
| Redis               | localhost:6379                   |

## Validation and builds

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check

uv run --project backend\intelligence python -m pytest -v
uv run --project backend\intelligence mypy backend\intelligence\app
uv run --project backend\intelligence ruff check backend\intelligence

docker compose config
docker compose ps
```

See [architecture](docs/architecture.md) and [Windows development](docs/development.md) for boundary and workflow details.
