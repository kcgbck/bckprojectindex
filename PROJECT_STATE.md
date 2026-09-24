# PROJECT_STATE.md

## Current HEAD
- `76e4c88` (origin/main)
- Staged/Unstaged Changes: update_laws.js, .coding-partner/project/COMMON.md, PROJECT_STATE.md, docs/partner/CURRENT.md

## Recently Completed
- [x] 원격 저장소(`origin/main`)의 최신 커밋 로컬 동기화 및 7개 신규 법령 추가 커밋/푸시 완료 (`76e4c88`)
- [x] 경찰관 직무집행법 관련 2종 법령 수집 목록(`LAW_LIST`) 추가 (no. 102~103, 총 103개 법령으로 확대)
  - 경찰관 직무집행법 (000985)
  - 경찰관 직무집행법 시행령 (002199)
- [x] 국가법령정보센터 공식 법령ID(000985, 002199) 전수 검증 및 표준 등록 완료
- [x] 스크립트 문법 검사(`node -c update_laws.js`) 정상 통과
- [x] 코딩파트너 프로젝트 명령어 및 상태 문서 갱신

## Verified
- `node -c update_laws.js`: 문법 검사 정상 통과
- `node validate_laws.js`: 총 103개 대상 인식 및 신규 9건 정상 식별 완료

## Broken / Known Issues
- 없음

## Next Candidate Task
- GitHub Actions 워크플로(스케줄 또는 수동 실행)를 통한 신규 법령 실데이터 수집 완료 확인
- 수집 완료 후 `node validate_laws.js` 103개 100% 무결성 검증

## Do Not Do
- 단일 25MB JSON 덤프 방식으로 롤백하지 않기
- API OC 값을 하드코딩된 값으로 복구하지 않기 (환경변수 LAW_API_KEY 유지)
- 법령 ID 등록 시 실제 반환 법령명 검증 없이 임의 추가하지 않기
