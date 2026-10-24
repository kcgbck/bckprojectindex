# F09 업스트림 배치 발행 무결성 보정 (Upstream Batch Publication Remediation)

## 1. 개요 및 배경
기존 수집 스크립트(`update_laws.js`)는 각 법령을 수집할 때마다 `laws_txt/{법령명}.txt` 파일을 즉시 디스크에 기록하며, 성공률이 50% 이상일 경우 부분 수집된 데이터와 기존 데이터를 병합하여 `laws_data.json`에 저장합니다.
또한 GitHub Actions 워크플로(`.github/workflows/update.yml`)의 커밋 스텝이 `if: always()`로 설정되어 있어, 수집 과정에서 오류가 발생하거나 부분 성공에 그친 상태에서도 불완전한 텍스트 파일과 병합 데이터가 Git 저장소에 자동 커밋·푸시되는 결함이 존재했습니다.

본 보정 패치는 `update_laws.js`의 기존 ESM 구현을 바이트 단위로 변경 없이 보존하면서, **GitHub Actions 워크플로 경계에서 100% 완전 성공 배치가 검증된 경우에만 Git 커밋 및 발행을 허용하는 올 오어 너싱(All-or-Nothing) 사전 커밋 검증 가드**를 도입합니다.

---

## 2. 변경 파일 및 구성 요소

| 파일 경로 | 구분 | 역할 |
|---|---|---|
| `.github/workflows/update.yml` | 수정 | `run_update` 스텝에 검증기 실행 추가 및 커밋 스텝 조건 변경 (`if: success() && steps.run_update.outcome == 'success'`) |
| `validate_batch_publication.cjs` | 신규 | 오프라인 로컬 사전 커밋 배치 무결성 검증 가드 (CommonJS) |
| `test_batch_publication.cjs` | 신규 | 합성 픽스처 기반 단위/통합 테스트 하네스 (외부 호출 없음) |
| `README-remediation.md` | 신규 | 보정 설계, 불변식, 트레이드오프 및 실행 지침 문서 |

> **보존 원칙**: `update_laws.js`는 원본 그대로 보존되며, 실제 법령 API, 인증 정보, 운영 checkout 및 실데이터에 대한 임의 변경은 일절 수행하지 않습니다.

---

## 3. 핵심 아키텍처 및 불변식

### 3.1 워크플로 경계 게이트 (Workflow Publication Gate)
* **동일 스텝 순차 실행**: `steps.run_update` 내에서 `node update_laws.js` 직후 `node validate_batch_publication.cjs`를 실행합니다. GitHub Actions의 기본 bash `-e` 옵션에 따라 어느 하나라도 0이 아닌 코드로 종료되면 즉시 스텝이 실패합니다.
* **조건부 커밋**: 커밋 스텝 조건을 `if: success() && steps.run_update.outcome == 'success'`로 제한하여, 검증을 통과하지 못한 작업 트리의 변경 사항이 Git에 커밋되거나 원격으로 푸시되지 않도록 차단합니다.
* **삭제 추적 유지**: `git add laws_data.json laws_txt/ laws_fetch_failures.json` 구문을 그대로 유지하여, 이전 실행에서 남아있던 실패 보고서 파일이 성공 수집 시 정상 삭제(`fs.unlinkSync`)되었을 때 해당 삭제 상태가 Git에 올바르게 스테이징되도록 합니다.

### 3.2 검증 가드(`validate_batch_publication.cjs`) 불변식
1. **정수형 메타데이터 수치 검증**:
   * `attemptedCount`: 1 이상의 양의 정수.
   * `successCount`: `attemptedCount`와 정확히 일치하는 정수.
   * `failCount`: 정확히 `0`.
   * `successRate`: 정확히 `100`.
   * `fetchedCount`: `attemptedCount`와 일치.
   * `retainedPreviousCount`: 정확히 `0`.
   * `totalDataCount`: `attemptedCount`와 일치.
   * `abortedEarly`: `true`가 아닐 것 (`abortReason` 부재).
2. **과거 보존 소스(Retained Historical Sources) 정책**:
   * `retainedPreviousCount > 0`인 경우, 과거 실행에서 수집되었으나 금회 수집에서 제외된 소스가 집계본에 남아있음을 의미합니다.
   * 이러한 배치는 불완전한 상태로 간주되며, 임의로 데이터를 삭제하지 않고 **작업자의 수동 조정 및 확인을 위해 자동 발행을 차단**합니다.
3. **법령 ID 및 필드 유연성**:
   * 수집기(`update_laws.js`)에서 방출되는 실제 ID 형식(문자열 또는 숫자)을 있는 그대로 수용하며 임의의 형식 제약을 두지 않습니다.
4. **파일명 Sanitizer 및 안전성 검증**:
   * 수집기의 sanitize 로직(`replace(/[\\/:*?"<>|]/g, "")`)과 정확히 일치시킵니다.
   * 빈 문자열, `.`, `..`, Windows 예약 장치명(`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`), 끝자리 점/공백을 검출하여 차단합니다.
   * 서로 다른 법령명이 동일한 sanitize 파일명으로 충돌하는 경우를 차단합니다.
   * `path.resolve` 및 `path.relative`를 통해 `laws_txt` 디렉터리 외부로의 경로 탈출 시도를 원천 차단합니다.
