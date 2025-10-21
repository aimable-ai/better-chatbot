import { NextRequest, NextResponse } from "next/server";
import { getSession } from "lib/auth/auth-instance";
import { pgDb } from "lib/db/pg/db.pg";
import { SpaceMemberSchema, SpaceSchema } from "lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";
import { canAccessPersonalSpace } from "lib/spaces/permissions";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  // Global admin: list all spaces
  const isAdmin = session.user.role?.split(",").includes("admin");
  if (isAdmin) {
    const spaces = await pgDb.select().from(SpaceSchema);
    return NextResponse.json({ spaces });
  }

  // Else: list spaces where user is a member
  const allSpaces = await pgDb
    .select()
    .from(SpaceSchema)
    .innerJoin(SpaceMemberSchema, eq(SpaceMemberSchema.spaceId, SpaceSchema.id))
    .where(eq(SpaceMemberSchema.userId, userId));

  // Filter out personal spaces that user shouldn't see
  const filteredSpaces: typeof allSpaces = [];
  for (const spaceRow of allSpaces) {
    const space = spaceRow.space;
    const access = await canAccessPersonalSpace(space.id, userId, session.user.role || "");
    
    if (access.canAccess) {
      filteredSpaces.push(spaceRow);
    }
  }

  return NextResponse.json({ spaces: filteredSpaces });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const { name } = await req.json();
  if (!name)
    return NextResponse.json({ error: "Missing name" }, { status: 400 });

  const [space] = await pgDb.insert(SpaceSchema).values({ name }).returning();
  await pgDb
    .insert(SpaceMemberSchema)
    .values({ spaceId: (space as any).id, userId, role: "owner" })
    .returning();

  return NextResponse.json({ space }, { status: 201 });
}
