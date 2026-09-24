# PROJECT_STATE.md

## Current HEAD
- `143b9b2` (origin/main)
- Staged/Unstaged Changes: update_laws.js, validate_laws.js, .coding-partner/project/COMMON.md, PROJECT_STATE.md, docs/partner/CURRENT.md

## Recently Completed
- [x] 원격 저장소(`origin/main`)의 GitHub Actions 자동 수집 커밋(`143b9b2`) 로컬 동기화 (경찰관 직무집행법 2종 실데이터 수집 반영으로 103개 일치 완료)
- [x] 해양사고조사심판법 3단(47, 5551, 8663), 연안사고예방법 3단(12049, 12134, 12137) 등 법률 6종 추가
- [x] 각 해양경찰서 출입통제구역 지정 고시/공고 3종(동해, 보령, 인천) 추가 (`target=admrul`)
- [x] 각 해양경찰서 수상레저활동 금지구역 지정 고시 14종(강릉, 군산, 동해, 목포, 보령, 부산, 부안, 사천, 서귀포, 속초, 여수, 완도, 울산, 인천) 추가 (`target=admrul`)
- [x] 연안 시·도 비어업인 수산자원 포획·채취 관리 기준 조례 1종(강원특별자치도) 추가 (`target=ordin`, MST=1959885)
- [x] `update_laws.js` 및 `validate_laws.js`의 자치법규(OrdinService, ordin) 응답 파싱 및 정규화 체계 확장
- [x] 전체 관리 법령 규모 127개로 확대 및 교차 무결성 검증 체계 정립

## Verified
- `node -c update_laws.js`: 문법 검사 정상 통과
- `node -c validate_laws.js`: 문법 검사 정상 통과
- `node validate_laws.js`: 총 127개 대상 인식 및 기존 103건 100% 일치 확인 (신규 24건 수집 대기 정상 식별)

## Broken / Known Issues
- 없음

## Next Candidate Task
- GitHub Actions 워크플로(스케줄 또는 수동 실행)를 통한 신규 24개 법령 실데이터 수집 완료 확인
- 수집 완료 후 `node validate_laws.js` 127개 100% 무결성 검증

## Do Not Do
- 단일 25MB JSON 덤프 방식으로 롤백하지 않기
- API OC 값을 하드코딩된 값으로 복구하지 않기 (환경변수 LAW_API_KEY 유지)
- 법령 ID 등록 시 실제 반환 법령명 검증 없이 임의 추가하지 않기
