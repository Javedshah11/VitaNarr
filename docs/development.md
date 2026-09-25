# Windows development workflow

## Prerequisites

- Node.js 24 and pnpm 11
- Python 3.13 managed by uv
- Docker Desktop with Docker Compose

## Setup

```powershell
Copy-Item .env.example .env
Copy-Item frontend\.env.example frontend\.env.local
Copy-Item backend\api\.env.example backend\api\.env
Copy-Item backend\intelligence\.env.example backend\intelligence\.env
pnpm install
uv sync --project backend\intelligence
```

Use a private local PostgreSQL password in `.env` and update `DATABASE_URL` consistently. Private environment files are ignored by Git.

## Local infrastructure

```powershell
pnpm docker:up
docker compose ps
pnpm docker:logs
pnpm docker:down
```

Docker provides PostgreSQL with pgvector on port 5432 and Redis on port 6379.

## Development

```powershell
pnpm dev
pnpm dev:frontend
pnpm dev:api
pnpm dev:intelligence
```

The frontend runs on port 3000, the API on 4000, and intelligence service on 8001.

## Quality checks

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check

uv run --project backend\intelligence python -m pytest -v
uv run --project backend\intelligence mypy backend\intelligence\app
uv run --project backend\intelligence ruff check backend\intelligence
```
