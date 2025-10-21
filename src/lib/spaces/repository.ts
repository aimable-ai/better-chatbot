import { and, eq, lt, isNotNull } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import {
  SpaceSchema,
  SpaceMemberSchema,
  SpaceInviteSchema,
  type SpaceEntity,
  type SpaceMemberEntity,
  type SpaceInviteEntity,
} from "lib/db/pg/schema.pg";
import { SPACE_RETENTION_DAYS } from "./config";

export const spacesRepository = {
  // Spaces
  async createSpace(name: string, options?: { isPersonal?: boolean }): Promise<SpaceEntity> {
    const [space] = await pgDb.insert(SpaceSchema).values({ 
      name, 
      isPersonal: options?.isPersonal || false 
    }).returning();
    return space as SpaceEntity;
  },
  async getSpaceById(spaceId: string): Promise<SpaceEntity | undefined> {
    const [space] = await pgDb
      .select()
      .from(SpaceSchema)
      .where(eq(SpaceSchema.id, spaceId));
    return space as SpaceEntity | undefined;
  },
  async updateSpace(spaceId: string, data: Partial<Pick<SpaceEntity, "name">>) {
    const [space] = await pgDb
      .update(SpaceSchema)
      .set({ ...data })
      .where(eq(SpaceSchema.id, spaceId))
      .returning();
    return space as SpaceEntity;
  },
  async deleteSpace(spaceId: string) {
    await pgDb.delete(SpaceSchema).where(eq(SpaceSchema.id, spaceId));
  },
  async listSpacesForUser(userId: string): Promise<SpaceEntity[]> {
    // Use a proper join to get spaces where user is a member
    const rows = await pgDb
      .select({
        id: SpaceSchema.id,
        name: SpaceSchema.name,
        status: SpaceSchema.status,
        isPersonal: SpaceSchema.isPersonal,
        archivedAt: SpaceSchema.archivedAt,
        archivedBy: SpaceSchema.archivedBy,
        deletedAt: SpaceSchema.deletedAt,
        deletedBy: SpaceSchema.deletedBy,
        createdAt: SpaceSchema.createdAt,
        updatedAt: SpaceSchema.updatedAt,
      })
      .from(SpaceSchema)
      .innerJoin(
        SpaceMemberSchema,
        eq(SpaceSchema.id, SpaceMemberSchema.spaceId),
      )
      .where(eq(SpaceMemberSchema.userId, userId));

    return rows as SpaceEntity[];
  },

  async getPersonalSpaceForUser(userId: string): Promise<SpaceEntity | undefined> {
    // Get personal space where user is a member
    const [space] = await pgDb
      .select({
        id: SpaceSchema.id,
        name: SpaceSchema.name,
        status: SpaceSchema.status,
        isPersonal: SpaceSchema.isPersonal,
        archivedAt: SpaceSchema.archivedAt,
        archivedBy: SpaceSchema.archivedBy,
        deletedAt: SpaceSchema.deletedAt,
        deletedBy: SpaceSchema.deletedBy,
        createdAt: SpaceSchema.createdAt,
        updatedAt: SpaceSchema.updatedAt,
      })
      .from(SpaceSchema)
      .innerJoin(
        SpaceMemberSchema,
        eq(SpaceSchema.id, SpaceMemberSchema.spaceId),
      )
      .where(
        and(
          eq(SpaceMemberSchema.userId, userId),
          eq(SpaceSchema.isPersonal, true),
          eq(SpaceSchema.status, "active")
        )
      );

    return space as SpaceEntity | undefined;
  },

  // Memberships
  async upsertMember(
    spaceId: string,
    userId: string,
    role: SpaceMemberEntity["role"],
  ) {
    const [existing] = (await pgDb
      .select()
      .from(SpaceMemberSchema)
      .where(
        and(
          eq(SpaceMemberSchema.spaceId, spaceId),
          eq(SpaceMemberSchema.userId, userId),
        ),
      )) as SpaceMemberEntity[];
    if (existing) {
      const [updated] = await pgDb
        .update(SpaceMemberSchema)
        .set({ role })
        .where(eq(SpaceMemberSchema.id, existing.id))
        .returning();
      return updated as SpaceMemberEntity;
    }
    const [member] = await pgDb
      .insert(SpaceMemberSchema)
      .values({ spaceId, userId, role })
      .returning();
    return member as SpaceMemberEntity;
  },
  async getMember(spaceId: string, userId: string) {
    const [member] = await pgDb
      .select()
      .from(SpaceMemberSchema)
      .where(
        and(
          eq(SpaceMemberSchema.spaceId, spaceId),
          eq(SpaceMemberSchema.userId, userId),
        ),
      );
    return member as SpaceMemberEntity | undefined;
  },
  async listMembers(spaceId: string) {
    return (await pgDb
      .select()
      .from(SpaceMemberSchema)
      .where(eq(SpaceMemberSchema.spaceId, spaceId))) as SpaceMemberEntity[];
  },
  async removeMember(spaceId: string, userId: string) {
    await pgDb
      .delete(SpaceMemberSchema)
      .where(
        and(
          eq(SpaceMemberSchema.spaceId, spaceId),
          eq(SpaceMemberSchema.userId, userId),
        ),
      );
  },

  // Invites
  async createInvite(
    spaceId: string,
    email: string,
    role: Exclude<SpaceInviteEntity["role"], "owner">,
    token: string,
    expiresAt: Date,
  ) {
    const [invite] = await pgDb
      .insert(SpaceInviteSchema)
      .values({ spaceId, email, role, token, expiresAt })
      .returning();
    return invite as SpaceInviteEntity;
  },
  async listInvites(spaceId: string) {
    return (await pgDb
      .select()
      .from(SpaceInviteSchema)
      .where(eq(SpaceInviteSchema.spaceId, spaceId))) as SpaceInviteEntity[];
  },
  async getInviteByToken(token: string) {
    const [invite] = await pgDb
      .select()
      .from(SpaceInviteSchema)
      .where(eq(SpaceInviteSchema.token, token));
    return invite as SpaceInviteEntity | undefined;
  },
  async deleteInviteById(id: string) {
    await pgDb.delete(SpaceInviteSchema).where(eq(SpaceInviteSchema.id, id));
  },

  // Lifecycle methods
  async archiveSpace(spaceId: string, userId: string): Promise<SpaceEntity> {
    const [space] = await pgDb
      .update(SpaceSchema)
      .set({
        status: "archived",
        archivedAt: new Date(),
        archivedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(SpaceSchema.id, spaceId))
      .returning();
    return space as SpaceEntity;
  },

  async unarchiveSpace(spaceId: string): Promise<SpaceEntity> {
    const [space] = await pgDb
      .update(SpaceSchema)
      .set({
        status: "active",
        archivedAt: null,
        archivedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(SpaceSchema.id, spaceId))
      .returning();
    return space as SpaceEntity;
  },

  async permanentlyDeleteSpace(
    spaceId: string,
    userId: string,
  ): Promise<SpaceEntity> {
    const [space] = await pgDb
      .update(SpaceSchema)
      .set({
        status: "deleted",
        deletedAt: new Date(),
        deletedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(SpaceSchema.id, spaceId))
      .returning();
    return space as SpaceEntity;
  },

  async listArchivedSpaces(): Promise<SpaceEntity[]> {
    return (await pgDb
      .select()
      .from(SpaceSchema)
      .where(eq(SpaceSchema.status, "archived"))) as SpaceEntity[];
  },

  async getSpacesForCleanup(beforeDate: Date): Promise<SpaceEntity[]> {
    return (await pgDb
      .select()
      .from(SpaceSchema)
      .where(
        and(
          eq(SpaceSchema.status, "archived"),
          isNotNull(SpaceSchema.archivedAt),
          lt(SpaceSchema.archivedAt, beforeDate),
        ),
      )) as SpaceEntity[];
  },

  async isWithinRetentionPeriod(spaceId: string): Promise<boolean> {
    const space = await this.getSpaceById(spaceId);
    if (!space?.archivedAt) return false;

    const retentionCutoff = new Date(
      Date.now() - SPACE_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    return space.archivedAt > retentionCutoff;
  },
};
