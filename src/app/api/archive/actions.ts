"use server";

import { archiveRepository } from "lib/db/repository";
import { getSession } from "auth/server";
import { ArchiveCreateSchema, ArchiveUpdateSchema } from "app-types/archive";
import { validateUserAccessToCurrentSpace } from "lib/spaces/current-space";

async function getUserId() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("User not found");
  }
  return userId;
}

export async function createArchiveAction(data: {
  name: string;
  description?: string;
}) {
  const userId = await getUserId();
  const validatedData = ArchiveCreateSchema.parse(data);

  const { spaceId } = await validateUserAccessToCurrentSpace();
  if (!spaceId) {
    throw new Error("Workspace required");
  }

  return await archiveRepository.createArchive({
    name: validatedData.name,
    description: validatedData.description || null,
    userId,
    spaceId,
  });
}

export async function updateArchiveAction(
  id: string,
  data: { name?: string; description?: string },
) {
  const userId = await getUserId();

  const { spaceId } = await validateUserAccessToCurrentSpace();
  if (!spaceId) {
    throw new Error("Workspace required");
  }

  // Check if user owns the archive
  const existingArchive = await archiveRepository.getArchiveById(id, spaceId);
  if (!existingArchive || existingArchive.userId !== userId) {
    throw new Error("Archive not found or access denied");
  }

  const validatedData = ArchiveUpdateSchema.parse(data);

  return await archiveRepository.updateArchive(id, spaceId, {
    name: validatedData.name,
    description: validatedData.description || null,
  });
}

export async function deleteArchiveAction(id: string) {
  const userId = await getUserId();

  const { spaceId } = await validateUserAccessToCurrentSpace();
  if (!spaceId) {
    throw new Error("Workspace required");
  }

  // Check if user owns the archive
  const existingArchive = await archiveRepository.getArchiveById(id, spaceId);
  if (!existingArchive || existingArchive.userId !== userId) {
    throw new Error("Archive not found or access denied");
  }

  await archiveRepository.deleteArchive(id, spaceId);
}

export async function addItemToArchiveAction(
  archiveId: string,
  itemId: string,
) {
  const userId = await getUserId();

  const { spaceId } = await validateUserAccessToCurrentSpace();
  if (!spaceId) {
    throw new Error("Workspace required");
  }

  // Check if user owns the archive
  const existingArchive = await archiveRepository.getArchiveById(archiveId, spaceId);
  if (!existingArchive || existingArchive.userId !== userId) {
    throw new Error("Archive not found or access denied");
  }

  return await archiveRepository.addItemToArchive(archiveId, itemId, userId, spaceId);
}

export async function removeItemFromArchiveAction(
  archiveId: string,
  itemId: string,
) {
  const userId = await getUserId();

  const { spaceId } = await validateUserAccessToCurrentSpace();
  if (!spaceId) {
    throw new Error("Workspace required");
  }

  // Check if user owns the archive
  const existingArchive = await archiveRepository.getArchiveById(archiveId, spaceId);
  if (!existingArchive || existingArchive.userId !== userId) {
    throw new Error("Archive not found or access denied");
  }

  await archiveRepository.removeItemFromArchive(archiveId, itemId, spaceId);
}

export async function getItemArchivesAction(itemId: string) {
  const userId = await getUserId();
  
  const { spaceId } = await validateUserAccessToCurrentSpace();
  if (!spaceId) {
    throw new Error("Workspace required");
  }

  return await archiveRepository.getItemArchives(itemId, userId, spaceId);
}
