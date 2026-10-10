# CURRENT.md

## Current Goal
- 해양경찰 소관 34개 법령 추가 등록 및 전체 167개 관리 체계 확립

## Completed
- `C:\Users\YECHAN\workspace\서브\API-법령.xls` 전수 분석을 통해 소관부처 해양경찰(단독 및 공동 소관 56개) 중 기존 등록분(22개) 제외한 34개 신규 법령 식별 완료
- `update_laws.js` 내 신규 34종(no. 134~167) 추가 등록 완료 (총 167개)
- 국가법령정보센터 공식 법령ID 대조 및 중복 전수 검증 완료
- 코딩파트너 프로젝트 가이드(167개 법령) 및 상태 문서 최신화

## Verification
- `node -c update_laws.js`: 문법 검사 통과
- `node -c validate_laws.js`: 문법 검사 통과
- `node validate_laws.js`: 167개 대상 정확히 인식 (법률 41, 시행령 38, 시행규칙 37, 행정규칙 20, 자치법규 1, 기타규정 30)
  * 기존 130건 100% 정상 일치 확인, 신규 37건(선박법 3건 + 해양경찰 소관 34건) 수집 대기 정상 식별

## Remaining Work
- GitHub Actions 실행 후 신규 법령 실데이터 수집 완료 확인
- 수집 완료 후 167개 전수 무결성 검증

## Cautions
- `LAW_LIST` 항목 추가/수정 시 `validate_laws.js` 실행 필수
- 고시(`admrul`) 및 조례(`ordin`) API 호출 양식 차이 준수
- UTF-8 인코딩 보존
