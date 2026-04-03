@echo off
chcp 65001 >nul
echo ====================================
echo Claude Code Best 终端服务器
echo ====================================
echo.
echo Starting PTY server on port 3001...
echo Then starting Next.js on port 3000
echo.
echo Terminal URL: http://localhost:3000/terminal
echo WebSocket: ws://localhost:3001
echo.
echo Press Ctrl+C to stop both servers
echo ====================================
echo.

cd /d %~dp0

start "PTY Server" cmd /k "bun run server/terminal-server.ts"

timeout /t 3 /nobreak >nul

start "Next.js" cmd /k "bun run dev"

echo Servers started! Open http://localhost:3000/terminal
pause
