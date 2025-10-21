import { getSession } from "auth/server";
import { chatRepository } from "lib/db/repository";
import { validateUserAccessToCurrentSpace } from "lib/spaces/current-space";

export async function GET() {
  const session = await getSession();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { spaceId } = await validateUserAccessToCurrentSpace();
  if (!spaceId) {
    return new Response("Space required", { status: 400 });
  }

  const threads = await chatRepository.selectThreadsByUserId(session.user.id, spaceId);
  return Response.json(threads);
}
