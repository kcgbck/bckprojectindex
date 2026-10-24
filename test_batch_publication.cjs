'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { validateBatch, deepEqual, sanitizeLawName } = require('./validate_batch_publication.cjs');

function runTestHarness() {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'batch-pub-test-'));
    let totalTests = 0;
    let passedTests = 0;
    const failures = [];

    function test(name, fn) {
        totalTests++;
        try {
            fn();
            passedTests++;
            console.log(`[PASS] ${name}`);
        } catch (err) {
            failures.push({ name, error: err.message });
            console.error(`[FAIL] ${name}: ${err.message}`);
        }
    }

    function createFixtureDir(subName) {
        const fixtureDir = path.join(tempRoot, subName);
        fs.mkdirSync(fixtureDir, { recursive: true });
        return fixtureDir;
    }

    function populateFixture(dir, { metadata, data, failuresContent = null, txtFiles = {} }) {
        const lawsData = {
            metadata,
            data,
        };
        fs.writeFileSync(path.join(dir, 'laws_data.json'), JSON.stringify(lawsData, null, 2), 'utf8');

        if (failuresContent !== null) {
            fs.writeFileSync(path.join(dir, 'laws_fetch_failures.json'), JSON.stringify(failuresContent, null, 2), 'utf8');
        }

        const txtDir = path.join(dir, 'laws_txt');
        if (!fs.existsSync(txtDir)) {
            fs.mkdirSync(txtDir, { recursive: true });
        }
        for (const [filename, content] of Object.entries(txtFiles)) {
            const filePath = path.join(txtDir, filename);
            const parentDir = path.dirname(filePath);
            if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
            fs.writeFileSync(filePath, typeof content === 'string' ? content : JSON.stringify(content, null, 2), 'utf8');
        }
    }

    try {
        console.log(`=== 배치 발행 검증 단위 테스트 하네스 시작 (임시 경로: ${tempRoot}) ===\n`);

        // 1. 완전 유효한 100% 배치
        test('1. 완전 유효한 100% 배치 (정상 통과)', () => {
            const dir = createFixtureDir('valid-full');
            const dataItem1 = {
                id: 101,
                title: '선박안전법',
                category: '법률',
                raw_data: { Law: { 기본정보: { 법령ID: '001742', 법령명_한글: '선박안전법' } } },
            };
            const dataItem2 = {
                id: 'rule_102',
                title: '선박안전법 시행규칙',
                category: '시행규칙',
                raw_data: { Law: { 기본정보: { 법령ID: '007456', 법령명_한글: '선박안전법 시행규칙' } } },
            };

            populateFixture(dir, {
                metadata: {
                    attemptedCount: 2,
                    successCount: 2,
                    failCount: 0,
                    successRate: 100,
                    fetchedCount: 2,
                    retainedPreviousCount: 0,
                    totalDataCount: 2,
                },
                data: [dataItem1, dataItem2],
                txtFiles: {
                    '선박안전법.txt': dataItem1.raw_data,
                    '선박안전법 시행규칙.txt': dataItem2.raw_data,
                },
            });

            const res = validateBatch(dir);
            if (!res.success || res.totalLaws !== 2) {
                throw new Error('유효한 배치 검증 결과가 기대와 다릅니다.');
            }
        });

        // 2. 50% 이상 부분 성공 배치 (failCount > 0, successRate < 100) -> 차단
        test('2. 50% 이상 부분 성공 배치 (부분 갱신 발행 차단)', () => {
            const dir = createFixtureDir('partial-ge50');
            const dataItem1 = {
                id: 101,
                title: '선박안전법',
                category: '법률',
                raw_data: { a: 1 },
            };

            populateFixture(dir, {
                metadata: {
                    attemptedCount: 10,
                    successCount: 6,
                    failCount: 4,
                    successRate: 60,
                    fetchedCount: 6,
                    retainedPreviousCount: 0,
                    totalDataCount: 6,
                },
                data: [dataItem1],
                txtFiles: {
                    '선박안전법.txt': dataItem1.raw_data,
                },
            });

            let threw = false;
            try {
                validateBatch(dir);
            } catch (err) {
                threw = true;
                if (!err.message.includes('successCount')) {
                    throw new Error(`예상치 못한 에러 메시지: ${err.message}`);
                }
            }
            if (!threw) throw new Error('부분 성공 배치가 차단되지 않았습니다.');
        });

        // 3. 과거 완전 집계본 + 신규 실패 보고서 (<50% 보존 상황) -> 차단
        test('3. 과거 완전 집계본 + 신규 실패 보고서 동시 존재 (차단)', () => {
            const dir = createFixtureDir('old-complete-with-failures');
            const item = {
                id: 101,
                title: '선박안전법',
                category: '법률',
                raw_data: { a: 1 },
            };

            populateFixture(dir, {
                metadata: {
                    attemptedCount: 1,
                    successCount: 1,
                    failCount: 0,
                    successRate: 100,
                    fetchedCount: 1,
                    retainedPreviousCount: 0,
                    totalDataCount: 1,
                },
                data: [item],
                failuresContent: {
                    total: 10,
                    successCount: 3,
                    failCount: 7,
                    successRate: 30,
                    failedLaws: ['선박직원법'],
                },
                txtFiles: {
                    '선박안전법.txt': item.raw_data,
                },
            });

            let threw = false;
            try {
                validateBatch(dir);
            } catch (err) {
                threw = true;
                if (!err.message.includes('failCount=7')) {
                    throw new Error(`예상치 못한 에러 메시지: ${err.message}`);
                }
            }
            if (!threw) throw new Error('실패 보고서가 존재하는 배치가 차단되지 않았습니다.');
        });

        // 4. 수치 결측 / 비정수 / 부정수 / attemptedCount 0 -> 차단
        test('4. 메타데이터 정수형/카운트 결측 및 이상치 (차단)', () => {
            const dir = createFixtureDir('invalid-counts');
            const invalidCases = [
                { attemptedCount: 0, successCount: 0, failCount: 0, successRate: 100, fetchedCount: 0, retainedPreviousCount: 0, totalDataCount: 0 },
                { attemptedCount: 2, successCount: '2', failCount: 0, successRate: 100, fetchedCount: 2, retainedPreviousCount: 0, totalDataCount: 2 },
                { attemptedCount: 2, successCount: 2, failCount: -1, successRate: 100, fetchedCount: 2, retainedPreviousCount: 0, totalDataCount: 2 },
                { attemptedCount: 2, successCount: 2, failCount: 0, successRate: 99, fetchedCount: 2, retainedPreviousCount: 0, totalDataCount: 2 },
                { attemptedCount: 2, successCount: 1, failCount: 0, successRate: 100, fetchedCount: 2, retainedPreviousCount: 0, totalDataCount: 2 },
            ];

            const item = { id: 1, title: '선박안전법', category: '법', raw_data: { x: 1 } };

            for (let i = 0; i < invalidCases.length; i++) {
                populateFixture(dir, {
                    metadata: invalidCases[i],
                    data: [item],
                    txtFiles: { '선박안전법.txt': item.raw_data },
                });

                let threw = false;
                try {
                    validateBatch(dir);
                } catch {
                    threw = true;
                }
                if (!threw) throw new Error(`케이스 ${i}가 차단되지 않았습니다: ${JSON.stringify(invalidCases[i])}`);
            }
        });

        // 5. 법령명 중복, 파일명 sanitize 충돌, Windows 예약어, 경로 탈출 시도 -> 차단
        test('5. 법령명 중복 / 파일명 충돌 / 예약어 / 경로 탈출 (차단)', () => {
            const dir = createFixtureDir('security-and-collision');

            // 5a. 중복 법령명
            populateFixture(dir, {
                metadata: { attemptedCount: 2, successCount: 2, failCount: 0, successRate: 100, fetchedCount: 2, retainedPreviousCount: 0, totalDataCount: 2 },
                data: [
                    { id: 1, title: '선박안전법', category: '법', raw_data: { x: 1 } },
                    { id: 2, title: '선박안전법', category: '법', raw_data: { x: 2 } },
                ],
                txtFiles: { '선박안전법.txt': { x: 1 } },
            });
            let threw = false;
            try {
                validateBatch(dir);
            } catch (err) {
                threw = true;
                if (!err.message.includes('중복')) throw err;
            }
            if (!threw) throw new Error('중복 법령명이 차단되지 않았습니다.');

            // 5b. sanitize 충돌 (특수문자 제거 후 동일한 파일명)
            populateFixture(dir, {
                metadata: { attemptedCount: 2, successCount: 2, failCount: 0, successRate: 100, fetchedCount: 2, retainedPreviousCount: 0, totalDataCount: 2 },
                data: [
                    { id: 1, title: '선박?안전법', category: '법', raw_data: { x: 1 } },
                    { id: 2, title: '선박*안전법', category: '법', raw_data: { x: 2 } },
                ],
                txtFiles: { '선박안전법.txt': { x: 1 } },
            });
            threw = false;
            try {
                validateBatch(dir);
            } catch (err) {
                threw = true;
                if (!err.message.includes('충돌')) throw err;
            }
            if (!threw) throw new Error('파일명 충돌이 차단되지 않았습니다.');

            // 5c. Windows 예약 장치명 (CON, NUL 등)
            populateFixture(dir, {
                metadata: { attemptedCount: 1, successCount: 1, failCount: 0, successRate: 100, fetchedCount: 1, retainedPreviousCount: 0, totalDataCount: 1 },
                data: [
                    { id: 1, title: 'CON', category: '법', raw_data: { x: 1 } },
                ],
                txtFiles: { 'CON.txt': { x: 1 } },
            });
            threw = false;
            try {
                validateBatch(dir);
            } catch (err) {
                threw = true;
                if (!err.message.includes('예약 장치명')) throw err;
            }
            if (!threw) throw new Error('Windows 예약 장치명이 차단되지 않았습니다.');

            // 5d. 특수문자만 있어서 sanitize 결과가 빈 문자열이 되는 경우
            populateFixture(dir, {
                metadata: { attemptedCount: 1, successCount: 1, failCount: 0, successRate: 100, fetchedCount: 1, retainedPreviousCount: 0, totalDataCount: 1 },
                data: [
                    { id: 1, title: '???///:::***', category: '법', raw_data: { x: 1 } },
                ],
                txtFiles: {},
            });
            threw = false;
            try {
                validateBatch(dir);
            } catch (err) {
                threw = true;
                if (!err.message.includes('비어있습니다')) throw err;
            }
            if (!threw) throw new Error('빈 sanitize 파일명이 차단되지 않았습니다.');
        });

        // 6. TXT 누락 및 raw_data 내용 불일치 -> 차단
        test('6. TXT 누락 및 내용 불일치 (차단)', () => {
            const dir = createFixtureDir('txt-mismatch');
            const item = {
                id: 1,
                title: '선박안전법',
                category: '법률',
                raw_data: { deep: { nested: [1, 2, { a: 'ok' }] } },
            };

            // 6a. 파일 누락
            populateFixture(dir, {
                metadata: { attemptedCount: 1, successCount: 1, failCount: 0, successRate: 100, fetchedCount: 1, retainedPreviousCount: 0, totalDataCount: 1 },
                data: [item],
                txtFiles: {},
            });
            let threw = false;
            try {
                validateBatch(dir);
            } catch (err) {
                threw = true;
                if (!err.message.includes('누락')) throw err;
            }
            if (!threw) throw new Error('누락된 TXT가 차단되지 않았습니다.');

            // 6b. 내용 불일치 (deep inequality)
            populateFixture(dir, {
                metadata: { attemptedCount: 1, successCount: 1, failCount: 0, successRate: 100, fetchedCount: 1, retainedPreviousCount: 0, totalDataCount: 1 },
                data: [item],
                txtFiles: {
                    '선박안전법.txt': { deep: { nested: [1, 2, { a: 'tampered' }] } },
                },
            });
            threw = false;
            try {
                validateBatch(dir);
            } catch (err) {
                threw = true;
                if (!err.message.includes('원천 데이터 불일치')) throw err;
            }
            if (!threw) throw new Error('내용 불일치 TXT가 차단되지 않았습니다.');
        });

        // 7. 조기 중단 플래그 감지 -> 차단
        test('7. 조기 중단 감지 (차단)', () => {
            const dir = createFixtureDir('early-abort');
            const item = { id: 1, title: '선박안전법', category: '법률', raw_data: { x: 1 } };
            populateFixture(dir, {
                metadata: {
                    attemptedCount: 1,
                    successCount: 1,
                    failCount: 0,
                    successRate: 100,
                    fetchedCount: 1,
                    retainedPreviousCount: 0,
                    totalDataCount: 1,
                    abortedEarly: true,
                    abortReason: '타임아웃으로 인한 중단',
                },
                data: [item],
                txtFiles: { '선박안전법.txt': item.raw_data },
            });
            let threw = false;
            try {
                validateBatch(dir);
            } catch (err) {
                threw = true;
                if (!err.message.includes('조기 중단 오류')) throw err;
            }
            if (!threw) throw new Error('조기 중단 배치가 차단되지 않았습니다.');
        });

        // 8. 과거 소스 보존 건수 감지 (retainedPreviousCount > 0) -> 차단 (작업자 수동 조정을 위한 차단)
        test('8. 과거 소스 보존 건수 감지 (작업자 조정을 위해 발행 차단)', () => {
            const dir = createFixtureDir('retained-historical');
            const item1 = { id: 1, title: '선박안전법', category: '법률', raw_data: { x: 1 } };
            const item2 = { id: 2, title: '구형법령', category: '법률', raw_data: { x: 2 } };

            populateFixture(dir, {
                metadata: {
                    attemptedCount: 1,
                    successCount: 1,
                    failCount: 0,
                    successRate: 100,
                    fetchedCount: 1,
                    retainedPreviousCount: 1,
                    totalDataCount: 2,
                },
                data: [item1, item2],
                txtFiles: {
                    '선박안전법.txt': item1.raw_data,
                    '구형법령.txt': item2.raw_data,
                },
            });
            let threw = false;
            try {
                validateBatch(dir);
            } catch (err) {
                threw = true;
                if (!err.message.includes('과거 소스 보존 감지')) throw err;
            }
            if (!threw) throw new Error('과거 보존 소스가 포함된 배치가 차단되지 않았습니다.');
        });

        // 9. CLI 프로세스 실행 시 exit code 0 및 1 검증
        test('9. CLI 실행 종료 코드 (성공 0, 실패 1)', () => {
            const validDir = path.join(tempRoot, 'valid-full');
            const invalidDir = path.join(tempRoot, 'partial-ge50');
            const scriptPath = path.resolve(__dirname, 'validate_batch_publication.cjs');

            const successRun = spawnSync(process.execPath, [scriptPath, validDir], { encoding: 'utf8' });
            if (successRun.status !== 0) {
                throw new Error(`정상 디렉터리 CLI 실행이 0이 아닌 ${successRun.status}로 종료됨: ${successRun.stderr}`);
            }

            const failRun = spawnSync(process.execPath, [scriptPath, invalidDir], { encoding: 'utf8' });
            if (failRun.status !== 1) {
                throw new Error(`오류 디렉터리 CLI 실행이 1이 아닌 ${failRun.status}로 종료됨`);
            }
        });

        // 10. 워크플로 YAML 텍스트 불변식 검증
        test('10. .github/workflows/update.yml 텍스트 불변식 검증', () => {
            const workflowPath = path.resolve(__dirname, '.github/workflows/update.yml');
            if (!fs.existsSync(workflowPath)) {
                throw new Error(`워크플로 파일을 찾을 수 없습니다: ${workflowPath}`);
            }
            const yamlText = fs.readFileSync(workflowPath, 'utf8');

            // 1. run_update 스텝에서 update_laws.js 실행 후 동일 스텝 내에서 validate_batch_publication.cjs 실행
            if (!yamlText.includes('node update_laws.js') || !yamlText.includes('node validate_batch_publication.cjs')) {
                throw new Error('run_update 스텝에 update_laws.js와 validate_batch_publication.cjs 실행이 포함되지 않았습니다.');
            }

            // 2. Commit 스텝 조건이 if: success() && steps.run_update.outcome == 'success'
            if (!yamlText.includes("if: success() && steps.run_update.outcome == 'success'")) {
                throw new Error("Commit 스텝의 조건이 if: success() && steps.run_update.outcome == 'success' 가 아닙니다.");
            }

            // 3. git add 대상 보존
            if (!yamlText.includes('git add laws_data.json laws_txt/ laws_fetch_failures.json')) {
                throw new Error('git add 명령에 laws_fetch_failures.json 삭제 추적이 포함되지 않았습니다.');
            }

            // 4. 실패 진단 artifact 업로드는 if: failure() 보존
            if (!yamlText.includes('if: failure()')) {
                throw new Error('실패 진단 파일 보관 스텝(if: failure())이 보존되지 않았습니다.');
            }

            // 5. 이슈 생성은 if: always() 보존
            if (!yamlText.includes('if: always()')) {
                throw new Error('이슈 생성 스텝(if: always())이 보존되지 않았습니다.');
            }
        });

        test('11. 미등록 TXT가 집계본 밖에서 공개되지 않음', () => {
            const dir=createFixtureDir('orphan');fs.cpSync(path.join(tempRoot,'valid-full'),dir,{recursive:true});
            fs.writeFileSync(path.join(dir,'laws_txt','미등록법.txt'),'{}');
            require('node:assert/strict').throws(()=>validateBatch(dir),/미등록 TXT/);
        });
        test('12. 실패 보고서의 누락 또는 잘못된 목록 형식 차단', () => {
            const dir=createFixtureDir('malformed-failures');fs.cpSync(path.join(tempRoot,'valid-full'),dir,{recursive:true});
            for(const report of [{failCount:0},{failCount:0,failedLaws:'bad',failureRecords:[]},{failCount:0,failedLaws:[],failureRecords:{}}]) {
                fs.writeFileSync(path.join(dir,'laws_fetch_failures.json'),JSON.stringify(report));
                require('node:assert/strict').throws(()=>validateBatch(dir));
            }
        });
        test('13. JSON 객체 키 순서 차이는 내용 불일치가 아님', () => {
            require('node:assert/strict').equal(deepEqual({a:1,b:{c:2,d:3}},{b:{d:3,c:2},a:1}),true);
            require('node:assert/strict').equal(deepEqual([1,2],[2,1]),false);
        });

        test('14. 실제 commit 단계 shell의 무변경·commit·push 오류 전파 (모의 git)', () => {
            const assert=require('node:assert/strict');
            const text=fs.readFileSync(path.join(__dirname,'.github/workflows/update.yml'),'utf8').replace(/\r\n/g,'\n');
            const step=text.split('      - name: 만들어진 파일들을 GitHub에 저장(Commit)')[1].split('\n      #')[0];
            const command=step.split('        run: |\n')[1].split('\n').map(l=>l.startsWith('          ')?l.slice(10):l).join('\n');
            const mock='git() { case "$1" in config|add) return 0;; diff) return "$DIFF_RC";; commit) echo MOCK_COMMIT; return "$COMMIT_RC";; push) echo MOCK_PUSH; return "$PUSH_RC";; *) return 97;; esac; }\nset -e\n';
            const shell=path.join(tempRoot,'publication-mock.sh');fs.writeFileSync(shell,mock+command);
            const bash=process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'bash';
            for(const c of [{diff:0,commit:0,push:0,exit:0,c:false,p:false},{diff:1,commit:0,push:0,exit:0,c:true,p:true},{diff:1,commit:9,push:0,exit:9,c:true,p:false},{diff:2,commit:0,push:0,exit:2,c:false,p:false},{diff:1,commit:0,push:7,exit:7,c:true,p:true}]){
                const r=spawnSync(bash,[shell.replace(/\\/g,'/')],{encoding:'utf8',env:{...process.env,DIFF_RC:String(c.diff),COMMIT_RC:String(c.commit),PUSH_RC:String(c.push)}});
                assert.equal(r.status,c.exit,r.stderr);assert.equal(r.stdout.includes('MOCK_COMMIT'),c.c);assert.equal(r.stdout.includes('MOCK_PUSH'),c.p);
            }
        });

        console.log(`\n=== 테스트 요약: 총 ${totalTests}개 중 ${passedTests}개 통과, ${failures.length}개 실패 ===`);
        if (failures.length > 0) {
            console.error('\n실패 목록:');
            failures.forEach((f) => console.error(`- ${f.name}: ${f.error}`));
            process.exit(1);
        }
    } finally {
        try {
            fs.rmSync(tempRoot, { recursive: true, force: true });
        } catch {
            // 임시 폴더 삭제 실패는 무시
        }
    }
}

if (require.main === module) {
    runTestHarness();
}

module.exports = { runTestHarness };
