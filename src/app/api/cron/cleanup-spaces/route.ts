import { NextRequest, NextResponse } from "next/server";
import { cleanupArchivedSpaces } from "lib/spaces/cleanup-job";

export async function POST(req: NextRequest) {
  // Verify cron secret for security
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await cleanupArchivedSpaces();
    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
    });
  } catch (error) {
    console.error("Cleanup job failed:", error);
    return NextResponse.json({ error: "Cleanup job failed" }, { status: 500 });
  }
}
