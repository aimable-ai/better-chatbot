#!/usr/bin/env tsx

import "load-env";
import { cleanupArchivedSpaces } from "../src/lib/spaces/cleanup-job";

async function main() {
  console.log("Starting workspace cleanup job...");

  try {
    const result = await cleanupArchivedSpaces();
    console.log(
      `Cleanup completed: ${result.processed} processed, ${result.errors} errors`,
    );
    process.exit(result.errors > 0 ? 1 : 0);
  } catch (error) {
    console.error("Cleanup failed:", error);
    process.exit(1);
  }
}

main();
