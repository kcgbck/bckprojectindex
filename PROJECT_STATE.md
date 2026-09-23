# PROJECT_STATE.md

## Current HEAD
- `02f1132` (동기화 및 7개 신규 법령 추가 진행 중)
- Staged/Unstaged Changes: update_laws.js, .coding-partner/project/COMMON.md, PROJECT_STATE.md, docs/partner/CURRENT.md

## Recently Completed
- [x] 원격 저장소(`origin/main`)의 최신 16개 커밋(최신 법령 갱신 및 보안 강화 사항) 로컬 동기화(rebase) 완료
- [x] 산업안전보건 관련 4종 및 출입국관리 관련 3종(총 7종) 법령 수집 목록(`LAW_LIST`) 추가 (no. 95~101, 총 101개 법령으로 확대)
  - 산업안전보건기준에 관한 규칙 (007363)
  - 산업안전보건법 (001766)
  - 산업안전보건법 시행령 (003786)
  - 산업안전보건법 시행규칙 (007364)
  - 출입국관리법 (001707)
  - 출입국관리법 시행령 (005256)
  - 출입국관리법 시행규칙 (008494)
- [x] 국가법령정보센터 공식 법령ID 전수 검증 및 표준 등록 완료
- [x] 스크립트 문법 검사(`node -c update_laws.js`) 정상 통과
- [x] 코딩파트너 프로젝트 명령어 및 상태 문서 갱신

## Verified
- `node -c update_laws.js`: 문법 검사 정상 통과
- `node validate_laws.js`: 총 101개 대상 인식 및 신규 7건 정상 식별 완료

## Broken / Known Issues
- 없음

## Next Candidate Task
- GitHub Actions 워크플로(스케줄 또는 수동 실행)를 통한 신규 7개 법령 실데이터 수집 완료 확인
- 수집 완료 후 `node validate_laws.js` 101개 100% 무결성 검증

## Do Not Do
- 단일 25MB JSON 덤프 방식으로 롤백하지 않기
- API OC 값을 하드코딩된 값으로 복구하지 않기 (환경변수 LAW_API_KEY 유지)
- 법령 ID 등록 시 실제 반환 법령명 검증 없이 임의 추가하지 않기
