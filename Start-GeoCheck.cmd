@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
 echo Install Python dependencies first. See README.md.
 pause
 exit /b 1
)
if not exist "frontend\dist\index.html" (
 echo Build the frontend first. See README.md.
 pause
 exit /b 1
)
echo GeoCheck AI: http://127.0.0.1:8000
".venv\Scripts\python.exe" -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
if errorlevel 1 pause

