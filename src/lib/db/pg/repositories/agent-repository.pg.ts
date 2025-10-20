import { Agent, AgentRepository, AgentSummary } from "app-types/agent";
import { pgDb as db } from "../db.pg";
import { AgentSchema, BookmarkSchema, UserSchema } from "../schema.pg";
import { and, desc, eq, ne, or, sql } from "drizzle-orm";
import { generateUUID } from "lib/utils";

export const pgAgentRepository: AgentRepository = {
  async insertAgent(
    agent: Parameters<AgentRepository["insertAgent"]>[0],
  ) {
    const [result] = await db
      .insert(AgentSchema)
      .values({
        id: generateUUID(),
        name: agent.name,
        description: agent.description,
        icon: agent.icon,
        userId: agent.userId,
        spaceId: agent.spaceId,
        instructions: agent.instructions,
        visibility: agent.visibility || "public",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return {
      ...result,
      description: result.description ?? undefined,
      icon: result.icon ?? undefined,
      instructions: result.instructions ?? {},
    };
  },

  async selectAgentById(
    id: string,
    userId: string,
    spaceId: string,
  ): Promise<Agent | null> {
    const [result] = await db
      .select({
        id: AgentSchema.id,
        name: AgentSchema.name,
        description: AgentSchema.description,
        icon: AgentSchema.icon,
        userId: AgentSchema.userId,
        spaceId: AgentSchema.spaceId,
        instructions: AgentSchema.instructions,
        visibility: AgentSchema.visibility,
        createdAt: AgentSchema.createdAt,
        updatedAt: AgentSchema.updatedAt,
        isBookmarked: sql<boolean>`${BookmarkSchema.id} IS NOT NULL`,
      })
      .from(AgentSchema)
      .leftJoin(
        BookmarkSchema,
        and(
          eq(BookmarkSchema.itemId, AgentSchema.id),
          eq(BookmarkSchema.userId, userId),
          eq(BookmarkSchema.itemType, "agent"),
        ),
      )
      .where(
        and(
          eq(AgentSchema.id, id),
          eq(AgentSchema.spaceId, spaceId),
          or(
            eq(AgentSchema.userId, userId),
            eq(AgentSchema.visibility, "public"),
            eq(AgentSchema.visibility, "readonly"),
          ),
        ),
      );

    if (!result) return null;

    return {
      ...result,
      description: result.description ?? undefined,
      icon: result.icon ?? undefined,
      instructions: result.instructions ?? {},
      isBookmarked: result.isBookmarked ?? false,
    };
  },

  async selectAgentsByUserId(userId: string) {
    const results = await db
      .select({
        id: AgentSchema.id,
        name: AgentSchema.name,
        description: AgentSchema.description,
        icon: AgentSchema.icon,
        userId: AgentSchema.userId,
        spaceId: AgentSchema.spaceId,
        instructions: AgentSchema.instructions,
        visibility: AgentSchema.visibility,
        createdAt: AgentSchema.createdAt,
        updatedAt: AgentSchema.updatedAt,
        userName: UserSchema.name,
        userAvatar: UserSchema.image,
        isBookmarked: sql<boolean>`false`,
      })
      .from(AgentSchema)
      .innerJoin(UserSchema, eq(AgentSchema.userId, UserSchema.id))
      .where(eq(AgentSchema.userId, userId))
      .orderBy(desc(AgentSchema.createdAt));

    return results.map((result) => ({
      ...result,
      description: result.description ?? undefined,
      icon: result.icon ?? undefined,
      instructions: result.instructions ?? {},
      userName: result.userName ?? undefined,
      userAvatar: result.userAvatar ?? undefined,
      isBookmarked: false,
    }));
  },

  async updateAgent(
    id: string,
    userId: string,
    agent: Parameters<AgentRepository["updateAgent"]>[2],
  ) {
    const [result] = await db
      .update(AgentSchema)
      .set({
        ...agent,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(AgentSchema.id, id),
          or(eq(AgentSchema.userId, userId), eq(AgentSchema.visibility, "public")),
        ),
      )
      .returning();

    return {
      ...result,
      description: result.description ?? undefined,
      icon: result.icon ?? undefined,
      instructions: result.instructions ?? {},
    };
  },

  async deleteAgent(id: string, userId: string) {
    await db
      .delete(AgentSchema)
      .where(and(eq(AgentSchema.id, id), eq(AgentSchema.userId, userId)));
  },

  async selectAgents(
    currentUserId: string,
    spaceId: string,
    filters: ("all" | "mine" | "shared" | "bookmarked")[] = ["all"],
    limit: number = 50,
  ): Promise<AgentSummary[]> {
    let orConditions: any[] = [];

    for (const filter of filters) {
      if (filter === "mine") {
        orConditions.push(eq(AgentSchema.userId, currentUserId));
      } else if (filter === "shared") {
        orConditions.push(
          and(
            ne(AgentSchema.userId, currentUserId),
            or(eq(AgentSchema.visibility, "public"), eq(AgentSchema.visibility, "readonly")),
          ),
        );
      } else if (filter === "bookmarked") {
        orConditions.push(
          and(
            ne(AgentSchema.userId, currentUserId),
            or(eq(AgentSchema.visibility, "public"), eq(AgentSchema.visibility, "readonly")),
            sql`${BookmarkSchema.id} IS NOT NULL`,
          ),
        );
      } else if (filter === "all") {
        orConditions = [
          or(
            eq(AgentSchema.userId, currentUserId),
            and(
              ne(AgentSchema.userId, currentUserId),
              or(eq(AgentSchema.visibility, "public"), eq(AgentSchema.visibility, "readonly")),
            ),
          ),
        ];
        break;
      }
    }

    const results = await db
      .select({
        id: AgentSchema.id,
        name: AgentSchema.name,
        description: AgentSchema.description,
        icon: AgentSchema.icon,
        userId: AgentSchema.userId,
        spaceId: AgentSchema.spaceId,
        visibility: AgentSchema.visibility,
        createdAt: AgentSchema.createdAt,
        updatedAt: AgentSchema.updatedAt,
        userName: UserSchema.name,
        userAvatar: UserSchema.image,
        isBookmarked: sql<boolean>`CASE WHEN ${BookmarkSchema.id} IS NOT NULL THEN true ELSE false END`,
      })
      .from(AgentSchema)
      .innerJoin(UserSchema, eq(AgentSchema.userId, UserSchema.id))
      .leftJoin(
        BookmarkSchema,
        and(
          eq(BookmarkSchema.itemId, AgentSchema.id),
          eq(BookmarkSchema.itemType, "agent"),
          eq(BookmarkSchema.userId, currentUserId),
        ),
      )
      .where(
        and(
          eq(AgentSchema.spaceId, spaceId),
          (orConditions.length > 1 ? or(...orConditions) : orConditions[0]),
        ),
      )
      .orderBy(
        sql`CASE WHEN ${AgentSchema.userId} = ${currentUserId} THEN 0 ELSE 1 END`,
        desc(AgentSchema.createdAt),
      )
      .limit(limit);

    return results.map((result) => ({
      ...result,
      description: result.description ?? undefined,
      icon: result.icon ?? undefined,
      userName: result.userName ?? undefined,
      userAvatar: result.userAvatar ?? undefined,
    }));
  },

  async checkAccess(
    agentId: string,
    userId: string,
    spaceId: string,
    destructive: boolean = false,
  ) {
    const [agent] = await db
      .select({
        visibility: AgentSchema.visibility,
        userId: AgentSchema.userId,
        spaceId: AgentSchema.spaceId,
      })
      .from(AgentSchema)
      .where(eq(AgentSchema.id, agentId));
    if (!agent) return false;
    if (agent.spaceId !== spaceId) return false;
    if (userId == agent.userId) return true;
    if (agent.visibility === "public" && !destructive) return true;
    return false;
  },
};
