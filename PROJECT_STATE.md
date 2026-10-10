# PROJECT_STATE.md

## Current HEAD
- `2b42913` (origin/main)
- Staged/Unstaged Changes: update_laws.js, .coding-partner/project/COMMON.md, PROJECT_STATE.md, docs/partner/CURRENT.md

## Recently Completed
- [x] `C:\Users\YECHAN\workspace\서브\API-법령.xls` 전수 분석을 통해 소관부처 해양경찰 법령 56개 전수 확인
- [x] 기존 등록 22개 법령과의 중복 방지 및 신규 34개 법령 식별 완료
- [x] 해양경찰 소관 34개 법령 수집 목록(`LAW_LIST`) 추가 (no. 134~167, 총 167개 법령으로 확대)
- [x] 국가법령정보센터 공식 법령ID(014782, 001643 등 34종) 대조 및 표준 등록 완료
- [x] 코딩파트너 프로젝트 가이드(167개 법령) 및 상태 문서 최신화

## Verified
- `node -c update_laws.js`: 문법 검사 정상 통과
- `node -c validate_laws.js`: 문법 검사 정상 통과
- `node validate_laws.js`: 총 167개 대상 인식 및 기존 130건 100% 일치 확인 (신규 37건 수집 대기 정상 식별, 중복 0건)

## Broken / Known Issues
- 없음

## Next Candidate Task
- GitHub Actions 워크플로(스케줄 또는 수동 실행)를 통한 신규 37개 법령 실데이터 수집 완료 확인
- 수집 완료 후 `node validate_laws.js` 167개 100% 무결성 검증

## Do Not Do
- 단일 25MB JSON 덤프 방식으로 롤백하지 않기
- API OC 값을 하드코딩된 값으로 복구하지 않기 (환경변수 LAW_API_KEY 유지)
- 법령 ID 등록 시 실제 반환 법령명 검증 없이 임의 추가하지 않기
