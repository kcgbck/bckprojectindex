# CURRENT.md

## Current Goal
- 선박법 3단(68, 3904, 7449) 추가 등록 및 전체 133개 관리 체계 확립

## Completed
- `update_laws.js` 내 신규 선박법 3종(no. 131~133) 추가 등록 완료 (총 133개):
  * 선박법 (`000068`)
  * 선박법 시행령 (`003904`)
  * 선박법 시행규칙 (`007449`)
- 국가법령정보센터 공식 법령ID(000068, 003904, 007449) 대조 및 등록 완료
- 코딩파트너 프로젝트 가이드(133개 법령) 및 상태 문서 최신화

## Verification
- `node -c update_laws.js`: 문법 검사 통과
- `node -c validate_laws.js`: 문법 검사 통과
- `node validate_laws.js`: 133개 대상 정확히 인식 (법률 32, 시행령 32, 시행규칙 31, 행정규칙 20, 자치법규 1, 기타규정 17)
  * 기존 130건 100% 정상 일치 확인, 신규 3건 수집 대기 정상 식별

## Remaining Work
- GitHub Actions 실행 후 신규 법령 실데이터 수집 완료 확인
- 수집 완료 후 133개 전수 무결성 검증

## Cautions
- `LAW_LIST` 항목 추가/수정 시 `validate_laws.js` 실행 필수
- 고시(`admrul`) 및 조례(`ordin`) API 호출 양식 차이 준수
- UTF-8 인코딩 보존
