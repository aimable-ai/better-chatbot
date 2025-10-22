import { NextRequest, NextResponse } from "next/server";
import { getSession } from "lib/auth/auth-instance";
import { spacesRepository } from "lib/spaces/repository";
import { canArchiveSpace } from "lib/spaces/permissions";
import { SPACE_ERRORS } from "lib/spaces/config";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { spaceId } = await params;
  const space = await spacesRepository.getSpaceById(spaceId);
  if (!space) {
    return NextResponse.json(
      { error: SPACE_ERRORS.WORKSPACE_NOT_FOUND.message },
      { status: SPACE_ERRORS.WORKSPACE_NOT_FOUND.code },
    );
  }

  if (space.status === "archived") {
    return NextResponse.json(
      { error: SPACE_ERRORS.ALREADY_ARCHIVED.message },
      { status: SPACE_ERRORS.ALREADY_ARCHIVED.code },
    );
  }

  if (space.status === "deleted") {
    return NextResponse.json(
      { error: SPACE_ERRORS.ALREADY_DELETED.message },
      { status: SPACE_ERRORS.ALREADY_DELETED.code },
    );
  }

  // Check repository-level access (space membership)
  const member = await spacesRepository.getMember(spaceId, session.user.id);
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check permission-level access (role-based)
  const allowed = await canArchiveSpace(
    session.user.id,
    spaceId,
    session.user.role || "user",
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const archivedSpace = await spacesRepository.archiveSpace(
    spaceId,
    session.user.id,
  );

  return NextResponse.json({
    space: archivedSpace,
    message: "Workspace archived",
  });
}
