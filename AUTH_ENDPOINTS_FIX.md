# Better Auth API Endpoints - Issue Resolution

## Problem
The React Admin app was experiencing 404 errors when trying to connect to Better Auth endpoints at `http://localhost:3001/api/auth`.

## Root Cause
The issue had multiple layers:

1. **Middleware Configuration**: The Next.js middleware was not properly excluding `/api/auth` routes from authentication checks
2. **Endpoint Naming**: Better Auth uses specific endpoint names (e.g., `/api/auth/get-session` instead of `/api/auth/session`)

## Solution

### 1. Middleware Fix
Updated `/Applications/XAMPP/xamppfiles/htdocs/aimable/better-chatbot/src/middleware.ts`:

- Added early return logic for `/api/auth` routes
- Added CORS headers for allowed origins (including `http://localhost:3001` for React Admin)
- Ensured auth routes are not redirected to `/sign-in`

Key code:
```typescript
// Skip middleware for auth routes but add CORS headers
if (pathname.startsWith("/api/auth")) {
  const response = NextResponse.next();
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }
  return response;
}
```

### 2. Better Auth Endpoint Names
Better Auth uses these endpoint names:
- **Session**: `/api/auth/get-session` (not `/api/auth/session`)
- **Sign In**: `/api/auth/sign-in/email` (POST)
- **Sign Out**: `/api/auth/sign-out` (POST)

The React Admin app uses `createAuthClient` from `"better-auth/react"`, which automatically uses the correct endpoint names.

### 3. Environment Configuration
Ensured these environment variables are set correctly:
- `BETTER_AUTH_SECRET`: Generated using `npx @better-auth/cli@latest secret`
- `BETTER_AUTH_URL`: Set to `http://localhost:3001`
- `POSTGRES_URL`: Set to correct database connection string

## Verification
All auth endpoints now return expected responses:
- ✅ `GET /api/auth/get-session` → 200 OK
- ✅ `POST /api/auth/sign-in/email` → 400 (requires credentials)
- ✅ `POST /api/auth/sign-out` → 400 (requires session)

## Files Modified
1. `/Applications/XAMPP/xamppfiles/htdocs/aimable/better-chatbot/src/middleware.ts`
2. `/Applications/XAMPP/xamppfiles/htdocs/aimable/better-chatbot/.env` (BETTER_AUTH_SECRET, BETTER_AUTH_URL)

## React Admin Configuration
The React Admin app is correctly configured:
- **Auth Client**: Uses `createAuthClient` from `"better-auth/react"`
- **Base URL**: Points to `http://localhost:3001/api/auth`
- **Port**: Runs on port 3001 (via Vite config)

The Better Auth client library handles the correct endpoint names automatically, so no changes are needed in the React Admin app.

## Next Steps
Start both servers:
1. **Main app**: `cd /Applications/XAMPP/xamppfiles/htdocs/aimable/better-chatbot && PORT=3001 pnpm dev`
2. **React Admin**: `cd /Applications/XAMPP/xamppfiles/htdocs/aimable/better-chatbot/react-admin && pnpm dev`

The React Admin app should now successfully connect to the Better Auth endpoints without CORS or 404 errors.

