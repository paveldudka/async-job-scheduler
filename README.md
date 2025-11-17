# NextJS Queue-Based Architecture Demo

Production-ready demonstration of asynchronous job processing using NextJS, Redis, BullMQ, and Server-Sent Events.

## Architecture

```
User → Next.js API → Redis Queue → Worker (Docker) → SSE Updates → Real-time UI
```

- **Next.js 16**: API routes + React 19 UI
- **Redis + BullMQ**: Job queue & pub/sub
- **Worker (Docker)**: Background job processor (max 5 concurrent)
- **SSE**: Real-time progress streaming

## Quick Start

### Local Development

Run entire stack with hot reload:

```bash
docker compose up --build
```

Access at `http://localhost:3000`

**Stop:**
```bash
docker compose down
```

**Clean restart (wipes Redis data):**
```bash
docker compose down -v
docker compose up --build
```

### Production

```bash
docker compose -f docker-compose.prod.yml up --build
```

## Features

✅ Create, monitor, cancel, retry, delete jobs
✅ Real-time SSE progress updates
✅ Concurrent processing (5 jobs max)
✅ Mock web agent actions (10s duration)
✅ Full TypeScript + tests (28 passing)

## API Endpoints

- `POST /api/jobs` - Create job
- `GET /api/jobs` - List all jobs
- `GET /api/jobs/[id]` - Job details
- `DELETE /api/jobs/[id]` - Delete job
- `POST /api/jobs/[id]/cancel` - Cancel job
- `POST /api/jobs/[id]/retry` - Retry failed job
- `GET /api/jobs/[id]/stream` - SSE endpoint

## Project Structure

```
app/api/jobs/          # REST API routes
components/            # React components
lib/                   # Redis & queue utilities
worker/                # BullMQ worker (Docker)
test/                  # Unit tests (Vitest)
```

## Environment

`.env.local`:
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
QUEUE_NAME=jobs
MAX_CONCURRENCY=5
```

## Testing

```bash
npm test              # Run tests
npm run test:watch    # Watch mode
```

28 tests covering API routes and queue operations.

## How It Works

1. **Job Created** → Added to Redis queue via BullMQ with `jobData` (id, name, createdAt)
2. **Worker Picks Up** → Processes for 10s with progress updates via `job.updateProgress()`
3. **Progress Published** → Worker event listeners → Redis pub/sub (`job:${id}:progress`)
4. **SSE Streams** → Server subscribes to Redis → Sends full `ApiJob` to browser
5. **UI Updates** → React state updates with complete job state via EventSource

## Tech Stack

Next.js 16 • React 19 • TypeScript • Tailwind CSS 4 • shadcn/ui • Redis • BullMQ • Docker

## License

MIT
