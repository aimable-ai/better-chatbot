import { cookies, headers } from "next/headers";
import { spacesRepository } from "./repository";
import { getSession } from "lib/auth/auth-instance";
import { USER_ROLES } from "app-types/roles";

export async function getCurrentSpaceIdFromRequest() {
  const h = await headers();
  const cookieStore = await cookies();
  const headerId = h.get("x-space-id");
  const cookieId = cookieStore.get("current-space-id")?.value;
  return headerId || cookieId || null;
}

export async function validateUserAccessToCurrentSpace() {
  const session = await getSession();
  if (!session) return { userId: null, spaceId: null } as const;
  const spaceId = await getCurrentSpaceIdFromRequest();
  if (!spaceId) {
    // Fallback: choose the first active space for the user, if exists
    const spaces = await spacesRepository.listSpacesForUser(session.user.id);
    const active = spaces.find((s: any) => s.status !== "deleted");
    if (active) {
      return { userId: session.user.id, spaceId: active.id } as const;
    }
    return { userId: session.user.id, spaceId: null } as const;
  }

  // Global admin bypass
  if (session.user.role?.split(",").includes(USER_ROLES.ADMIN)) {
    return { userId: session.user.id, spaceId } as const;
  }

  const member = await spacesRepository.getMember(spaceId, session.user.id);
  if (!member) {
    // Fallback if user is not a member of provided space: pick first active space
    const spaces = await spacesRepository.listSpacesForUser(session.user.id);
    const active = spaces.find((s: any) => s.status !== "deleted");
    if (active) return { userId: session.user.id, spaceId: active.id } as const;
    return { userId: session.user.id, spaceId: null } as const;
  }
  return { userId: session.user.id, spaceId } as const;
}
