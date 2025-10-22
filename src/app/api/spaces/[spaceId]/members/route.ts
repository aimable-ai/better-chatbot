import { NextRequest, NextResponse } from "next/server";
import { getSession } from "lib/auth/auth-instance";
import { spacesRepository } from "lib/spaces/repository";
import { requireSpaceRole, requireActiveSpace } from "lib/spaces/permissions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { spaceId } = await params;
  const allowed = await requireSpaceRole(
    session.user.id,
    spaceId,
    session.user.role || "user",
    ["owner", "admin", "curator", "auditor", "user"],
  );
  if (!allowed)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const members = await spacesRepository.listMembers(spaceId);
  return NextResponse.json({ members });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { spaceId } = await params;

  // Check if space is active (not archived/deleted)
  try {
    await requireActiveSpace(spaceId);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code || 400 },
    );
  }

  const allowed = await requireSpaceRole(
    session.user.id,
    spaceId,
    session.user.role || "user",
    ["owner", "admin", "curator"],
  );
  if (!allowed)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { userId, role } = await req.json();
  if (!userId || !role)
    return NextResponse.json({ error: "Missing userId/role" }, { status: 400 });
  const member = await spacesRepository.upsertMember(spaceId, userId, role);
  return NextResponse.json({ member }, { status: 201 });
}
