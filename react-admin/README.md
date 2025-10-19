# React Admin - Better Auth Demo

This is a simple React application that demonstrates how to share authentication across multiple React apps using Better Auth.

## Overview

This demo app shows how you can:
- Create multiple React applications that share the same authentication backend
- Use Better Auth React client to connect to an existing Better Auth server
- Share sessions and cookies across different ports/domains
- Implement login, logout, and session management

## Architecture

- **Main App**: Runs on `http://localhost:3000` (the existing Better Chatbot app)
- **React Admin**: Runs on `http://localhost:3001` (this demo app)
- **Shared Backend**: Both apps use the same Better Auth backend at `/api/auth`

## Setup Instructions

### 1. Install Dependencies

```bash
cd react-admin
npm install
```

### 2. Fix PostCSS Configuration

The app includes a custom `postcss.config.mjs` file to avoid conflicts with the main app's Tailwind CSS configuration.

### 3. Start the Main App

Make sure the main Better Chatbot app is running:

```bash
# In the main project directory
npm run dev
```

The main app should be running on `http://localhost:3000`

### 4. Start the React Admin App

```bash
# In the react-admin directory
npm run dev
```

The React Admin app will start on `http://localhost:3001`

## Usage

1. **Open the React Admin app**: Navigate to `http://localhost:3001`
2. **Login**: Use the same email/password credentials you use for the main app
3. **View User Info**: Once logged in, you'll see your name, email, and user ID
4. **Test Session Sharing**: 
   - Login to the main app (`http://localhost:3000`)
   - Refresh the React Admin app - you should be automatically logged in
   - Logout from either app - you'll be logged out of both apps

## Key Features Demonstrated

### Authentication Sharing
- Both apps share the same authentication backend
- Sessions are shared via cookies with domain configuration
- Login/logout actions affect both applications

### Better Auth Integration
- Uses Better Auth React client (`better-auth/react`)
- Connects to existing Better Auth backend
- Handles session management automatically

### CORS Configuration
- Main app configured to allow requests from `localhost:3001`
- Cookies configured for subdomain sharing (`.localhost` in development)

## Technical Implementation

### Better Auth Client Configuration

```typescript
// auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000/api/auth",
});
```

### Main App Configuration

The main app was updated to support cross-app authentication:

1. **Cookie Domain Configuration** (`src/lib/auth/auth-instance.ts`):
   ```typescript
   cookieOptions: {
     domain: process.env.NODE_ENV === "production" ? ".example.com" : ".localhost",
     sameSite: "lax",
     secure: process.env.NODE_ENV === "production",
   }
   ```

2. **CORS Configuration** (`src/middleware.ts`):
   ```typescript
   const ALLOWED_ORIGINS = ["http://localhost:8081", "http://localhost:3001"];
   ```

## File Structure

```
react-admin/
├── package.json          # Dependencies and scripts
├── vite.config.ts        # Vite configuration (port 3001)
├── tsconfig.json         # TypeScript configuration
├── index.html            # HTML entry point
└── src/
    ├── main.tsx          # React entry point
    ├── App.tsx           # Main application component
    ├── auth-client.ts    # Better Auth client configuration
    └── vite-env.d.ts     # Vite type definitions
```

## Production Considerations

For production deployment:

1. **Update Cookie Domain**: Change `.localhost` to your actual domain (e.g., `.example.com`)
2. **Update CORS Origins**: Add your production domains to the allowed origins
3. **HTTPS**: Ensure both apps use HTTPS in production
4. **Environment Variables**: Configure proper environment variables for production

## Troubleshooting

### Common Issues

1. **PostCSS Configuration Error**: If you see "Invalid PostCSS Plugin" errors, make sure you're running the app from the `react-admin` directory and that the `postcss.config.mjs` file exists.

2. **CORS Errors**: Make sure the main app's CORS configuration includes `http://localhost:3001`

3. **Cookie Issues**: Verify cookie domain configuration allows subdomain sharing

4. **Session Not Shared**: Check that both apps are using the same authentication backend

5. **Login Fails**: Ensure the main app is running and accessible at `http://localhost:3000`

### Debug Steps

1. Check browser developer tools for network errors
2. Verify cookies are being set with the correct domain
3. Check console for Better Auth client errors
4. Ensure the main app's `/api/auth` endpoints are accessible

## Next Steps

This demo can be extended to:
- Add more authentication methods (social login)
- Implement role-based access control
- Add more complex UI components
- Deploy to production with proper domain configuration
