# NextJS Queue-Based Architecture Demo - Execution Plan

## Architecture Overview
- **Frontend**: NextJS 16 + React 19 (existing UI)
- **Queue**: Redis + BullMQ (max 5 concurrent jobs)
- **Worker**: Separate Docker container
- **Real-time**: SSE for job status updates
- **Monitoring**: Bull Board dashboard
- **Job Type**: Demo 10s task with 1s progress updates (web agent actions)
- **Retention**: Manual deletion only

---

## Phase 1: Infrastructure Setup ✅
**Status**: Completed (2025-11-15)

### Tasks
1. Create `docker-compose.yml` with Redis + Worker containers
2. Add dependencies: `ioredis`, `bullmq`, `@bull-board/api`, `@bull-board/nextjs`
3. Create `.env.local` with Redis connection config
4. Add `lib/redis.ts` - Redis client singleton
5. Add `lib/queue.ts` - BullMQ queue config (concurrency: 5)
6. Test Redis connection

**Deliverable**: Running Redis + connection established

**⚠️ STOP: Ask user before proceeding to Phase 2**

---

## Phase 2: Queue & Job Management API ✅
**Status**: Completed (2025-11-15)

### Tasks
1. Create `app/api/jobs/route.ts` - POST (create), GET (list all)
2. Create `app/api/jobs/[id]/route.ts` - GET (details), DELETE (remove)
3. Create `app/api/jobs/[id]/cancel/route.ts` - POST (cancel)
4. Create `app/api/jobs/[id]/retry/route.ts` - POST (retry failed)
5. Implement job state tracking in BullMQ
6. Test API endpoints

**Deliverable**: Full CRUD API for jobs

**⚠️ STOP: Ask user before proceeding to Phase 3**

---

## Phase 3: Worker Implementation ✅
**Status**: Completed (2025-11-15)

### Tasks
1. Create `worker/` directory with `package.json`
2. Create `worker/index.ts` - BullMQ worker (concurrency: 5)
3. Implement 10s job processor
4. Add 1s progress updates with mock web agent actions:
   - "Navigating to page"
   - "Clicking button"
   - "Typing text"
   - "Scrolling"
   - "Taking screenshot"
   - etc.
5. Error handling & retry logic
6. Create `worker/Dockerfile`
7. Test worker locally

**Deliverable**: Functional worker processing jobs

**⚠️ STOP: Ask user before proceeding to Phase 4**

---

## Phase 4: Server-Sent Events (SSE) ⏳
**Status**: Not Started

### Tasks
1. Create `app/api/jobs/[id]/stream/route.ts` - SSE endpoint
2. Implement Redis pub/sub for job updates
3. Stream progress events to clients
4. Handle connection lifecycle
5. Add heartbeat mechanism
6. Test SSE with EventSource

**Deliverable**: Real-time job updates via SSE

**⚠️ STOP: Ask user before proceeding to Phase 5**

---

## Phase 5: Bull Board Integration ⏳
**Status**: Not Started

### Tasks
1. Create `app/api/admin/queues/[...path]/route.ts` - Bull Board API
2. Configure Bull Board with BullMQ adapter
3. Create `app/admin/page.tsx` - Bull Board UI page
4. Style integration with existing design
5. Test queue monitoring features

**Deliverable**: Admin dashboard for queue monitoring

**⚠️ STOP: Ask user before proceeding to Phase 6**

---

## Phase 6: Frontend Integration ⏳
**Status**: Not Started

### Tasks
1. Update `components/job-dashboard.tsx` to use real API
2. Replace mock data with API calls
3. Implement SSE client for job updates
4. Add EventSource connection management
5. Update UI reactively on SSE events
6. Handle reconnection logic
7. Test multi-job scenarios (up to 5 concurrent)

**Deliverable**: Fully functional real-time dashboard

**⚠️ STOP: Ask user before proceeding to Phase 7**

---

## Phase 7: Testing & Documentation ⏳
**Status**: Not Started

### Tasks
1. End-to-end testing (create → process → complete)
2. Test concurrent jobs (5 simultaneous)
3. Test edge cases (cancel, retry, failures)
4. Add error notifications
5. Performance testing
6. Create comprehensive README with:
   - Architecture diagram
   - Setup instructions
   - Docker commands
   - API documentation
7. Full docker-compose orchestration test

**Deliverable**: Production-ready demo app with docs

---

## Architecture Decisions Log

### 2025-11-15: Initial Architecture
- **Real-time mechanism**: SSE (Server-Sent Events)
  - Rationale: Simple, native browser support, perfect for server→client updates
- **Worker deployment**: Separate Docker container
- **Concurrency limit**: 5 jobs max
- **Monitoring**: Bull Board integration
- **Job retention**: Manual deletion only (no auto-cleanup)