5. **원천 데이터(raw_data) 심층 비교 (Deep Equality)**:
   * `laws_data.json`의 `item.raw_data`와 개별 `laws_txt/{safeName}.txt`의 JSON 파싱 객체를 값 기반(재귀적 deep equal)으로 비교합니다. 직렬화 공백이나 키 순서 차이로 인한 오탐 없이 데이터 일치성을 보장합니다.
6. **실패 보고서 검증**:
   * `laws_fetch_failures.json`이 존재할 경우 `failCount === 0` 및 빈 실패 목록이어야 하며, 결측/오류/양수 카운트 시 즉시 차단합니다.

---

## 4. 진단 아티팩트 및 이슈 생성 흐름
* **수집 실패 시**: `update_laws.js`가 비정상 종료하거나 실패 보고서를 남기면, `upload-artifact` (`if: failure()`) 스텝에 의해 진단 파일이 Actions 아티팩트로 보관되며, 이슈 생성 스텝 (`if: always()`)이 `laws_fetch_failures.json`을 읽어 GitHub 이슈를 정상 생성합니다.
* **검증 실패 시 (Validation-Only Failure)**: 수집 스크립트는 종료되었으나 검증기에서 TXT 불일치나 메타데이터 무결성 결함으로 실패한 경우, `laws_fetch_failures.json`이 존재하지 않거나 실패 카운트가 0일 수 있습니다. 이 경우 워크플로 실행 자체는 실패하여 Actions 로그에 상세 원인이 남지만, 이슈 생성 스텝은 잘못된 이슈 생성을 건너뜁니다 (로그가 1차 증거로 활용됨).

---

## 5. 트레이드오프 및 면책 조항
* **OS 파일시스템 트랜잭션 비주장**: 본 설계는 OS 레벨의 파일시스템 원자적 트랜잭션을 구현한 것이 아닙니다. 파일은 여전히 로컬 디스크에 점진적으로 기록되지만, 워크플로 커밋 단계에서 완결성을 검증함으로써 **저장소 발행(Publication) 레벨의 원자성**을 보장합니다.
* **완전성 우선 트레이드오프**: 수집 대상 중 단 1개의 법령이라도 API 장애 등으로 수집에 실패하면 전체 배치의 발행이 중단됩니다. 이는 부분적인 최신성보다 **전체 법령 데이터셋의 일관성 및 무결성**을 우선시한 의도된 설계입니다.

---

## 6. 테스트 하네스 (`test_batch_publication.cjs`)
임시 격리 디렉터리(`os.tmpdir()`) 기반으로 14가지 시나리오를 검증합니다:
1. 완전 유효한 100% 배치 (정상 통과)
2. 50% 이상 부분 성공 배치 (발행 차단)
3. 과거 완전 집계본 + 신규 실패 보고서 동시 존재 (차단)
4. 메타데이터 정수형/카운트 결측 및 이상치 (차단)
5. 법령명 중복 / 파일명 충돌 / 예약어 / 경로 탈출 (차단)
6. TXT 누락 및 raw_data 내용 불일치 (차단)
7. 조기 중단(abortedEarly) 감지 (차단)
8. 과거 소스 보존 건수 감지 (작업자 조정을 위해 발행 차단)
9. CLI 프로세스 실행 시 exit code 0 및 1 검증
10. `.github/workflows/update.yml` 텍스트 불변식 검증
11. 집계에 없는 orphan TXT 발행 차단
12. 실패 보고서의 잘못된 배열 타입 및 필수 배열 누락 차단
13. JSON 객체 키 순서 차이의 동등성 검증
14. 실제 commit 단계 shell을 모의 git으로 실행해 무변경·diff 오류·commit 오류·push 오류 구분

### 검증 실행 지침 (감독자용)
Gemini는 코드 작성만 수행했고, Codex 감독자가 Node22 격리 환경에서 아래 명령을 실행하여 14/14 통과를 확인했습니다. 실제 법령 API나 운영 배치는 호출하지 않았습니다. 원문: `../tests/upstream-final.log`. 재실행 명령:
```bash
node test_batch_publication.cjs
```

## Astra 독립 검토 보완

- 변경 없음은 `git diff --cached --quiet`의 exit0에서만 정상 종료한다. diff의 오류(1 외), commit 실패, push 실패는 비정상 종료를 유지한다. 모의 shell 검사에서 실제 Git/원격 호출은 하지 않는다.
- 이 가드는 수집 개수·배치 완결성과 TXT/집계의 내용 일치를 검증한다. API JSON 자체의 정상 schema·법률 의미를 인증하지 않는다. 예를 들어 HTTP200의 빈 객체나 오류 객체가 두 저장물에 똑같이 들어가는 기존 원천 의미검증 한계는 별도다. 이번 패치는 기존 수집기·법령 파서를 바꾸지 않는다.
- 보완 후 실제 상위 운영 배치와의 전수 호환성 검증·배포는 수행하지 않았다.
