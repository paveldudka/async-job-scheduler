"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, Pause, Play, Trash2, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface QueueMetrics {
  name: string
  counts: {
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
  }
  workers: number
}

interface RecentJobs {
  waiting: Array<{ id: string; name: string; timestamp: number }>
  active: Array<{ id: string; name: string; timestamp: number }>
  completed: Array<{ id: string; name: string; finishedOn: number }>
  failed: Array<{ id: string; name: string; failedReason: string; finishedOn: number }>
}

export default function AdminPage() {
  const [metrics, setMetrics] = useState<QueueMetrics | null>(null)
  const [recentJobs, setRecentJobs] = useState<RecentJobs | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPaused, setIsPaused] = useState(false)

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/admin/queues')
      const data = await res.json()
      if (data.success) {
        setMetrics(data.queue)
        setRecentJobs(data.recentJobs)
      }
    } catch (error) {
      console.error('Error fetching metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 5000)
    return () => clearInterval(interval)
  }, [])

  const handlePause = async () => {
    try {
      const res = await fetch('/api/admin/queues/pause', { method: 'POST' })
      if (res.ok) {
        setIsPaused(true)
        await fetchMetrics()
      }
    } catch (error) {
      console.error('Error pausing queue:', error)
    }
  }

  const handleResume = async () => {
    try {
      const res = await fetch('/api/admin/queues/resume', { method: 'POST' })
      if (res.ok) {
        setIsPaused(false)
        await fetchMetrics()
      }
    } catch (error) {
      console.error('Error resuming queue:', error)
    }
  }

  const handleClean = async (status: 'completed' | 'failed') => {
    if (!confirm(`Clean all ${status} jobs?`)) return

    try {
      const res = await fetch('/api/admin/queues/clean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, grace: 0 })
      })
      if (res.ok) {
        await fetchMetrics()
      }
    } catch (error) {
      console.error('Error cleaning queue:', error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-balance">
            Queue Admin
          </h1>
          <p className="text-muted-foreground text-balance">
            Monitor and manage job queue operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fetchMetrics()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          {isPaused ? (
            <Button onClick={handleResume} className="gap-2">
              <Play className="h-4 w-4" />
              Resume Queue
            </Button>
          ) : (
            <Button onClick={handlePause} variant="outline" className="gap-2">
              <Pause className="h-4 w-4" />
              Pause Queue
            </Button>
          )}
        </div>
      </div>

      {/* Queue Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Queue Status</h2>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-mono">{metrics?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Workers:</span>
              <span className="font-mono">{metrics?.workers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              {isPaused ? (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-500">
                  PAUSED
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  RUNNING
                </Badge>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Job Counts</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Waiting</div>
              <div className="text-2xl font-bold font-mono">{metrics?.counts.waiting || 0}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Active</div>
              <div className="text-2xl font-bold font-mono text-primary">{metrics?.counts.active || 0}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Completed</div>
              <div className="text-2xl font-bold font-mono text-accent">{metrics?.counts.completed || 0}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Failed</div>
              <div className="text-2xl font-bold font-mono text-destructive">{metrics?.counts.failed || 0}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Queue Management */}
      <Card className="p-6 mb-6 bg-card border-border">
        <h2 className="text-lg font-semibold mb-4">Queue Management</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleClean('completed')}
            className="gap-2"
            disabled={!metrics?.counts.completed}
          >
            <Trash2 className="h-4 w-4" />
            Clean Completed ({metrics?.counts.completed || 0})
          </Button>
          <Button
            variant="outline"
            onClick={() => handleClean('failed')}
            className="gap-2 text-destructive hover:text-destructive"
            disabled={!metrics?.counts.failed}
          >
            <Trash2 className="h-4 w-4" />
            Clean Failed ({metrics?.counts.failed || 0})
          </Button>
        </div>
      </Card>

      {/* Recent Jobs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Jobs */}
        <Card className="p-6 bg-card border-border">
          <h2 className="text-lg font-semibold mb-4">Active Jobs</h2>
          {recentJobs?.active && recentJobs.active.length > 0 ? (
            <div className="space-y-2">
              {recentJobs.active.map(job => (
                <div key={job.id} className="flex justify-between items-center text-sm">
                  <span className="truncate font-mono text-xs">{job.id}</span>
                  <Badge variant="outline" className="bg-primary/10 text-primary">
                    ACTIVE
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No active jobs</p>
          )}
        </Card>

        {/* Failed Jobs */}
        <Card className="p-6 bg-card border-border">
          <h2 className="text-lg font-semibold mb-4">Recent Failed</h2>
          {recentJobs?.failed && recentJobs.failed.length > 0 ? (
            <div className="space-y-2">
              {recentJobs.failed.map(job => (
                <div key={job.id} className="space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="truncate font-mono text-xs">{job.id}</span>
                    <Badge variant="outline" className="bg-destructive/10 text-destructive">
                      FAILED
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{job.failedReason}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No failed jobs</p>
          )}
        </Card>
      </div>
    </div>
  )
}
