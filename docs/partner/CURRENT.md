# CURRENT.md

## Current Goal
- 해양사고조사심판법, 연안사고예방법, 출입통제·수상레저활동금지 고시, 비어업인 수산자원 포획·채취 조례 등 24종 추가 등록 및 전체 127개 관리 체계 확립

## Completed
- 국가법령정보센터 Open API 규격별(`target=eflaw`, `target=admrul`, `target=ordin`) 파싱 및 자치법규(조례) 지원 로직 구현
- `update_laws.js` 및 `validate_laws.js` 자치법규(OrdinService, ordin) 응답 처리 및 정규화/분류 체계 확장
- `update_laws.js` 내 신규 24종(no. 104~127) 추가 등록 완료 (총 127개):
  * 법률 6종: 해양사고의 조사 및 심판에 관한 법률 3단, 연안사고 예방에 관한 법률 3단
  * 해양경찰서 출입통제구역 지정 고시/공고 3종: 동해, 보령, 인천
  * 해양경찰서 수상레저활동 금지구역 지정 고시 14종: 강릉, 군산, 동해, 목포, 보령, 부산, 부안, 사천, 서귀포, 속초, 여수, 완도, 울산, 인천
  * 자치법규 1종: 강원특별자치도 비어업인의 수산자원 포획·채취 관리 기준에 관한 조례
- 코딩파트너 프로젝트 가이드(127개 법령) 및 상태 문서 최신화

## Verification
- `node -c update_laws.js`: 문법 검사 통과
- `node -c validate_laws.js`: 문법 검사 통과
- `node validate_laws.js`: 127개 대상 정확히 인식 (법률 30, 시행령 30, 시행규칙 29, 행정규칙 20, 자치법규 1, 기타규정 17)
  * 기존 103건 100% 정상 일치 확인, 신규 24건 수집 대기 정상 식별

## Remaining Work
- GitHub Actions 실행 후 신규 법령 실데이터 수집 완료 확인
- 수집 완료 후 127개 전수 무결성 검증

## Cautions
- `LAW_LIST` 항목 추가/수정 시 `validate_laws.js` 실행 필수
- 고시(`admrul`) 및 조례(`ordin`) API 호출 양식 차이 준수
- UTF-8 인코딩 보존
