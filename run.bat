@echo off
:: 작업 디렉토리를 이 파일이 있는 폴더로 고정
cd /d "%~dp0"

:: 1. 오늘의 날짜 구하기 (YYYY-MM-DD 형식)
for /f "tokens=1-3 delims=-/. " %%a in ('date /t') do (set mydate=%%a-%%b-%%c)

:: 2. 기존에 기록된 마지막 실행 날짜 읽기
set lastdate=none
if exist last_run.txt (
    set /p lastdate=<last_run.txt
)

:: 3. 오늘 이미 실행했다면 아무것도 하지 않고 즉시 종료 (중복 실행 방지)
if "%mydate%"=="%lastdate%" (
    exit /b
)

:: ==========================================
:: 4. [오늘 첫 실행인 경우] 실제 작업 수행
:: ==========================================

:: 파이썬 다운로드 스크립트 실행
python download.py

:: Git 명령어로 GitHub에 자동 업로드
git add .
git commit -m "국가법령 자동 업데이트 (로컬 수집: %mydate%)"
git push origin main

:: ==========================================
:: 5. 실행 완료 후 오늘 날짜를 텍스트 파일에 저장
:: ==========================================
echo %mydate%> last_run.txt

exit /b