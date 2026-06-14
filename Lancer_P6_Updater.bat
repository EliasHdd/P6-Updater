@echo off
rem P6 Weekly Progress Updater - lance le serveur local et ouvre le navigateur.
cd /d "%~dp0"
python -c "import flask" 2>nul || (
    echo Installation de Flask...
    pip install --user flask
)
python -c "import openpyxl" 2>nul || (
    echo Installation d'openpyxl...
    pip install --user openpyxl
)
python server.py
pause
