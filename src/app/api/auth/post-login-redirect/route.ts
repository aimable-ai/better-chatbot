import { NextRequest, NextResponse } from "next/server";
import { getSession } from "lib/auth/auth-instance";
import { getRedirectSpaceForUser } from "lib/spaces/utils";
import logger from "lib/logger";

export async function GET(request: NextRequest) {
  try {
    // Check user session
    const session = await getSession();
    if (!session) {
      logger.info("No session found, redirecting to sign-in");
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    const userId = session.user.id;
    logger.info(`Post-login redirect for user: ${userId}`);

    // Get last visited space from cookie
    const lastVisitedSpaceId = request.cookies.get("current-space-id")?.value;

    // Determine the appropriate space for redirect
    const redirectSpaceId = await getRedirectSpaceForUser(userId, lastVisitedSpaceId);

    if (!redirectSpaceId) {
      logger.error(`No space available for user ${userId}`);
      // Redirect to home page anyway - the space selector will handle the case
      return NextResponse.redirect(new URL("/", request.url));
    }

    logger.info(`Setting space cookie to ${redirectSpaceId} for user ${userId}`);

    // Create response with redirect
    const response = NextResponse.redirect(new URL("/", request.url));
    
    // Set the space cookie
    response.cookies.set("current-space-id", redirectSpaceId, {
      path: "/",
      httpOnly: false, // Allow client-side access for space selector
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    logger.error("Post-login redirect failed:", error);
    // Fallback to home page
    return NextResponse.redirect(new URL("/", request.url));
  }
}
