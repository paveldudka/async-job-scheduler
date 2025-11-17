# Architecture Diagram

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant Browser
    participant NextJS as Next.js API
    participant Queue as Redis Queue<br/>(BullMQ)
    participant Worker as Worker Process
    participant PubSub as Redis Pub/Sub
    participant SSE as SSE Connection<br/>(per connection)

    Note over Browser,SSE: Job Creation Flow
    Browser->>NextJS: POST /api/jobs<br/>{name: "Task"}
    NextJS->>Queue: Add job to queue<br/>(jobData)
    Queue-->>NextJS: Job ID
    NextJS-->>Browser: 201 Created<br/>{id, status: "pending"}

    Note over Browser,SSE: Real-Time Updates Setup
    Browser->>SSE: EventSource("/api/jobs/stream")
    SSE->>PubSub: psubscribe("job:*:progress")
    SSE-->>Browser: Connection established

    Note over Browser,SSE: Job Processing Flow
    Worker->>Queue: Poll for jobs
    Queue-->>Worker: Job assigned
    Worker->>Worker: job.updateProgress(10%)
    Worker->>PubSub: Publish "job:123:progress"<br/>{status, progress, action}

    PubSub-->>SSE: Pattern match event
    SSE->>Queue: getJob(123)
    Queue-->>SSE: Full job state
    SSE->>SSE: Transform to ApiJob
    SSE-->>Browser: SSE message<br/>{type: "job-update", job}
    Browser->>Browser: Update UI state

    Worker->>Worker: job.updateProgress(50%)
    Worker->>PubSub: Publish "job:123:progress"
    PubSub-->>SSE: Pattern match event
    SSE-->>Browser: SSE message (50%)
    Browser->>Browser: Update UI state

    Worker->>Worker: Complete job (100%)
    Worker->>Queue: Mark complete
    Worker->>PubSub: Publish "job:123:progress"<br/>{status: "completed"}

    PubSub-->>SSE: Pattern match event
    SSE-->>Browser: SSE message (completed)
    Browser->>Browser: Update UI state

    Note over Browser,SSE: Connection Cleanup
    Browser->>SSE: Close EventSource
    SSE->>PubSub: punsubscribe()
    SSE->>PubSub: quit()
    SSE-->>Browser: Connection closed
```

## Component Architecture

```mermaid
graph TB
    subgraph Browser
        UI[React UI<br/>JobDashboard]
        ES[EventSource<br/>Single Connection]
    end

    subgraph "Next.js App"
        API1[POST /api/jobs]
        API2[GET /api/jobs]
        API3[POST /api/jobs/cancel]
        SSERoute[GET /api/jobs/stream]
    end

    subgraph Redis
        Queue[(Redis Queue<br/>BullMQ)]
        PubSub[(Redis Pub/Sub<br/>Pattern: job:*:progress)]
    end

    subgraph "Worker Process"
        Worker[BullMQ Worker<br/>Concurrency: 5]
        EventListeners[Event Listeners<br/>progress/active/completed/failed]
    end

    UI -->|Create Job| API1
    UI -->|List Jobs| API2
    UI -->|Cancel Job| API3
    UI -->|Real-time Updates| ES

    ES <-->|SSE Stream| SSERoute
    SSERoute -->|psubscribe| PubSub
    SSERoute -->|getJob| Queue

    API1 -->|Add Job| Queue
    API2 -->|List Jobs| Queue
    API3 -->|Cancel Job| Queue

    Worker -->|Poll Jobs| Queue
    Worker -->|updateProgress| EventListeners
    EventListeners -->|publish| PubSub

    PubSub -.->|pmessage event| SSERoute

    style Browser fill:#e1f5ff
    style Redis fill:#ffe1e1
    style Worker fill:#e1ffe1
```

## Key Architecture Decisions

### Single SSE Connection Pattern
- **Frontend**: Opens ONE EventSource connection to `/api/jobs/stream`
- **Solves**: Browser connection limit (6 per domain in HTTP/1.1)
- **Scales**: Can monitor 100+ concurrent jobs over single connection

### Per-Connection Redis Subscriber
- **Backend**: Each SSE connection creates own Redis subscriber
- **Pattern**: `psubscribe('job:*:progress')` receives ALL job updates
- **Cleanup**: Automatic on disconnect (no zombie connections)
- **Benefits**: No shared state, HMR-safe, multi-process safe

### Worker Event-Driven Publishing
- **Worker**: Uses BullMQ's `job.updateProgress()` (not direct Redis publish)
- **Events**: Worker listeners (`on('progress')`, `on('completed')`) publish to Redis
- **Single Source**: All pub/sub happens through worker event listeners
- **Consistency**: Guaranteed delivery through BullMQ event system

### Type-Safe Data Flow
```
JobData (create) → Queue → Worker → JobProgress (pub/sub) → ApiJob (SSE)
```
- **JobData**: Input shape `{id, name, createdAt}`
- **JobProgress**: Worker state `{status, progress, action, timestamp}`
- **ApiJob**: API response `{id, name, status, progress, logs, ...}`

## Data Flow Summary

1. **Create**: Browser → Next.js API → Redis Queue
2. **Process**: Worker polls queue → Processes job → Updates progress
3. **Publish**: Worker events → Redis Pub/Sub (`job:*:progress`)
4. **Stream**: Redis Pub/Sub → SSE subscriber → Browser EventSource
5. **Update**: Browser receives full job state → React re-renders UI

**Result**: Real-time job monitoring with clean separation of concerns
