import { NextRequest, NextResponse } from "next/server";
import { getSession } from "lib/auth/auth-instance";
import { spacesRepository } from "lib/spaces/repository";
import { requireSpaceRole } from "lib/spaces/permissions";
import { randomUUID } from "crypto";

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
    session.user.role,
    ["owner", "admin", "curator"],
  );
  if (!allowed)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const invites = await spacesRepository.listInvites(spaceId);
  return NextResponse.json({ invites });
}

export async function POST(
  req: NextRequest,
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
    ["owner", "admin", "curator"],
  );
  if (!allowed)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { email, role } = await req.json();
  if (!email || !role)
    return NextResponse.json({ error: "Missing email/role" }, { status: 400 });
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  const invite = await spacesRepository.createInvite(
    spaceId,
    email,
    role,
    token,
    expiresAt,
  );
  const url = `${process.env.NEXT_PUBLIC_BASE_URL}/api/spaces/invites/accept?token=${encodeURIComponent(
    token,
  )}`;
  return NextResponse.json({ invite, url }, { status: 201 });
}
