# PROJECT_STATE.md

## Current HEAD
- `f933b09` (origin/main)
- Staged/Unstaged Changes: 없음 (클린 상태)

## Recently Completed
- [x] 수산업법 시행령 API Law ID 오류 수정 (`012248` -> `004019`)
- [x] 수집 루프 내 실제 응답 법령명 자동 교차 검증 가드 추가 (`update_laws.js`)
- [x] 법령 체계 자동 분류(법률, 시행령, 시행규칙, 행정규칙 등) 메타데이터 태깅
- [x] 수산업법 시행령 실제 데이터 복원 (`laws_txt/수산업법 시행령.txt` 및 `laws_data.json`)
- [x] 상시 무결성 검증 스크립트(`validate_laws.js`) 신규 구현 및 94개 전수 검증 통과 (100% 일치)
- [x] 원격 저장소(`origin/main`) 커밋 및 푸시 완료 (`f933b09`)
- [x] Coding Partner 프로젝트 명령어 및 지침(`.coding-partner/project/COMMON.md`) 등록

## Verified
- `node validate_laws.js`: 94개 법령 대상 laws_data.json 및 laws_txt/*.txt 무결성 100% 통과 (Exit Code 0)
- `node -c update_laws.js`: 문법 검사 정상

## Broken / Known Issues
- 없음

## Next Candidate Task
- 대기 중 (새로운 요구사항 대기)
- 필요 시 GitHub Actions 워크플로에 `validate_laws.js` 검증 스텝 연계

## Do Not Do
- 단일 25MB JSON 덤프 방식으로 롤백하지 않기
- API OC 값을 하드코딩된 'bck'로 복구하지 않기
- 법령 ID 등록 시 실제 반환 법령명 검증 없이 임의 추가하지 않기
