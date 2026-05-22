@echo off
REM start.bat — double-clickable launcher.
REM Wraps start.ps1 with the right execution policy so users can simply
REM double-click this file from File Explorer.
REM
REM The `pause` at the bottom keeps the window open after the launcher
REM finishes — without it, Windows closes the cmd.exe host as soon as
REM the script reaches end-of-file (which can look like a crash).

setlocal
cd /d "%~dp0"
powershell -ExecutionPolicy ByPass -File "%~dp0start.ps1" %*
echo.
echo ===============================================================
echo  Launcher finished. The two service windows above are still
echo  running. You can close this window any time -- it does NOT
echo  stop the services.
echo ===============================================================
echo.
pause
endlocal
