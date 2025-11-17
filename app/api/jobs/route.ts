import { NextRequest, NextResponse } from "next/server";
import { addJob, getAllJobs } from "@/lib/queue";
import { nanoid } from "nanoid";
import { type ApiJob } from "@/lib/models";
import { jobToApiJob } from "@/lib/utils";

// POST /api/jobs - Create a new job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Job name is required" },
        { status: 400 }
      );
    }

    const jobId = nanoid();

    const job = await addJob({
      id: jobId,
      name,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        job: await jobToApiJob(job),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating job:", error);
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    );
  }
}

// GET /api/jobs - List all jobs
export async function GET() {
  try {
    const { all } = await getAllJobs();

    const jobs: ApiJob[] = await Promise.all(
      all.map(async (job) => {
        return await jobToApiJob(job);
      })
    );

    // Sort by creation time (newest first)
    jobs.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      jobs,
      total: jobs.length,
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
