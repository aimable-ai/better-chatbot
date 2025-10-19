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
