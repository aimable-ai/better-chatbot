import { spacesRepository } from "./repository";
import logger from "lib/logger";

/**
 * Get or create a personal space for a user.
 * This function is idempotent - safe to call multiple times.
 */
export async function getOrCreatePersonalSpace(userId: string) {
  try {
    // First, check if user already has a personal space
    const existingPersonalSpace = await spacesRepository.getPersonalSpaceForUser(userId);
    
    if (existingPersonalSpace) {
      logger.info(`User ${userId} already has personal space: ${existingPersonalSpace.id}`);
      return existingPersonalSpace;
    }

    // Create a new personal space
    logger.info(`Creating personal space for user ${userId}`);
    const personalSpace = await spacesRepository.createSpace("My Personal Space", { isPersonal: true });
    
    // Add user as owner of the space
    await spacesRepository.upsertMember(personalSpace.id, userId, "owner");
    
    logger.info(`Created personal space ${personalSpace.id} for user ${userId}`);
    return personalSpace;
  } catch (error) {
    logger.error("Failed to get or create personal space for user:", error);
    throw new Error("Failed to get or create personal space");
  }
}

/**
 * Get the appropriate space for a user to redirect to after login.
 * Priority:
 * 1. Personal space (if user has one, or create one if they don't)
 * 2. Last visited space (from cookie)
 * 3. First available space
 * 4. null (no spaces available)
 */
export async function getRedirectSpaceForUser(
  userId: string, 
  lastVisitedSpaceId?: string
): Promise<string | null> {
  try {
    // Priority 1: Personal space (always create if missing)
    const personalSpace = await getOrCreatePersonalSpace(userId);
    if (personalSpace) {
      logger.info(`Redirecting user ${userId} to personal space: ${personalSpace.id}`);
      return personalSpace.id;
    }

    // Priority 2: Last visited space (if valid and user has access)
    if (lastVisitedSpaceId) {
      const lastVisitedSpace = await spacesRepository.getSpaceById(lastVisitedSpaceId);
      if (lastVisitedSpace && lastVisitedSpace.status === "active") {
        // Check if user is a member of this space
        const member = await spacesRepository.getMember(lastVisitedSpaceId, userId);
        if (member) {
          logger.info(`Redirecting user ${userId} to last visited space: ${lastVisitedSpaceId}`);
          return lastVisitedSpaceId;
        }
      }
    }

    // Priority 3: First available space
    const userSpaces = await spacesRepository.listSpacesForUser(userId);
    const activeSpaces = userSpaces.filter(space => space.status === "active");
    
    if (activeSpaces.length > 0) {
      const firstSpace = activeSpaces[0];
      logger.info(`Redirecting user ${userId} to first available space: ${firstSpace.id}`);
      return firstSpace.id;
    }

    // Priority 4: No spaces available
    logger.warn(`No spaces available for user ${userId}`);
    return null;
  } catch (error) {
    logger.error("Failed to get redirect space for user:", error);
    // Fallback to personal space creation
    try {
      const personalSpace = await getOrCreatePersonalSpace(userId);
      return personalSpace.id;
    } catch (fallbackError) {
      logger.error("Fallback personal space creation also failed:", fallbackError);
      return null;
    }
  }
}
