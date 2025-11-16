#!/bin/bash

echo "Starting worker test..."
echo ""

# Navigate to worker directory and start worker
cd worker && npm run dev &
WORKER_PID=$!

echo "Worker started with PID: $WORKER_PID"
echo "Waiting 3 seconds for worker to initialize..."
sleep 3

# Create a test job via API
echo ""
echo "Creating test job..."
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Worker Job"}' \
  -s | jq

echo ""
echo "Waiting 12 seconds for job to complete..."
sleep 12

# Check job status
echo ""
echo "Fetching all jobs..."
curl -X GET http://localhost:3000/api/jobs -s | jq

# Cleanup
echo ""
echo "Stopping worker..."
kill $WORKER_PID

echo "Test complete!"
