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
  if (!spaceId) return { userId: session.user.id, spaceId: null } as const;

  // Global admin bypass
  if (session.user.role?.split(",").includes(USER_ROLES.ADMIN)) {
    return { userId: session.user.id, spaceId } as const;
  }

  const member = await spacesRepository.getMember(spaceId, session.user.id);
  if (!member) return { userId: session.user.id, spaceId: null } as const;
  return { userId: session.user.id, spaceId } as const;
}
