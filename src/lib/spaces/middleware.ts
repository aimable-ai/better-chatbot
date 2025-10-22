import { NextRequest, NextResponse } from "next/server";
import { requireActiveSpace } from "./permissions";
import { SPACE_ERRORS } from "./config";

type SpaceHandler = (
  req: NextRequest,
  context: Record<string, unknown>,
) => Promise<Response> | Response;

export async function protectSpaceWriteOperations(
  req: NextRequest,
  spaceId: string,
): Promise<NextResponse | null> {
  try {
    await requireActiveSpace(spaceId);
    return null; // Allow the request to proceed
  } catch (error: any) {
    if (error.code === SPACE_ERRORS.WORKSPACE_ARCHIVED.code) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code },
      );
    }
    if (error.code === SPACE_ERRORS.WORKSPACE_DELETED.code) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code },
      );
    }
    if (error.code === SPACE_ERRORS.WORKSPACE_NOT_FOUND.code) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code },
      );
    }
    // Re-throw other errors
    throw error;
  }
}

// Helper to extract spaceId from various route patterns
export function extractSpaceIdFromPath(pathname: string): string | null {
  // Pattern: /api/spaces/[spaceId]/...
  const match = pathname.match(/^\/api\/spaces\/([^\/]+)/);
  return match ? match[1] : null;
}

// Middleware wrapper for space write operations
export function withSpaceProtection(handler: SpaceHandler): SpaceHandler {
  return async (
    req: NextRequest,
    context: Record<string, unknown>,
  ): Promise<Response> => {
    const spaceId = extractSpaceIdFromPath(req.nextUrl.pathname);

    if (spaceId) {
      const protectionResponse = await protectSpaceWriteOperations(
        req,
        spaceId,
      );
      if (protectionResponse) {
        return protectionResponse;
      }
    }

    return handler(req, context);
  };
}
