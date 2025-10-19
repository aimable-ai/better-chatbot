import { NextRequest, NextResponse } from "next/server";
import { getSession } from "lib/auth/auth-instance";
import { spacesRepository } from "lib/spaces/repository";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { token } = await req.json();
  if (!token)
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  const invite = await spacesRepository.getInviteByToken(token);
  if (!invite)
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  if (new Date(invite.expiresAt as unknown as string) < new Date()) {
    return NextResponse.json({ error: "Token expired" }, { status: 400 });
  }
  const member = await spacesRepository.upsertMember(
    invite.spaceId,
    session.user.id,
    invite.role as any,
  );
  await spacesRepository.deleteInviteById(invite.id);
  return NextResponse.json({ member });
}
