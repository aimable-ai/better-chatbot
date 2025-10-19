# Better Chatbot Admin Panel

A simple HTML/vanilla JavaScript admin interface for managing all API endpoints in the Better Chatbot application.

## Features

- **CRUD Operations**: Create, Read, Update, Delete operations for all API endpoints
- **Authentication**: Uses the same cookie-based authentication as the main application
- **Real-time Responses**: See API responses in real-time with formatted JSON
- **Organized Interface**: Endpoints grouped by functionality (Users, Agents, Workflows, etc.)
- **CORS-Free**: Served on port 8081 to avoid CORS issues

## Setup

1. **Start your Next.js application** (usually on port 3000):
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

2. **Start the admin panel server**:
   
   **On macOS/Linux:**
   ```bash
   ./start-server.sh
   ```
   
   **On Windows:**
   ```cmd
   start-server.bat
   ```
   
   **Or manually:**
   ```bash
   cd admin
   python3 -m http.server 8081
   ```

3. **Open the admin panel**:
   Navigate to [http://localhost:8081](http://localhost:8081)

## Authentication

The admin panel uses the same authentication system as the main application. You need to:

1. First log in to the main Better Chatbot application
2. Then open the admin panel - it will automatically use your existing session

## Available Endpoints

### Quick Actions
- Test Authentication
- Get All Users
- Get All Agents  
- Get All Workflows

### User Management (`/api/user`)
- GET `/user/details` - Get current user details
- GET `/user/details/[id]` - Get specific user details
- POST `/user` - Create new user
- PATCH `/user/details/[id]` - Update user
- DELETE `/user/details/[id]` - Delete user

### Agent Management (`/api/agent`)
- GET `/agent` - Get agents (with query parameters)
- GET `/agent/[id]` - Get specific agent
- POST `/agent` - Create new agent
- PATCH `/agent/[id]` - Update agent
- DELETE `/agent/[id]` - Delete agent

### Workflow Management (`/api/workflow`)
- GET `/workflow` - Get all workflows
- GET `/workflow/[id]` - Get specific workflow
- POST `/workflow` - Create new workflow
- PATCH `/workflow/[id]` - Update workflow
- DELETE `/workflow/[id]` - Delete workflow

### MCP Management (`/api/mcp`)
- GET `/mcp/list` - Get MCP server list
- GET `/mcp/[id]` - Get specific MCP server
- POST `/mcp` - Create new MCP server
- PATCH `/mcp/[id]` - Update MCP server
- DELETE `/mcp/[id]` - Delete MCP server

### Spaces Management (`/api/spaces`)
- GET `/spaces` - Get all spaces
- GET `/spaces/[id]` - Get specific space
- POST `/spaces` - Create new space
- PATCH `/spaces/[id]` - Update space
- DELETE `/spaces/[id]` - Delete space

### Chat Management (`/api/chat`)
- GET `/chat/models` - Get available chat models
- POST `/chat` - Send chat message
- GET `/chat/title` - Get chat title

### Archive Management (`/api/archive`)
- GET `/archive` - Get all archives
- GET `/archive/[id]` - Get specific archive
- GET `/archive/[id]/items` - Get archive items
- GET `/archive/[id]/items/[itemId]` - Get specific archive item

### Thread Management (`/api/thread`)
- GET `/thread` - Get all threads

### Bookmark Management (`/api/bookmark`)
- POST `/bookmark` - Create bookmark
- DELETE `/bookmark` - Delete bookmark

## Usage Tips

1. **JSON Format**: When entering data, use valid JSON format in the text areas
2. **Query Parameters**: For GET requests with parameters, use URL-encoded format (e.g., `type=assistant&limit=10`)
3. **Authentication**: Make sure you're logged in to the main app first
4. **Error Handling**: Check the response area for detailed error messages
5. **Status Codes**: Green status codes indicate success, red indicates errors

## Troubleshooting

### CORS Issues
If you encounter CORS issues, make sure you're accessing the admin panel through the Python server on port 8081, not directly opening the HTML file.

### Authentication Issues
If authentication fails:
1. Make sure you're logged in to the main application first
2. Check that your Next.js app is running on the expected port (default: 3000)
3. Verify that cookies are being sent (check browser dev tools)

### API Connection Issues
If API calls fail:
1. Verify your Next.js application is running
2. Check the base URL in `admin.js` (default: `http://localhost:3000/api`)
3. Check browser console for detailed error messages

## File Structure

```
admin/
├── index.html          # Main admin interface
├── admin.js           # JavaScript functionality
├── start-server.sh    # macOS/Linux server script
├── start-server.bat   # Windows server script
└── README.md          # This file
```

