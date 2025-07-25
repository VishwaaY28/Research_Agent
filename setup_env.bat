@echo off
REM === Setup Python Virtual Environment and Install Dependencies ===

REM 1. Create virtual environment if it doesn't exist
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

REM 2. Activate the virtual environment
call venv\Scripts\activate

REM 3. Upgrade pip
python -m pip install --upgrade pip

REM 4. Install backend dependencies
if exist apps\server\requirements.txt (
    echo Installing backend dependencies...
    pip install -r apps\server\requirements.txt
)

REM 5. Install frontend dependencies
if exist apps\client\package.json (
    echo Installing frontend dependencies...
    cd apps\client
    call npm install
    cd ../..
)

REM 6. Set environment variables (example, adjust as needed)
set "PYTHONPATH=%cd%\apps\server\src"
set "ENV=development"

echo.
echo === Environment setup complete! ===
echo.
echo To activate your Python venv in the future, run:
echo     venv\Scripts\activate
echo.
echo To start the backend:
echo     cd apps\server
echo     uvicorn src.main:app --reload
echo.
echo To start the frontend:
echo     cd apps\client
echo     npm run dev
echo.

pause
