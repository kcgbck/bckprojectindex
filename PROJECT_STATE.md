# PROJECT_STATE.md

## Current HEAD
- `9384518` (origin/main)
- Staged/Unstaged Changes: update_laws.js, .coding-partner/project/COMMON.md, PROJECT_STATE.md, docs/partner/CURRENT.md

## Recently Completed
- [x] 원격 저장소(`origin/main`)의 GitHub Actions 자동 수집 커밋(`9384518`) 로컬 동기화 (기존 130개 법령 실데이터 수집 반영으로 130개 100% 일치 확인 완료)
- [x] 선박법 3단 수집 목록(`LAW_LIST`) 추가 (no. 131~133, 총 133개 법령으로 확대):
  * 선박법 (`000068`)
  * 선박법 시행령 (`003904`)
  * 선박법 시행규칙 (`007449`)
- [x] 국가법령정보센터 공식 법령ID(000068, 003904, 007449) 대조 및 표준 등록 완료
- [x] 코딩파트너 프로젝트 가이드(133개 법령) 및 상태 문서 최신화

## Verified
- `node -c update_laws.js`: 문법 검사 정상 통과
- `node -c validate_laws.js`: 문법 검사 정상 통과
- `node validate_laws.js`: 총 133개 대상 인식 및 기존 130건 100% 일치 확인 (신규 3건 수집 대기 정상 식별)

## Broken / Known Issues
- 없음

## Next Candidate Task
- GitHub Actions 워크플로(스케줄 또는 수동 실행)를 통한 신규 3개 법령 실데이터 수집 완료 확인
- 수집 완료 후 `node validate_laws.js` 133개 100% 무결성 검증

## Do Not Do
- 단일 25MB JSON 덤프 방식으로 롤백하지 않기
- API OC 값을 하드코딩된 값으로 복구하지 않기 (환경변수 LAW_API_KEY 유지)
- 법령 ID 등록 시 실제 반환 법령명 검증 없이 임의 추가하지 않기
