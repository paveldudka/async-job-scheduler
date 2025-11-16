# End-to-End Testing Instructions

## Prerequisites
Make sure you have:
1. Docker and Docker Compose installed
2. Node.js installed

## Step 1: Start the Services

### Terminal 1 - Start Redis + Worker (Docker)
```bash
docker compose up
```

You should see:
```
async-app-redis  | Ready to accept connections tcp
async-app-worker | 🚀 Worker started with 5 concurrency
async-app-worker | 📡 Listening for jobs on queue: jobs
```

### Terminal 2 - Start Next.js API Server
```bash
npm run dev
```

Wait for:
```
✓ Ready in XXXms
```

## Step 2: Test with Browser

### Option A: Using the Test HTML Page
1. Open `test-sse.html` in your browser (double-click or open with browser)
2. Click **"Create Test Job"** button
   - You'll see a job ID appear in the input field
   - Check Terminal 1 - worker should log "Processing job..."
3. Click **"Connect to Job Stream"** button
4. Watch the Event Log section for real-time updates:
   ```
   Connected to job [job-id]
   Progress: 10% - Navigating to page
   Progress: 20% - Clicking button
   Progress: 30% - Typing text in input field
   ...
   Progress: 100% - Submitting form
   Status: completed (100%)
   ```
5. Check Terminal 1 - worker should show all 10 progress updates

### Option B: Using cURL + Browser DevTools
1. Create a job:
   ```bash
   curl -X POST http://localhost:3000/api/jobs \
     -H "Content-Type: application/json" \
     -d '{"name":"Manual Test Job"}' | jq
   ```

2. Copy the `job.id` from the response

3. Open browser to: `http://localhost:3000/api/jobs/[JOB-ID]/stream`
   - Replace `[JOB-ID]` with the actual ID
   - You should see SSE events streaming in real-time

4. Open DevTools → Network tab → Click on the stream request
   - Switch to "EventStream" tab
   - Watch live progress updates

## Step 3: Verify Complete Flow

### Check API Endpoints
```bash
# List all jobs
curl http://localhost:3000/api/jobs | jq

# Get specific job
curl http://localhost:3000/api/jobs/[JOB-ID] | jq

# Create multiple jobs (test concurrency - max 5)
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/jobs \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Concurrent Job $i\"}" &
done
```

### Expected Results
✅ Jobs are created with status "waiting"
✅ Worker picks up jobs (max 5 concurrent)
✅ Progress updates stream via SSE every 1 second
✅ Jobs complete after ~10 seconds
✅ Final status shows "completed"

## Troubleshooting

### Redis Connection Errors
If you see `ECONNREFUSED` errors:
```bash
# Check if Redis is running
docker ps | grep redis

# Restart if needed
docker compose restart redis
```

### Worker Not Processing Jobs
```bash
# Check worker logs
docker compose logs worker

# Restart worker
docker compose restart worker
```

### Next.js Can't Connect
```bash
# Check Redis port
lsof -i :6379

# Check .env.local
cat .env.local
# Should have: REDIS_HOST=localhost REDIS_PORT=6379
```

## Success Criteria
- [ ] Job created via API
- [ ] Worker logs show job processing
- [ ] SSE connection established
- [ ] Real-time progress updates visible
- [ ] Job completes successfully
- [ ] Multiple jobs can run concurrently (up to 5)
