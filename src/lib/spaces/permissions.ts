import { spacesRepository } from "./repository";
import { USER_ROLES } from "app-types/roles";
import { SPACE_ERRORS } from "./config";

export type SpaceRole = "owner" | "admin" | "curator" | "auditor" | "user";

export const canManageMembers: Record<SpaceRole, boolean> = {
  owner: true,
  admin: true,
  curator: true,
  auditor: false,
  user: false,
};

export const canEditSpace: Record<SpaceRole, boolean> = {
  owner: true,
  admin: true,
  curator: true,
  auditor: false,
  user: false,
};

export async function getUserSpaceRole(
  userId: string,
  spaceId: string,
  userGlobalRole: string,
): Promise<SpaceRole | null> {
  if (userGlobalRole?.split(",").includes(USER_ROLES.ADMIN)) return "owner"; // bypass: treat as full access
  const member = await spacesRepository.getMember(spaceId, userId);
  return (member?.role as SpaceRole) || null;
}

export async function requireActiveSpace(spaceId: string) {
  const space = await spacesRepository.getSpaceById(spaceId);
  if (!space) {
    const error = new Error(SPACE_ERRORS.WORKSPACE_NOT_FOUND.message);
    (error as any).code = SPACE_ERRORS.WORKSPACE_NOT_FOUND.code;
    throw error;
  }
  if (space.status === "archived") {
    const error = new Error(SPACE_ERRORS.WORKSPACE_ARCHIVED.message);
    (error as any).code = SPACE_ERRORS.WORKSPACE_ARCHIVED.code;
    throw error;
  }
  if (space.status === "deleted") {
    const error = new Error(SPACE_ERRORS.WORKSPACE_DELETED.message);
    (error as any).code = SPACE_ERRORS.WORKSPACE_DELETED.code;
    throw error;
  }
  return space;
}

export async function canArchiveSpace(
  userId: string,
  spaceId: string,
  userGlobalRole: string,
): Promise<boolean> {
  const allowed = await requireSpaceRole(userId, spaceId, userGlobalRole, [
    "owner",
    "admin",
  ]);
  return allowed;
}

export async function canUnarchiveSpace(
  userId: string,
  spaceId: string,
  userGlobalRole: string,
): Promise<boolean> {
  const allowed = await requireSpaceRole(userId, spaceId, userGlobalRole, [
    "owner",
    "admin",
  ]);
  if (!allowed) return false;

  const withinRetention =
    await spacesRepository.isWithinRetentionPeriod(spaceId);
  return withinRetention;
}

export async function requireSpaceRole(
  userId: string,
  spaceId: string,
  userGlobalRole: string,
  allowedRoles: SpaceRole[],
): Promise<boolean> {
  const userRole = await getUserSpaceRole(userId, spaceId, userGlobalRole);
  if (!userRole) return false;

  return allowedRoles.includes(userRole);
}

/**
 * Check if a user can access a personal space
 * Rules:
 * - Owner has full access
 * - Users with explicit invitation can view (read-only)
 * - Everyone else is blocked
 */
export async function canAccessPersonalSpace(
  spaceId: string, 
  userId: string, 
  userRole: string
): Promise<{ canAccess: boolean; isReadOnly: boolean }> {
  try {
    // Get space details
    const space = await spacesRepository.getSpaceById(spaceId);
    if (!space) {
      return { canAccess: false, isReadOnly: false };
    }

    // If it's not a personal space, use regular access logic
    if (!space.isPersonal) {
      return { canAccess: true, isReadOnly: false };
    }

    // Check if user is the owner
    const member = await spacesRepository.getMember(spaceId, userId);
    if (member?.role === "owner") {
      return { canAccess: true, isReadOnly: false };
    }

    // Check if user has explicit invitation (any role except owner)
    if (member && (member.role as string) !== "owner") {
      return { canAccess: true, isReadOnly: true };
    }

    // Everyone else is blocked
    return { canAccess: false, isReadOnly: false };
  } catch (error) {
    console.error("Error checking personal space access:", error);
    return { canAccess: false, isReadOnly: false };
  }
}

/**
 * Check if a user can modify a personal space
 * Only owners can modify personal spaces
 */
export async function canModifyPersonalSpace(
  spaceId: string, 
  userId: string
): Promise<boolean> {
  try {
    const space = await spacesRepository.getSpaceById(spaceId);
    if (!space || !space.isPersonal) {
      return true; // Regular spaces use normal logic
    }

    const member = await spacesRepository.getMember(spaceId, userId);
    return member?.role === "owner";
  } catch (error) {
    console.error("Error checking personal space modification:", error);
    return false;
  }
}