# CURRENT.md

## Current Goal
- 법령 데이터 무결성 확보 및 상시 검증 체계 구축 완료

## Completed
- 수산업법 시행령 ID 정상화 (`012248` -> `004019`) 및 실제 데이터 복원
- `update_laws.js` 내 응답 법령명 자동 교차 검증 가드 추가
- `validate_laws.js` 상시 무결성 검증 도구 추가 및 94개 전수 일치 검증 통과
- Git 커밋 및 origin/main 푸시 완료 (`f933b09`)
- Coding Partner 프로젝트 명령어 및 가이드 등록 (`.coding-partner/project/COMMON.md`)

## Verification
- `node validate_laws.js`: 94개 법령 100% 일치 (누락 0, 불일치 0)

## Remaining Work
- 대기 중 (새로운 요구사항 대기)

## Cautions
- `LAW_LIST` 항목 추가/수정 시 `validate_laws.js` 실행 필수
- UTF-8 인코딩 보존
- 사용자 승인 전 임의 커밋/푸시 금지
