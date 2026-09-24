# Project Instructions

이 문서는 `lawproject` 저장소의 고유 지침 및 주요 명령어 안내입니다.

## 1. 프로젝트 개요
- 해양경찰 및 관련 업무에 필요한 127개 주요 법령/행정규칙/자치법규(조례) 데이터를 국가법령정보센터 Open API를 통해 자동 수집·관리합니다.
- 수집 결과는 개별 텍스트 파일(`laws_txt/[법령명].txt`)과 통합 JSON 파일(`laws_data.json`)로 동시 저장·제공됩니다.
- GitHub Actions(`update.yml`)를 통해 매일 밤 11시(KST) 자동 실행되며, 수동(`workflow_dispatch`) 실행도 지원합니다.

## 2. 주요 프로젝트 명령어 (Commands)

### 2.1 법령 데이터 무결성 검증 (오프라인 검증)
- API 호출 없이 `LAW_LIST` ↔ `laws_data.json` ↔ `laws_txt/*.txt` 3자 교차 무결성을 전수 검증합니다.
```powershell
node validate_laws.js
```

### 2.2 법령 데이터 갱신 및 수집 (온라인 수집)
- 국가법령정보센터 API로부터 최신 법령 데이터를 수집하고 파일들을 갱신합니다.
- 수집 시 응답 법령명과 설정명의 일치 여부를 자동 검증합니다.
```powershell
$env:LAW_API_KEY="[API_KEY]"
node update_laws.js
```

### 2.3 스크립트 문법 검사
```powershell
node -c update_laws.js
node -c validate_laws.js
```

### 2.4 Git 상태 점검
```powershell
git status --porcelain
git log -n 5 --oneline
```

## 3. 핵심 규칙 및 주의사항
- **법령 ID 변경 시 주의**: `update_laws.js`의 `LAW_LIST`에 정의된 API URL의 Law ID 및 타겟 유형(`eflaw`, `admrul`, `ordin` 등)이 정확한지 `validate_laws.js`로 항상 검증합니다.
- **인코딩 보존**: 모든 법령 파일 및 스크립트는 UTF-8 인코딩을 엄격히 유지합니다.
- **Git 안전 정책**: 사용자 명시 승인 전 임의의 commit 및 push는 절대 수행하지 않습니다.
- **비용 정책**: 유료 종량제 API는 일체 사용하지 않으며 국가법령정보센터 무료 공공 API만 사용합니다.
