# PROJECT_STATE.md

## Current HEAD
- `230a6d831e51dc3e6c6902326583034762fc80f5` (origin/main)
- Staged/Unstaged Changes: 없음 (클린 상태)

## Recently Completed
- [x] 통합 방식(laws_data.json) 저장 로직 부활 (`update_laws.js` 수정)
- [x] 개별 법령당 `.txt` 파일 분할 저장과 통합 `.json` 저장 방식 동시 지원 확인

## Verified
- 원격 저장소 푸시 정상 완료 및 충돌 해결

## Broken / Known Issues
- 없음

## Next Candidate Task
- 대기 중 (새로운 요구사항 대기)

## Do Not Do
- 단일 25MB JSON 덤프 방식으로 롤백하지 않기
- API OC 값을 하드코딩된 'bck'로 복구하지 않기
