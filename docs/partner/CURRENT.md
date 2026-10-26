# CURRENT.md

## Current Goal
- rclone 기반 Google Drive 자동 동기화 및 NotebookLM용 통합 법령집 구축 (파일당 최대 6.5 MB 분할 적용)

## Completed
- `build_consolidated_txt.js` 갱신: NotebookLM 안정성을 위해 파일당 최대 크기 6.5 MB 제한 로직 적용 (총 10개 분할 파일로 최적화)
- Google Drive `lawproject_txt/laws_consolidated/`에 10개 분할 파일 동기화 완료
- GitHub Actions 워크플로우 1회차 성공 확인 (`4e22574`, 167개 법령 전수 동기화 검증 완료)

## Verification
- `node -c build_consolidated_txt.js`: 문법 검사 통과
- `node build_consolidated_txt.js`: 167개 전체 법령 10개 분할 파일 생성 (모든 파일 6.5 MB 이하 보장)
  * `01_법률_통합본_01.txt` (6.17 MB)
  * `01_법률_통합본_02.txt` (0.57 MB)
  * `02_시행령_통합본_01.txt` (6.36 MB)
  * `02_시행령_통합본_02.txt` (1.53 MB)
  * `03_시행규칙_통합본_01.txt` (5.52 MB)
  * `03_시행규칙_통합본_02.txt` (6.26 MB)
  * `03_시행규칙_통합본_03.txt` (6.17 MB)
  * `03_시행규칙_통합본_04.txt` (5.92 MB)
  * `04_행정규칙_고시_훈령_통합본.txt` (0.17 MB)
  * `05_기타규정_자치법규_통합본.txt` (4.61 MB)
- `rclone sync`: Google Drive에 10개 분할본 정상 업로드 및 이전 통합본 자동 삭제 완료

## Remaining Work
- 사용자 NotebookLM에 10개 분할본 소스 등록 안내
- 매일 밤 11시 스케줄 자동 실행 유지

## Cautions
- 모든 파일 6.5 MB 이하 엄격 준수 (NotebookLM 단일 소스 한도 대비 극대화)
