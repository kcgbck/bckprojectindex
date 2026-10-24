'use strict';

const fs = require('node:fs');
const path = require('node:path');

const WINDOWS_RESERVED_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i;

function isPositiveInteger(value) {
    return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value) {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function sanitizeLawName(name) {
    return String(name ?? '').replace(/[\\/:*?"<>|]/g, '');
}

function deepEqual(a, b) {
    if (a === b) return true;
    if (a === null || typeof a !== 'object' || b === null || typeof b !== 'object') {
        return false;
    }
    if (Array.isArray(a) !== Array.isArray(b)) return false;

    if (Array.isArray(a)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!deepEqual(a[i], b[i])) return false;
        }
        return true;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
        if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
        if (!deepEqual(a[key], b[key])) return false;
    }

    return true;
}

function validateBatch(targetDir = process.cwd()) {
    const resolvedDir = path.resolve(targetDir);
    const dataFilePath = path.join(resolvedDir, 'laws_data.json');
    const failureFilePath = path.join(resolvedDir, 'laws_fetch_failures.json');
    const lawsTxtDir = path.join(resolvedDir, 'laws_txt');

    // 1. laws_data.json 존재 및 JSON 파싱 검증
    if (!fs.existsSync(dataFilePath)) {
        throw new Error(`[데이터 누락] ${dataFilePath} 파일이 존재하지 않습니다.`);
    }

    let parsedDataFile;
    try {
        const raw = fs.readFileSync(dataFilePath, 'utf8');
        parsedDataFile = JSON.parse(raw);
    } catch (err) {
        throw new Error(`[JSON 파싱 오류] ${dataFilePath} 파일을 파싱할 수 없습니다: ${err.message}`);
    }

    const metadata = parsedDataFile?.metadata;
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
        throw new Error('[메타데이터 오류] laws_data.json에 metadata 객체가 없거나 유효하지 않습니다.');
    }

    // 2. 메타데이터 정수형 수치 및 100% 완전 배치 불변식 검증
    if (!isPositiveInteger(metadata.attemptedCount)) {
        throw new Error(`[메타데이터 오류] attemptedCount(${metadata.attemptedCount})가 양의 정수가 아닙니다.`);
    }
    if (!isNonNegativeInteger(metadata.successCount) || metadata.successCount !== metadata.attemptedCount) {
        throw new Error(`[메타데이터 오류] successCount(${metadata.successCount})가 attemptedCount(${metadata.attemptedCount})와 일치하지 않습니다.`);
    }
    if (!isNonNegativeInteger(metadata.failCount) || metadata.failCount !== 0) {
        throw new Error(`[메타데이터 오류] failCount(${metadata.failCount})가 0이 아닙니다.`);
    }
    if (metadata.successRate !== 100) {
        throw new Error(`[메타데이터 오류] successRate(${metadata.successRate})가 100%가 아닙니다.`);
    }
    if (!isPositiveInteger(metadata.fetchedCount) || metadata.fetchedCount !== metadata.attemptedCount) {
        throw new Error(`[메타데이터 오류] fetchedCount(${metadata.fetchedCount})가 attemptedCount(${metadata.attemptedCount})와 일치하지 않습니다.`);
    }

    // 과거 데이터 보존 건수 검증 (보존된 과거 소스는 삭제가 아닌 작업자 확인을 위해 발행 차단)
    if (!isNonNegativeInteger(metadata.retainedPreviousCount) || metadata.retainedPreviousCount !== 0) {
        throw new Error(
            `[배치 불완전 - 과거 소스 보존 감지] retainedPreviousCount(${metadata.retainedPreviousCount})가 0이 아닙니다. ` +
            `과거 수집 데이터가 병합/보존된 배치는 불완전 발행을 방지하고 작업자의 수동 조정을 위해 자동 발행을 차단합니다.`
        );
    }

    if (!isPositiveInteger(metadata.totalDataCount) || metadata.totalDataCount !== metadata.attemptedCount) {
        throw new Error(`[메타데이터 오류] totalDataCount(${metadata.totalDataCount})가 attemptedCount(${metadata.attemptedCount})와 일치하지 않습니다.`);
    }

    if (metadata.abortedEarly === true) {
        throw new Error(`[조기 중단 오류] metadata.abortedEarly가 true입니다. 사유: ${metadata.abortReason ?? '사유 미기재'}`);
    }
    if (metadata.abortReason) {
        throw new Error(`[중단 사유 감지] metadata.abortReason이 존재합니다: ${metadata.abortReason}`);
    }

    // 3. laws_fetch_failures.json 검증
    // 정상 100% 성공 시 updater가 해당 파일을 unlink하지만, 만약 파일이 존재한다면 명시적 0 실패 상태여야 함
    if (fs.existsSync(failureFilePath)) {
        let failures;
        try {
            failures = JSON.parse(fs.readFileSync(failureFilePath, 'utf8'));
        } catch (err) {
            throw new Error(`[실패 보고서 오류] ${failureFilePath} 파일이 손상되어 파싱할 수 없습니다: ${err.message}`);
        }

        if (!isNonNegativeInteger(failures?.failCount) || failures.failCount !== 0) {
            throw new Error(
                `[실패 보고서 감지] ${failureFilePath}에 failCount=${failures?.failCount}가 기록되어 있습니다. 실패 배치는 발행할 수 없습니다.`
            );
        }

        if (!Array.isArray(failures.failedLaws) || failures.failedLaws.length > 0) {
            throw new Error(`[실패 보고서 감지] ${failureFilePath}의 failedLaws 목록이 비어있지 않습니다.`);
        }

        if (!Array.isArray(failures.failureRecords) || failures.failureRecords.length > 0) {
            throw new Error(`[실패 보고서 감지] ${failureFilePath}의 failureRecords 목록이 비어있지 않습니다.`);
        }
    }

    // 4. data 배열 무결성 검증
    const dataList = parsedDataFile?.data;
    if (!Array.isArray(dataList)) {
        throw new Error('[데이터 오류] laws_data.json의 data가 배열이 아닙니다.');
    }
    if (dataList.length !== metadata.totalDataCount) {
        throw new Error(`[데이터 개수 불일치] data 배열 길이(${dataList.length})가 metadata.totalDataCount(${metadata.totalDataCount})와 다릅니다.`);
    }

    if (!fs.existsSync(lawsTxtDir)) {
        throw new Error(`[디렉터리 누락] ${lawsTxtDir} 개별 법령 텍스트 디렉터리가 존재하지 않습니다.`);
    }

    const seenTitles = new Set();
    const seenSafeNames = new Map();

    for (let i = 0; i < dataList.length; i++) {
        const item = dataList[i];
        if (!item || typeof item !== 'object') {
            throw new Error(`[데이터 항목 오류] data[${i}] 항목이 객체가 아닙니다.`);
        }

        // ID 형식 검증 (문자열 또는 숫자 허용)
        if (!((typeof item.id === 'string' && item.id.trim().length > 0) || (typeof item.id === 'number' && Number.isFinite(item.id)))) {
            throw new Error(`[ID 누락] data[${i}] 항목의 id가 유효하지 않습니다.`);
        }

        // 법령명 검증
        const title = item.title;
        if (typeof title !== 'string' || title.trim().length === 0) {
            throw new Error(`[법령명 누락] data[${i}] 항목의 title이 비어있거나 문자열이 아닙니다.`);
        }
        if (seenTitles.has(title)) {
            throw new Error(`[법령명 중복] "${title}" 법령명이 data 배열에 중복 존재합니다.`);
        }
        seenTitles.add(title);

        // 카테고리 검증
        if (typeof item.category !== 'string' || item.category.trim().length === 0) {
            throw new Error(`[카테고리 누락] "${title}" 법령의 category가 비어있습니다.`);
        }

        // raw_data 검증
        if (!item.raw_data || typeof item.raw_data !== 'object' || Array.isArray(item.raw_data)) {
            throw new Error(`[원천 데이터 누락] "${title}" 법령의 raw_data 객체가 유효하지 않습니다.`);
        }

        // 파일명 sanitize 검증 (updater의 replace(/[\\/:*?"<>|]/g, "")와 동일)
        const safeName = sanitizeLawName(title);
        if (safeName.trim().length === 0) {
            throw new Error(`[파일명 안전성 오류] "${title}" 법령을 sanitize한 결과 파일명이 비어있습니다.`);
        }
        if (safeName === '.' || safeName === '..') {
            throw new Error(`[파일명 안전성 오류] "${title}" 법령 파일명이 dot/dotdot입니다: "${safeName}"`);
        }
        if (WINDOWS_RESERVED_NAMES.test(safeName)) {
            throw new Error(`[파일명 안전성 오류] "${title}" 법령 파일명이 Windows 예약 장치명입니다: "${safeName}"`);
        }
        if (/[\. ]$/.test(safeName)) {
            throw new Error(`[파일명 안전성 오류] "${title}" 법령 파일명이 공백이나 점으로 끝납니다: "${safeName}"`);
        }

        // sanitize 충돌 검증
        if (seenSafeNames.has(safeName)) {
            throw new Error(
                `[파일명 충돌] "${title}" 법령과 "${seenSafeNames.get(safeName)}" 법령이 동일한 파일명("${safeName}.txt")으로 충돌합니다.`
            );
        }
        seenSafeNames.set(safeName, title);

        // 경로 탈출 검증
        const resolvedTxtPath = path.resolve(lawsTxtDir, `${safeName}.txt`);
        const relativeToTxtDir = path.relative(lawsTxtDir, resolvedTxtPath);
        if (relativeToTxtDir.startsWith('..') || path.isAbsolute(relativeToTxtDir)) {
            throw new Error(`[경로 탈출 감지] "${title}" 법령 파일 경로가 laws_txt 외부를 참조합니다: "${resolvedTxtPath}"`);
        }

        // 5. TXT 파일 존재 및 raw_data 일치 검증
        if (!fs.existsSync(resolvedTxtPath)) {
            throw new Error(`[TXT 파일 누락] "${title}" 법령에 대응하는 파일이 누락되었습니다: ${resolvedTxtPath}`);
        }

        let parsedTxt;
        try {
            parsedTxt = JSON.parse(fs.readFileSync(resolvedTxtPath, 'utf8'));
        } catch (err) {
            throw new Error(`[TXT JSON 파싱 오류] "${resolvedTxtPath}" 파일 파싱 실패: ${err.message}`);
        }

        // deep equality 검증
        if (!deepEqual(item.raw_data, parsedTxt)) {
            throw new Error(`[원천 데이터 불일치] "${title}" 법령의 laws_data.json raw_data와 ${safeName}.txt 내용이 일치하지 않습니다.`);
        }
    }

    const expectedTxtNames = new Set([...seenSafeNames.keys()].map(name => `${name}.txt`));
    for (const entry of fs.readdirSync(lawsTxtDir, { withFileTypes: true })) {
        if (/\.txt$/i.test(entry.name) && (!entry.isFile() || !expectedTxtNames.has(entry.name))) {
            throw new Error(`[미등록 TXT] 집계본에 없는 원천 파일은 공개하지 않습니다: ${entry.name}`);
        }
    }

    return {
        success: true,
        totalLaws: dataList.length,
        attemptedCount: metadata.attemptedCount,
        dataFilePath,
        lawsTxtDir,
    };
}

if (require.main === module) {
    try {
        const targetDirectory = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
        const result = validateBatch(targetDirectory);
        console.log(`[배치 발행 검증 성공] 총 ${result.totalLaws}개 법령 원천 데이터 및 TXT 동기화 상태가 100% 완전합니다.`);
        process.exit(0);
    } catch (error) {
        console.error(`[배치 발행 검증 차단] ${error.message}`);
        process.exit(1);
    }
}

module.exports = {
    validateBatch,
    deepEqual,
    sanitizeLawName,
};
