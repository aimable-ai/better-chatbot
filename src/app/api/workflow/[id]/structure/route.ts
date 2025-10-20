import { getSession } from "auth/server";
import { workflowRepository } from "lib/db/repository";
import { validateUserAccessToCurrentSpace } from "lib/spaces/current-space";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  
  const { spaceId } = await validateUserAccessToCurrentSpace();
  if (!spaceId) {
    return new Response("Workspace required", { status: 400 });
  }
  
  const hasAccess = await workflowRepository.checkAccess(id, session.user.id, spaceId);
  if (!hasAccess) {
    return new Response("Unauthorized", { status: 401 });
  }
  const workflow = await workflowRepository.selectStructureById(id, spaceId);
  return Response.json(workflow);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { nodes, edges, deleteNodes, deleteEdges } = await request.json();
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { spaceId } = await validateUserAccessToCurrentSpace();
  if (!spaceId) {
    return new Response("Workspace required", { status: 400 });
  }

  const hasAccess = await workflowRepository.checkAccess(
    id,
    session.user.id,
    spaceId,
    false,
  );
  if (!hasAccess) {
    return new Response("Unauthorized", { status: 401 });
  }
  await workflowRepository.saveStructure({
    workflowId: id,
    nodes: nodes.map((v) => ({
      ...v,
      workflowId: id,
    })),
    edges: edges.map((v) => ({
      ...v,
      workflowId: id,
    })),
    deleteNodes,
    deleteEdges,
  });

  return Response.json({ success: true });
}
