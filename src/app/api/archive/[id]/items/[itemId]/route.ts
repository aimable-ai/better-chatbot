import { archiveRepository } from "lib/db/repository";
import { getSession } from "auth/server";
import { validateUserAccessToCurrentSpace } from "lib/spaces/current-space";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const session = await getSession();

  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { spaceId } = await validateUserAccessToCurrentSpace();
  if (!spaceId) {
    return new Response("Workspace required", { status: 400 });
  }

  const { id, itemId } = await params;

  try {
    // Check if archive exists and user owns it
    const archive = await archiveRepository.getArchiveById(id, spaceId);

    if (!archive) {
      return Response.json({ error: "Archive not found" }, { status: 404 });
    }

    if (archive.userId !== session.user.id) {
      return new Response("Forbidden", { status: 403 });
    }

    // Check if item exists in archive
    const items = await archiveRepository.getArchiveItems(id, spaceId);
    const itemExists = items.some((item) => item.itemId === itemId);

    if (!itemExists) {
      return Response.json(
        { error: "Item not found in archive" },
        { status: 404 },
      );
    }

    await archiveRepository.removeItemFromArchive(id, itemId, spaceId);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to remove item from archive:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
