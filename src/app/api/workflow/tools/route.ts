import { getSession } from "auth/server";
import { workflowRepository } from "lib/db/repository";
import { validateUserAccessToCurrentSpace } from "lib/spaces/current-space";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json([]);
  }
  
  const { spaceId } = await validateUserAccessToCurrentSpace();
  if (!spaceId) {
    return Response.json({ error: "Workspace required" }, { status: 400 });
  }
  
  const workflows = await workflowRepository.selectExecuteAbility(
    session.user.id,
    spaceId,
  );
  return Response.json(workflows);
}
