# PROJECT_STATE.md

## Current HEAD
- `9ee943a22c2eb311b2e3808da28ad8073a555572`
- Staged/Unstaged Changes: `update_laws.js`, `last_run.txt`, `laws_txt/` (new files)

## Recently Completed
- **법령 데이터 개별 저장 분리 (2026-07-24)**
  - 기존 대용량 단일 JSON 저장 방식을 개별 txt 파일 저장 방식으로 변경
  - `update_laws.js`에 `laws_txt` 폴더 자동 생성 및 저장 로직 추가
  - 코드 상단에 `API_KEY` 상수를 선언하여 하드코딩된 'OC=bck' 문제를 해결 (사용자가 자신의 OC 값을 쉽게 등록 가능하도록 개선)

## Verified
- `node update_laws.js` 스크립트 정상 실행
- `laws_txt` 내부에 각 87개 법령별 `.txt` 파일 생성 확인
- 실제 법령 텍스트 내용 다운로드 확인 (`수상레저안전법.txt` 등)

## Broken / Known Issues
- 없음

## Next Candidate Task
- 로컬 변경 사항(`.txt` 개별 파일 및 수정된 코드) GitHub 커밋 및 푸시
- `run.bat` 자동화 스크립트 점검

## Do Not Do
- 단일 25MB JSON 덤프 방식으로 롤백하지 않기
- API OC 값을 하드코딩된 'bck'로 복구하지 않기

## Notes
- 개별 법령 본문은 `laws_txt` 폴더에 `.txt` 확장자로 저장되지만, 내용은 여전히 API 응답 원본인 JSON 구조(pretty-print)로 저장되어 있음. 향후 완전한 일반 텍스트만 추출하려면 추가 파싱 스크립트가 필요할 수 있음.
