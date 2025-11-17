# Async Job Scheduler Worker

BullMQ worker container for processing async jobs.

## Docker Hub

Published at: `paveldudka/async-job-scheduler-worker`

## Build & Push

```bash
# Build for linux/amd64 (from macOS)
docker buildx build --platform linux/amd64 -t paveldudka/async-job-scheduler-worker:latest -f worker/Dockerfile worker/

# Tag with version (optional)
docker tag paveldudka/async-job-scheduler-worker:latest paveldudka/async-job-scheduler-worker:1.0.0

# Login to Docker Hub
docker login

# Push latest
docker push paveldudka/async-job-scheduler-worker:latest

# Push version tag (optional)
docker push paveldudka/async-job-scheduler-worker:1.0.0
```

**Alternative: Build and push in one step**

```bash
docker buildx build --platform linux/amd64 --push -t paveldudka/async-job-scheduler-worker:latest -f worker/Dockerfile worker/
```

## Run

```bash
docker run -e REDIS_URL=redis://your-redis-host:6379 paveldudka/async-job-scheduler-worker:latest
```

## Environment Variables

- `REDIS_URL` - Redis connection URL (required)
- `QUEUE_NAME` - Queue name (default: `jobs`)
- `MAX_CONCURRENCY` - Max concurrent jobs (default: `5`)
- `NODE_ENV` - Environment (default: `production`)
