"use client"

import { useState, useEffect } from "react"
import { JobDashboard } from "@/components/job-dashboard"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <JobDashboard />
    </div>
  )
}
