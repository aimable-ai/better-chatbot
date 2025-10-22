import { NextRequest, NextResponse } from "next/server";
import { removeMcpClientAction } from "@/app/api/mcp/actions";
import { pgMcpRepository } from "lib/db/pg/repositories/mcp-repository.pg";
import { getSession } from "auth/server";
import logger from "lib/logger";
import { canManageMCPServer } from "lib/auth/permissions";
import { validateUserAccessToCurrentSpace } from "lib/spaces/current-space";

export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { spaceId } = await validateUserAccessToCurrentSpace();
    if (!spaceId) {
      return NextResponse.json({ error: "Space required" }, { status: 400 });
    }

    const mcpServer = await pgMcpRepository.selectById(params.id, spaceId);
    if (!mcpServer) {
      return NextResponse.json(
        { error: "MCP server not found" },
        { status: 404 },
      );
    }

    const hasAccess = await pgMcpRepository.checkAccess(
      params.id,
      session.user.id,
      spaceId,
    );
    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Stricter management check: only the owner or admins can manage (delete/update)
    const canManage = await canManageMCPServer(
      mcpServer.userId,
      mcpServer.visibility,
    );
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await removeMcpClientAction(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete MCP server:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete MCP server",
      },
      {
        status:
          error instanceof Error && error.message.includes("permission")
            ? 403
            : 500,
      },
    );
  }
}
