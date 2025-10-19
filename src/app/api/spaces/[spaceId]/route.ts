import { NextRequest, NextResponse } from "next/server";
import { getSession } from "lib/auth/auth-instance";
import { spacesRepository } from "lib/spaces/repository";
import { requireSpaceRole } from "lib/spaces/permissions";
import { requireActiveSpace } from "lib/spaces/permissions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { spaceId } = await params;
  const space = await spacesRepository.getSpaceById(spaceId);
  if (!space) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const allowed = await requireSpaceRole(
    session.user.id,
    spaceId,
    session.user.role,
    ["owner", "admin", "curator", "auditor", "user"],
  );
  if (!allowed)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ space });
}

export async function PATCH(
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
    session.user.role,
    ["owner", "admin", "curator"],
  );
  if (!allowed)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await req.json();
  const space = await spacesRepository.updateSpace(spaceId, {
    name: data?.name,
  });
  return NextResponse.json({ space });
}

export async function DELETE(
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
    session.user.role,
    ["owner"],
  );
  if (!allowed)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await spacesRepository.deleteSpace(spaceId);
  return NextResponse.json({ ok: true });
}
