@echo off
REM Start Python HTTP server on port 8081 to serve the admin panel
REM This avoids CORS issues when accessing the Next.js API from the admin panel

echo Starting Python HTTP server on port 8081...
echo Admin panel will be available at: http://localhost:8081
echo Make sure your Next.js app is running on port 3000
echo.
echo Press Ctrl+C to stop the server
echo.

REM Change to the admin directory
cd /d "%~dp0"

REM Start Python HTTP server
python -m http.server 8081

