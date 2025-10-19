#!/bin/bash

# Start Python HTTP server on port 8081 to serve the admin panel
# This avoids CORS issues when accessing the Next.js API from the admin panel

echo "Starting Python HTTP server on port 8081..."
echo "Admin panel will be available at: http://localhost:8081"
echo "Make sure your Next.js app is running on port 3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Change to the admin directory
cd "$(dirname "$0")"

# Start Python HTTP server
python3 -m http.server 8081

