import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");
  const ALLOWED_ORIGINS = [
    "http://localhost:8081",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
  ];

  // Skip middleware for auth routes but add CORS headers
  if (pathname.startsWith("/api/auth")) {
    // Handle preflight requests for auth routes
    if (request.method === "OPTIONS") {
      const preflight = new Response(null, { status: 204 });
      preflight.headers.set(
        "Access-Control-Allow-Origin",
        origin && ALLOWED_ORIGINS.includes(origin) ? origin : "",
      );
      preflight.headers.set("Vary", "Origin");
      preflight.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      );
      preflight.headers.set(
        "Access-Control-Allow-Headers",
        request.headers.get("access-control-request-headers") ||
          "content-type, authorization",
      );
      preflight.headers.set("Access-Control-Allow-Credentials", "true");
      preflight.headers.set("Access-Control-Max-Age", "86400");
      return preflight;
    }

    const response = NextResponse.next();
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Vary", "Origin");
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }
    return response;
  }

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  if (pathname === "/admin") {
    return NextResponse.redirect(new URL("/admin/users", request.url));
  }

  // CORS handling for API routes (including preflight)
  const isApiRoute = pathname.startsWith("/api");
  if (isApiRoute) {
    // Handle preflight
    if (request.method === "OPTIONS") {
      const preflight = new Response(null, { status: 204 });
      preflight.headers.set(
        "Access-Control-Allow-Origin",
        origin && ALLOWED_ORIGINS.includes(origin) ? origin : "",
      );
      preflight.headers.set("Vary", "Origin");
      preflight.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      );
      preflight.headers.set(
        "Access-Control-Allow-Headers",
        request.headers.get("access-control-request-headers") ||
          "content-type, authorization",
      );
      preflight.headers.set("Access-Control-Allow-Credentials", "true");
      preflight.headers.set("Access-Control-Max-Age", "86400");
      return preflight;
    }
  }

  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  const response = NextResponse.next();

  // Attach CORS headers to API responses
  if (isApiRoute) {
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Vary", "Origin");
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|sign-in|sign-up|logo-white.png|logo.png|logo.webp|logo-dark.png).*)",
  ],
};
