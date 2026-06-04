Set WshShell = CreateObject("WScript.Shell")
' 0: 창 숨김, False: 백그라운드에서 비동기 실행
WshShell.Run chr(34) & "run.bat" & chr(34), 0, False