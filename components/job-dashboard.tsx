"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  X,
  RotateCw,
  Trash2,
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Plus,
  Settings,
} from "lucide-react";
import Link from "next/link";

type JobStatus = "waiting" | "active" | "completed" | "failed" | "delayed";

interface Job {
  id: string;
  name: string;
  status: JobStatus;
  progress: number | { progress: number; action: string; timestamp: string };
  createdAt: string;
  finishedAt: string | null;
  failedReason: string | null;
  attemptsMade: number;
  logs?: string[];
}

export function JobDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [loading, setLoading] = useState(false);
  const eventSourcesRef = useRef<Map<string, EventSource>>(new Map());

  // Fetch all jobs on mount
  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  // Setup SSE for active jobs
  useEffect(() => {
    const activeJobs = jobs.filter(
      (j) => j.status === "active" || j.status === "waiting"
    );

    // Close SSE for non-active jobs
    eventSourcesRef.current.forEach((es, jobId) => {
      if (!activeJobs.find((j) => j.id === jobId)) {
        es.close();
        eventSourcesRef.current.delete(jobId);
      }
    });

    // Open SSE for active jobs
    activeJobs.forEach((job) => {
      if (!eventSourcesRef.current.has(job.id)) {
        console.log(`============== Opening SSE for job ${job.id}`);
        connectToJobStream(job.id);
      }
    });

    return () => {
      // Cleanup all SSE connections on unmount
      console.log("============== Closing SSE connections");
      eventSourcesRef.current.forEach((es) => es.close());
      eventSourcesRef.current.clear();
    };
  }, [jobs]);

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs);
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
    }
  };

  const connectToJobStream = (jobId: string) => {
    const es = new EventSource(`/api/jobs/${jobId}/stream`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "progress") {
          setJobs((prev) =>
            prev.map((job) =>
              job.id === jobId
                ? {
                    ...job,
                    progress: {
                      progress: data.progress,
                      action: data.action,
                      timestamp: data.timestamp,
                    },
                  }
                : job
            )
          );
        } else if (data.type === "failed") {
          // Job failed - update immediately
          setJobs((prev) =>
            prev.map((job) =>
              job.id === jobId
                ? { ...job, status: "failed", failedReason: data.error }
                : job
            )
          );
          fetchJobs();
          es.close();
          eventSourcesRef.current.delete(jobId);
        } else if (data.type === "status") {
          // Job completed or failed - refresh
          fetchJobs();
          es.close();
          eventSourcesRef.current.delete(jobId);
        }
      } catch (error) {
        console.error("Error parsing SSE message:", error);
      }
    };

    es.onerror = () => {
      es.close();
      eventSourcesRef.current.delete(jobId);
    };

    eventSourcesRef.current.set(jobId, es);
  };

  const createJob = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Job ${jobs.length + 1}` }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchJobs();
      }
    } catch (error) {
      console.error("Error creating job:", error);
    } finally {
      setLoading(false);
    }
  };

  const cancelJob = async (id: string) => {
    try {
      await fetch(`/api/jobs/${id}/cancel`, { method: "POST" });
      await fetchJobs();
    } catch (error) {
      console.error("Error cancelling job:", error);
    }
  };

  const retryJob = async (id: string) => {
    try {
      await fetch(`/api/jobs/${id}/retry`, { method: "POST" });
      await fetchJobs();
    } catch (error) {
      console.error("Error retrying job:", error);
    }
  };

  const deleteJob = async (id: string) => {
    try {
      await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      await fetchJobs();
    } catch (error) {
      console.error("Error deleting job:", error);
    }
  };

  const getStatusIcon = (status: JobStatus) => {
    switch (status) {
      case "waiting":
      case "delayed":
        return <Clock className="h-4 w-4" />;
      case "active":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4" />;
      case "failed":
        return <XCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case "waiting":
      case "delayed":
        return "bg-muted text-muted-foreground";
      case "active":
        return "bg-primary text-primary-foreground";
      case "completed":
        return "bg-accent text-accent-foreground";
      case "failed":
        return "bg-destructive text-destructive-foreground";
    }
  };

  const formatDuration = (startTime: string, endTime: string | null) => {
    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : new Date().getTime();
    const ms = end - start;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${remainingSeconds}s`;
  };

  const getProgress = (job: Job): number => {
    if (typeof job.progress === "number") return job.progress;
    return job.progress?.progress || 0;
  };

  const getProgressAction = (job: Job): string | null => {
    if (typeof job.progress === "object" && job.progress.action) {
      return job.progress.action;
    }
    return null;
  };

  const activeCount = jobs.filter((j) => j.status === "active").length;
  const completedCount = jobs.filter((j) => j.status === "completed").length;
  const failedCount = jobs.filter((j) => j.status === "failed").length;

  const filteredJobs =
    statusFilter === "all"
      ? jobs
      : jobs.filter((job) => job.status === statusFilter);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2 text-balance">
            Job Execution Dashboard
          </h1>
          <p className="text-muted-foreground text-balance">
            Submit and monitor job execution status in real-time
          </p>
        </div>
        <Link href="/admin">
          <Button variant="outline" className="gap-2">
            <Settings className="h-4 w-4" />
            Admin
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card
          className={`p-4 border-border cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "all" ? "bg-primary/10 border-primary" : "bg-card"
          }`}
          onClick={() => setStatusFilter("all")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Jobs</p>
              <p className="text-3xl font-bold font-mono">{jobs.length}</p>
            </div>
            <Activity className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
        <Card
          className={`p-4 border-border cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "active"
              ? "bg-primary/10 border-primary"
              : "bg-card"
          }`}
          onClick={() => setStatusFilter("active")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Running</p>
              <p className="text-3xl font-bold font-mono text-primary">
                {activeCount}
              </p>
            </div>
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        </Card>
        <Card
          className={`p-4 border-border cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "completed"
              ? "bg-accent/10 border-accent"
              : "bg-card"
          }`}
          onClick={() => setStatusFilter("completed")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-3xl font-bold font-mono text-accent">
                {completedCount}
              </p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-accent" />
          </div>
        </Card>
        <Card
          className={`p-4 border-border cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "failed"
              ? "bg-destructive/10 border-destructive"
              : "bg-card"
          }`}
          onClick={() => setStatusFilter("failed")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-3xl font-bold font-mono text-destructive">
                {failedCount}
              </p>
            </div>
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
        </Card>
      </div>

      {/* Submit Job Form */}
      <Card className="p-6 mb-6 bg-card border-border">
        <h2 className="text-lg font-semibold mb-4 text-balance">
          Submit New Job
        </h2>
        <Button onClick={createJob} disabled={loading} className="gap-2">
          <Plus className="h-4 w-4" />
          {loading ? "Creating..." : "Submit Job"}
        </Button>
      </Card>

      {/* Jobs List */}
      <div className="space-y-3">
        {filteredJobs.length === 0 ? (
          <Card className="p-12 text-center bg-card border-border border-dashed">
            <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground text-balance">
              {jobs.length === 0
                ? "No jobs yet. Submit your first job to get started."
                : `No ${statusFilter} jobs found.`}
            </p>
          </Card>
        ) : (
          filteredJobs.map((job) => {
            const progress = getProgress(job);
            const action = getProgressAction(job);

            return (
              <Card
                key={job.id}
                className="p-4 bg-card border-border hover:border-primary/50 transition-colors"
              >
                <div className="space-y-3">
                  {/* Job Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <Badge
                          className={`${getStatusColor(
                            job.status
                          )} gap-1.5 font-mono text-xs`}
                        >
                          {getStatusIcon(job.status)}
                          {job.status.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono truncate">
                          {job.id}
                        </span>
                      </div>
                      <h3 className="font-semibold text-lg text-balance truncate">
                        {job.name}
                      </h3>
                      {action && job.status === "active" && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {action}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {(job.status === "active" ||
                        job.status === "waiting") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cancelJob(job.id)}
                          className="gap-1.5"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      )}
                      {job.status === "failed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retryJob(job.id)}
                          className="gap-1.5"
                        >
                          <RotateCw className="h-3.5 w-3.5" />
                          Retry
                        </Button>
                      )}
                      {job.status !== "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteJob(job.id)}
                          className="gap-1.5 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {(job.status === "active" || job.status === "waiting") && (
                    <div className="space-y-1.5">
                      <Progress value={progress} className="h-2 bg-secondary" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                        <span>{Math.round(progress)}%</span>
                        <span>
                          {formatDuration(job.createdAt, job.finishedAt)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Job Metadata */}
                  {job.finishedAt && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono pt-1">
                      <span>
                        Duration:{" "}
                        {formatDuration(job.createdAt, job.finishedAt)}
                      </span>
                      <span>•</span>
                      <span>
                        Completed:{" "}
                        {new Date(job.finishedAt).toLocaleTimeString()}
                      </span>
                      {job.attemptsMade > 1 && (
                        <>
                          <span>•</span>
                          <span>Attempts: {job.attemptsMade}</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Failed Reason */}
                  {job.failedReason && (
                    <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                      Error: {job.failedReason}
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
