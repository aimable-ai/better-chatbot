import { NextRequest, NextResponse } from "next/server";
import { getSession } from "lib/auth/auth-instance";
import { spacesRepository } from "lib/spaces/repository";
import { requireSpaceRole } from "lib/spaces/permissions";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; userId: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { spaceId, userId } = await params;
  const allowed = await requireSpaceRole(
    session.user.id,
    spaceId,
    session.user.role,
    ["owner", "admin", "curator"],
  );
  if (!allowed)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { role } = await req.json();
  if (!role)
    return NextResponse.json({ error: "Missing role" }, { status: 400 });
  const member = await spacesRepository.upsertMember(spaceId, userId, role);
  return NextResponse.json({ member });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; userId: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { spaceId, userId } = await params;
  const allowed = await requireSpaceRole(
    session.user.id,
    spaceId,
    session.user.role,
    ["owner", "admin", "curator"],
  );
  if (!allowed)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await spacesRepository.removeMember(spaceId, userId);
  return NextResponse.json({ ok: true });
}
