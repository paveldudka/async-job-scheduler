"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Play, X, RotateCw, Trash2, Activity, CheckCircle2, XCircle, Loader2, Clock, Plus } from 'lucide-react'

type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled"

interface Job {
  id: string
  name: string
  status: JobStatus
  progress: number
  startTime: Date | null
  endTime: Date | null
  duration: number | null
}

export function JobDashboard() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [nextId, setNextId] = useState(1)
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all")

  useEffect(() => {
    const interval = setInterval(() => {
      setJobs((prevJobs) =>
        prevJobs.map((job) => {
          if (job.status === "running") {
            const newProgress = Math.min(job.progress + Math.random() * 10, 100)
            
            if (newProgress >= 100) {
              const success = Math.random() > 0.15
              return {
                ...job,
                progress: 100,
                status: success ? "completed" : "failed",
                endTime: new Date(),
                duration: job.startTime
                  ? new Date().getTime() - job.startTime.getTime()
                  : null,
              }
            }
            
            return {
              ...job,
              progress: newProgress,
            }
          }
          return job
        })
      )
    }, 500)

    return () => clearInterval(interval)
  }, [])

  const createJob = () => {
    const newJob: Job = {
      id: `job-${nextId}`,
      name: `Job #${nextId}`,
      status: "pending",
      progress: 0,
      startTime: null,
      endTime: null,
      duration: null,
    }

    setJobs((prev) => [newJob, ...prev])
    setNextId((prev) => prev + 1)

    setTimeout(() => {
      setJobs((prev) =>
        prev.map((job) =>
          job.id === newJob.id
            ? { ...job, status: "running", startTime: new Date() }
            : job
        )
      )
    }, 300)
  }

  const cancelJob = (id: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === id && job.status === "running"
          ? {
              ...job,
              status: "cancelled",
              endTime: new Date(),
              duration: job.startTime
                ? new Date().getTime() - job.startTime.getTime()
                : null,
            }
          : job
      )
    )
  }

  const retryJob = (id: string) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === id
          ? {
              ...job,
              status: "running",
              progress: 0,
              startTime: new Date(),
              endTime: null,
              duration: null,
            }
          : job
      )
    )
  }

  const deleteJob = (id: string) => {
    setJobs((prev) => prev.filter((job) => job.id !== id))
  }

  const getStatusIcon = (status: JobStatus) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin" />
      case "completed":
        return <CheckCircle2 className="h-4 w-4" />
      case "failed":
        return <XCircle className="h-4 w-4" />
      case "cancelled":
        return <XCircle className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case "pending":
        return "bg-muted text-muted-foreground"
      case "running":
        return "bg-primary text-primary-foreground"
      case "completed":
        return "bg-accent text-accent-foreground"
      case "failed":
        return "bg-destructive text-destructive-foreground"
      case "cancelled":
        return "bg-secondary text-secondary-foreground"
    }
  }

  const formatDuration = (ms: number | null) => {
    if (!ms) return "-"
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return minutes > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${remainingSeconds}s`
  }

  const runningCount = jobs.filter((j) => j.status === "running").length
  const completedCount = jobs.filter((j) => j.status === "completed").length
  const failedCount = jobs.filter((j) => j.status === "failed").length

  const filteredJobs = statusFilter === "all" 
    ? jobs 
    : jobs.filter((job) => job.status === statusFilter)

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2 text-balance">
          Job Execution Dashboard
        </h1>
        <p className="text-muted-foreground text-balance">
          Submit and monitor job execution status in real-time
        </p>
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
            statusFilter === "running" ? "bg-primary/10 border-primary" : "bg-card"
          }`}
          onClick={() => setStatusFilter("running")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Running</p>
              <p className="text-3xl font-bold font-mono text-primary">
                {runningCount}
              </p>
            </div>
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        </Card>
        <Card 
          className={`p-4 border-border cursor-pointer transition-all hover:shadow-md ${
            statusFilter === "completed" ? "bg-accent/10 border-accent" : "bg-card"
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
            statusFilter === "failed" ? "bg-destructive/10 border-destructive" : "bg-card"
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
        <h2 className="text-lg font-semibold mb-4 text-balance">Submit New Job</h2>
        <Button onClick={createJob} className="gap-2">
          <Plus className="h-4 w-4" />
          Submit Job
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
                : `No ${statusFilter} jobs found.`
              }
            </p>
          </Card>
        ) : (
          filteredJobs.map((job) => (
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
                      <span className="text-xs text-muted-foreground font-mono">
                        {job.id}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg text-balance truncate">
                      {job.name}
                    </h3>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {job.status === "running" && (
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
                    {(job.status === "failed" ||
                      job.status === "cancelled" ||
                      job.status === "completed") && (
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
                    {job.status !== "running" && (
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
                {(job.status === "running" || job.status === "pending") && (
                  <div className="space-y-1.5">
                    <Progress
                      value={job.progress}
                      className="h-2 bg-secondary"
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                      <span>{Math.round(job.progress)}%</span>
                      {job.startTime && (
                        <span>
                          {formatDuration(
                            new Date().getTime() - job.startTime.getTime()
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Job Metadata */}
                {job.endTime && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono pt-1">
                    <span>Duration: {formatDuration(job.duration)}</span>
                    <span>•</span>
                    <span>
                      Completed: {job.endTime.toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
