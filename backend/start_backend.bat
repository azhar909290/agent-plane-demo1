@echo off
REM -X utf8 forces UTF-8 for every open() -> fixes the cp1252 UnicodeDecodeError
python -X utf8 app.py
