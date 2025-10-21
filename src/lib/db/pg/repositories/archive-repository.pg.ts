import {
  Archive,
  ArchiveItem,
  ArchiveRepository,
  ArchiveWithItemCount,
} from "app-types/archive";
import { pgDb as db } from "../db.pg";
import { ArchiveSchema, ArchiveItemSchema } from "../schema.pg";
import { and, eq, count } from "drizzle-orm";
import { generateUUID } from "lib/utils";

export const pgArchiveRepository: ArchiveRepository = {
  async createArchive(archive) {
    const [result] = await db
      .insert(ArchiveSchema)
      .values({
        id: generateUUID(),
        name: archive.name,
        description: archive.description,
        userId: archive.userId,
        spaceId: archive.spaceId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return result as Archive;
  },

  async getArchivesByUserId(userId: string, spaceId: string) {
    const result = await db
      .select({
        id: ArchiveSchema.id,
        name: ArchiveSchema.name,
        description: ArchiveSchema.description,
        userId: ArchiveSchema.userId,
        spaceId: ArchiveSchema.spaceId,
        createdAt: ArchiveSchema.createdAt,
        updatedAt: ArchiveSchema.updatedAt,
        itemCount: count(ArchiveItemSchema.id),
      })
      .from(ArchiveSchema)
      .leftJoin(
        ArchiveItemSchema,
        eq(ArchiveSchema.id, ArchiveItemSchema.archiveId),
      )
      .where(and(eq(ArchiveSchema.userId, userId), eq(ArchiveSchema.spaceId, spaceId)))
      .groupBy(ArchiveSchema.id)
      .orderBy(ArchiveSchema.updatedAt);

    return result.map((row) => ({
      ...row,
      itemCount: Number(row.itemCount),
    })) as ArchiveWithItemCount[];
  },

  async getArchiveById(id: string, spaceId: string) {
    const [result] = await db
      .select()
      .from(ArchiveSchema)
      .where(and(eq(ArchiveSchema.id, id), eq(ArchiveSchema.spaceId, spaceId)));
    return result as Archive | null;
  },

  async updateArchive(id: string, spaceId: string, archive) {
    const [result] = await db
      .update(ArchiveSchema)
      .set({
        name: archive.name,
        description: archive.description,
        updatedAt: new Date(),
      })
      .where(and(eq(ArchiveSchema.id, id), eq(ArchiveSchema.spaceId, spaceId)))
      .returning();
    return result as Archive;
  },

  async deleteArchive(id: string, spaceId: string) {
    await db
      .delete(ArchiveItemSchema)
      .where(eq(ArchiveItemSchema.archiveId, id));
    await db
      .delete(ArchiveSchema)
      .where(and(eq(ArchiveSchema.id, id), eq(ArchiveSchema.spaceId, spaceId)));
  },

  async addItemToArchive(archiveId: string, itemId: string, userId: string, spaceId: string) {
    // Verify archive belongs to the space
    const archive = await this.getArchiveById(archiveId, spaceId);
    if (!archive) {
      throw new Error("Archive not found or access denied");
    }

    const [result] = await db
      .insert(ArchiveItemSchema)
      .values({
        id: generateUUID(),
        archiveId,
        itemId,
        userId,
        addedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();
    return result as ArchiveItem;
  },

  async removeItemFromArchive(archiveId: string, itemId: string, spaceId: string) {
    // Verify archive belongs to the space
    const archive = await this.getArchiveById(archiveId, spaceId);
    if (!archive) {
      throw new Error("Archive not found or access denied");
    }

    await db
      .delete(ArchiveItemSchema)
      .where(
        and(
          eq(ArchiveItemSchema.archiveId, archiveId),
          eq(ArchiveItemSchema.itemId, itemId),
        ),
      );
  },

  async getArchiveItems(archiveId: string, spaceId: string) {
    // Verify archive belongs to the space
    const archive = await this.getArchiveById(archiveId, spaceId);
    if (!archive) {
      throw new Error("Archive not found or access denied");
    }

    const result = await db
      .select()
      .from(ArchiveItemSchema)
      .where(eq(ArchiveItemSchema.archiveId, archiveId))
      .orderBy(ArchiveItemSchema.addedAt);
    return result as ArchiveItem[];
  },

  async getItemArchives(itemId: string, userId: string, spaceId: string) {
    const result = await db
      .select({
        id: ArchiveSchema.id,
        name: ArchiveSchema.name,
        description: ArchiveSchema.description,
        userId: ArchiveSchema.userId,
        spaceId: ArchiveSchema.spaceId,
        createdAt: ArchiveSchema.createdAt,
        updatedAt: ArchiveSchema.updatedAt,
      })
      .from(ArchiveSchema)
      .innerJoin(
        ArchiveItemSchema,
        eq(ArchiveSchema.id, ArchiveItemSchema.archiveId),
      )
      .where(
        and(
          eq(ArchiveItemSchema.itemId, itemId),
          eq(ArchiveSchema.userId, userId),
          eq(ArchiveSchema.spaceId, spaceId),
        ),
      )
      .orderBy(ArchiveSchema.name);
    return result as Archive[];
  },

  async checkAccess(archiveId: string, userId: string, spaceId: string) {
    const [archive] = await db
      .select({
        userId: ArchiveSchema.userId,
        spaceId: ArchiveSchema.spaceId,
      })
      .from(ArchiveSchema)
      .where(and(eq(ArchiveSchema.id, archiveId), eq(ArchiveSchema.spaceId, spaceId)));
    
    if (!archive) {
      return false;
    }
    
    // User owns the archive
    if (userId === archive.userId) {
      return true;
    }
    
    // For now, archives are private to the user who created them
    // In the future, we could add visibility settings like agents/workflows
    return false;
  },
};
