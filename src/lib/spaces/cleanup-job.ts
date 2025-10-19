import { spacesRepository } from "lib/spaces/repository";
import {
  SPACE_RETENTION_DAYS,
  SPACE_CLEANUP_BATCH_SIZE,
} from "lib/spaces/config";
import logger from "logger";

export async function cleanupArchivedSpaces() {
  try {
    const cutoffDate = new Date(
      Date.now() - SPACE_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    const spaces = await spacesRepository.getSpacesForCleanup(cutoffDate);

    logger.info(`Found ${spaces.length} archived spaces ready for cleanup`);

    if (spaces.length === 0) {
      return { processed: 0, errors: 0 };
    }

    let processed = 0;
    let errors = 0;

    // Process in batches to avoid overwhelming the database
    for (let i = 0; i < spaces.length; i += SPACE_CLEANUP_BATCH_SIZE) {
      const batch = spaces.slice(i, i + SPACE_CLEANUP_BATCH_SIZE);

      for (const space of batch) {
        try {
          // Mark as deleted (soft delete with tombstone)
          await spacesRepository.permanentlyDeleteSpace(space.id, "system");

          logger.info(`Permanently deleted space: ${space.name} (${space.id})`);
          processed++;
        } catch (error) {
          logger.error(`Failed to delete space ${space.id}:`, error);
          errors++;
        }
      }

      // Small delay between batches
      if (i + SPACE_CLEANUP_BATCH_SIZE < spaces.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    logger.info(`Cleanup completed: ${processed} processed, ${errors} errors`);
    return { processed, errors };
  } catch (error) {
    logger.error("Cleanup job failed:", error);
    throw error;
  }
}

// CLI script entry point
if (require.main === module) {
  cleanupArchivedSpaces()
    .then(({ processed, errors }) => {
      console.log(
        `Cleanup completed: ${processed} processed, ${errors} errors`,
      );
      process.exit(errors > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("Cleanup failed:", error);
      process.exit(1);
    });
}
