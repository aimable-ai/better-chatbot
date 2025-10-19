import { NextRequest, NextResponse } from "next/server";
import { getSession } from "lib/auth/auth-instance";
import { spacesRepository } from "lib/spaces/repository";
import { canUnarchiveSpace } from "lib/spaces/permissions";
import { SPACE_ERRORS } from "lib/spaces/config";

export async function POST(
  req: NextRequest,
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

  if (space.status !== "archived") {
    return NextResponse.json(
      { error: "Workspace is not archived" },
      { status: 400 },
    );
  }

  const allowed = await canUnarchiveSpace(
    session.user.id,
    spaceId,
    session.user.role,
  );
  if (!allowed) {
    const withinRetention =
      await spacesRepository.isWithinRetentionPeriod(spaceId);
    if (!withinRetention) {
      return NextResponse.json(
        { error: SPACE_ERRORS.RETENTION_EXPIRED.message },
        { status: SPACE_ERRORS.RETENTION_EXPIRED.code },
      );
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const restoredSpace = await spacesRepository.unarchiveSpace(spaceId);

  return NextResponse.json({
    space: restoredSpace,
    message: "Workspace restored",
  });
}
