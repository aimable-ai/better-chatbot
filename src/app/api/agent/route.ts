import { agentRepository } from "lib/db/repository";
import { getSession } from "auth/server";
import { z } from "zod";
import { serverCache } from "lib/cache";
import { CacheKeys } from "lib/cache/cache-keys";
import { AgentCreateSchema, AgentQuerySchema } from "app-types/agent";
import { canCreateAgent } from "lib/auth/permissions";
import { validateUserAccessToCurrentSpace } from "lib/spaces/current-space";

export async function GET(request: Request) {
  const session = await getSession();

  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const {
      type,
      filters: filtersParam,
      limit,
    } = AgentQuerySchema.parse(queryParams);

    // Parse filters - can be passed as comma-separated string or single type
    let filters;
    if (filtersParam) {
      filters = filtersParam.split(",").map((f) => f.trim());
    } else {
      // Fallback to single type parameter for backward compatibility
      filters = [type];
    }

    // Determine current space and ensure access
    const { user: { id: userId } } = session;
    const { spaceId } = await validateUserAccessToCurrentSpace();
    if (!spaceId) {
      return Response.json({ error: "Workspace required" }, { status: 400 });
    }

    // Use the new simplified selectAgents method with database-level filtering and limiting scoped by space
    const agents = await agentRepository.selectAgents(userId, spaceId, filters, limit);
    return Response.json(agents);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid query parameters", details: error.message },
        { status: 400 },
      );
    }

    console.error("Failed to fetch agents:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  const session = await getSession();

  if (!session?.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Check if user has permission to create agents
  const hasPermission = await canCreateAgent();
  if (!hasPermission) {
    return Response.json(
      { error: "You don't have permission to create agents" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const data = AgentCreateSchema.parse(body);
    const { spaceId } = await validateUserAccessToCurrentSpace();
    if (!spaceId) {
      return Response.json({ error: "Workspace required" }, { status: 400 });
    }

    const agent = await agentRepository.insertAgent({
      ...data,
      userId: session.user.id,
      spaceId,
    });
    serverCache.delete(CacheKeys.agentInstructions(agent.id));

    return Response.json(agent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid input", details: error.message },
        { status: 400 },
      );
    }

    console.error("Failed to upsert agent:", error);
    return Response.json(
      { message: "Internal Server Error" },
      {
        status: 500,
      },
    );
  }
}
