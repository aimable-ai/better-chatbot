import { pgDb as db } from "../db.pg";
import { McpServerSchema, UserSchema } from "../schema.pg";
import { eq, or, desc, and } from "drizzle-orm";
import { generateUUID } from "lib/utils";
import type { MCPRepository } from "app-types/mcp";

export const pgMcpRepository: MCPRepository = {
  async save(server) {
    const [result] = await db
      .insert(McpServerSchema)
      .values({
        id: server.id ?? generateUUID(),
        name: server.name,
        config: server.config,
        userId: server.userId,
        spaceId: server.spaceId,
        visibility: server.visibility ?? "public",
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [McpServerSchema.id],
        set: {
          config: server.config,
          spaceId: server.spaceId,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result;
  },

  async selectById(id: string, spaceId: string) {
    const [result] = await db
      .select()
      .from(McpServerSchema)
      .where(and(eq(McpServerSchema.id, id), eq(McpServerSchema.spaceId, spaceId)));
    return result;
  },

  async selectAll() {
    const results = await db.select().from(McpServerSchema);
    return results;
  },

  async selectAllForUser(userId: string, spaceId: string) {
    // Get user's own MCP servers and public ones within the space
    const results = await db
      .select({
        id: McpServerSchema.id,
        name: McpServerSchema.name,
        config: McpServerSchema.config,
        enabled: McpServerSchema.enabled,
        userId: McpServerSchema.userId,
        spaceId: McpServerSchema.spaceId,
        visibility: McpServerSchema.visibility,
        createdAt: McpServerSchema.createdAt,
        updatedAt: McpServerSchema.updatedAt,
        userName: UserSchema.name,
        userAvatar: UserSchema.image,
      })
      .from(McpServerSchema)
      .leftJoin(UserSchema, eq(McpServerSchema.userId, UserSchema.id))
      .where(
        and(
          eq(McpServerSchema.spaceId, spaceId),
          or(
            eq(McpServerSchema.userId, userId),
            eq(McpServerSchema.visibility, "public"),
          ),
        ),
      )
      .orderBy(desc(McpServerSchema.createdAt));
    return results;
  },

  async updateVisibility(id: string, spaceId: string, visibility: "public" | "private") {
    await db
      .update(McpServerSchema)
      .set({ visibility, updatedAt: new Date() })
      .where(and(eq(McpServerSchema.id, id), eq(McpServerSchema.spaceId, spaceId)));
  },

  async deleteById(id: string, spaceId: string) {
    await db
      .delete(McpServerSchema)
      .where(and(eq(McpServerSchema.id, id), eq(McpServerSchema.spaceId, spaceId)));
  },

  async selectByServerName(name: string) {
    const [result] = await db
      .select()
      .from(McpServerSchema)
      .where(eq(McpServerSchema.name, name));
    return result;
  },

  async existsByServerName(name: string) {
    const [result] = await db
      .select({ id: McpServerSchema.id })
      .from(McpServerSchema)
      .where(eq(McpServerSchema.name, name));

    return !!result;
  },

  async checkAccess(mcpServerId: string, userId: string, spaceId: string) {
    const [mcpServer] = await db
      .select({
        visibility: McpServerSchema.visibility,
        userId: McpServerSchema.userId,
        spaceId: McpServerSchema.spaceId,
      })
      .from(McpServerSchema)
      .where(and(eq(McpServerSchema.id, mcpServerId), eq(McpServerSchema.spaceId, spaceId)));
    
    if (!mcpServer) {
      return false;
    }
    
    // User owns the MCP server
    if (userId === mcpServer.userId) {
      return true;
    }
    
    // MCP server is public within the space
    if (mcpServer.visibility === "public") {
      return true;
    }
    
    return false;
  },
};
