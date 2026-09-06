import fs from 'node:fs';
import dns from 'node:dns/promises';
import https from 'node:https';
import os from 'node:os';

// ==========================================
// [필수 설정] 본인의 법령센터 API OC 값을 입력하세요.
// ==========================================
const API_KEY = "yechankong0512"; // <-- 이 부분을 본인의 OC 값으로 변경하세요!

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const DATA_FILE = './laws_data.json';
const FAILURE_FILE = './laws_fetch_failures.json';
const DIAGNOSTIC_FILE = './laws_fetch_diagnostics.json';

const LAW_API_KEY = String(process.env.LAW_API_KEY ?? '').trim();
const MIN_SUCCESS_RATE = 50;
const FETCH_TIMEOUT_MS = 15000;
const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 2000;
const BETWEEN_LAW_DELAY_MS = 300;
const BETWEEN_CHUNK_DELAY_MS = 7000;
const CHUNK_SIZE = 5;
const MAX_RESPONSE_SNIPPET_LENGTH = 700;

class HttpStatusError extends Error {
    constructor(result) {
        super(`HTTP ${result.status}`);
        this.name = 'HttpStatusError';
        this.status = result.status;
        this.statusText = result.statusText;
        this.headers = result.headers;
        this.bodySnippet = result.bodySnippet;
        this.elapsedMs = result.elapsedMs;
    }
}

class InvalidJsonError extends Error {
    constructor(result, parseError) {
        super(`HTTP ${result.status} 응답이 JSON이 아닙니다: ${parseError.message}`);
        this.name = 'InvalidJsonError';
        this.status = result.status;
        this.headers = result.headers;
        this.bodySnippet = result.bodySnippet;
        this.elapsedMs = result.elapsedMs;
        this.cause = parseError;
    }
}

function nowIso() {
    return new Date().toISOString();
}

function toKstString(iso = nowIso()) {
    return new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        dateStyle: 'medium',
        timeStyle: 'medium',
        hour12: false,
    }).format(new Date(iso));
}

function safeText(value, maxLength = MAX_RESPONSE_SNIPPET_LENGTH) {
    if (value === undefined || value === null) return '';
    let text = String(value).replace(/\s+/g, ' ');
    if (LAW_API_KEY) text = text.replaceAll(LAW_API_KEY, '***');
    return text.slice(0, maxLength);
}

function sanitizeUrl(input) {
    try {
        const url = new URL(input);
        if (url.searchParams.has('OC')) url.searchParams.set('OC', '***');
        return url.toString();
    } catch {
        return safeText(input, 300);
    }
}

function readJsonIfExists(filePath) {
    try {
        if (!fs.existsSync(filePath)) return null;
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        console.warn(`[경고] ${filePath} 읽기 실패: ${safeText(error.message)}`);
        return null;
    }
}

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function selectHeaders(headers) {
    const allowed = [
        'content-type',
        'content-length',
        'date',
        'server',
        'via',
        'location',
        'retry-after',
        'x-request-id',
        'x-cache',
        'cf-ray',
    ];
    const selected = {};
    for (const key of allowed) {
        const value = headers?.get?.(key) ?? headers?.[key];
        if (value) selected[key] = safeText(value, 200);
    }
    return selected;
}

function errorToObject(error, depth = 0) {
    if (!error || depth > 3) return null;

    const result = {
        name: error.name ?? 'Error',
        message: safeText(error.message, 500),
        code: error.code ?? null,
        errno: error.errno ?? null,
        syscall: error.syscall ?? null,
        address: error.address ?? null,
        port: error.port ?? null,
    };

    if (error.status !== undefined) result.status = error.status;
    if (error.statusText) result.statusText = safeText(error.statusText, 100);
    if (error.bodySnippet) result.bodySnippet = safeText(error.bodySnippet);
    if (error.headers) result.headers = selectHeaders(error.headers);
    if (error.elapsedMs !== undefined) result.elapsedMs = error.elapsedMs;
    if (error.applicationTimeout) result.applicationTimeout = true;

    if (error.cause) result.cause = errorToObject(error.cause, depth + 1);
    if (Array.isArray(error.errors)) {
        result.errors = error.errors.slice(0, 5).map((item) => errorToObject(item, depth + 1));
    }
    return result;
}

function collectErrorCodes(error, codes = new Set(), depth = 0) {
    if (!error || depth > 5) return codes;
    if (error.code) codes.add(String(error.code));
    if (error.cause) collectErrorCodes(error.cause, codes, depth + 1);
    if (Array.isArray(error.errors)) {
        for (const nested of error.errors) collectErrorCodes(nested, codes, depth + 1);
    }
    return codes;
}

function classifyError(error) {
    if (error instanceof HttpStatusError) {
        if (error.status === 401 || error.status === 403) return 'HTTP_ACCESS_DENIED';
        if (error.status === 429) return 'HTTP_RATE_LIMIT';
        if (error.status >= 500) return 'HTTP_SERVER_ERROR';
        return 'HTTP_ERROR';
    }
    if (error instanceof InvalidJsonError) return 'INVALID_JSON_RESPONSE';
    if (error?.applicationTimeout) return 'APPLICATION_TIMEOUT';

    const codes = collectErrorCodes(error);
    if (codes.has('UND_ERR_CONNECT_TIMEOUT') || codes.has('ETIMEDOUT')) return 'TCP_CONNECT_TIMEOUT';
    if (codes.has('ENOTFOUND') || codes.has('EAI_AGAIN') || codes.has('ENODATA')) return 'DNS_FAILURE';
    if (codes.has('ECONNREFUSED')) return 'TCP_CONNECTION_REFUSED';
    if (codes.has('ECONNRESET') || codes.has('EPIPE')) return 'CONNECTION_RESET';
    if ([...codes].some((code) => code.includes('TLS') || code.includes('CERT') || code.includes('SSL'))) return 'TLS_FAILURE';
    if (error?.name === 'AbortError') return 'APPLICATION_TIMEOUT';
    return 'NETWORK_OR_UNKNOWN';
}

function explanationForCategory(category, status = null) {
    const map = {
        HTTP_ACCESS_DENIED: 'HTTP 응답은 도착했지만 접근이 거부됐습니다. OC 인증값, 등록 IP, 이용승인 상태 또는 서버 접근정책을 확인해야 합니다.',
        HTTP_RATE_LIMIT: '법령 API가 HTTP 429로 호출량을 제한했습니다. 호출 간격 또는 일일/분당 한도를 조정해야 합니다.',
        HTTP_SERVER_ERROR: '법령 API 또는 중간 서버가 5xx 응답을 반환했습니다. 요청은 서버까지 도달했으나 서버 측 처리가 실패한 경우입니다.',
        HTTP_ERROR: `법령 API가 HTTP ${status ?? '오류'} 응답을 반환했습니다.`,
        INVALID_JSON_RESPONSE: 'HTTP 연결은 성립했지만 JSON 대신 다른 형식의 응답이 왔습니다. 응답 본문 일부를 확인해야 합니다.',
        DNS_FAILURE: 'www.law.go.kr의 DNS 이름 해석 단계에서 실패했습니다. 인증키나 IP 등록 단계 이전의 네트워크 문제입니다.',
        TCP_CONNECT_TIMEOUT: 'DNS 해석 뒤 www.law.go.kr:443 TCP 연결이 시간초과됐습니다. HTTP 요청·OC 인증에는 도달하지 못했습니다. GitHub Actions 출구 IP에 대한 방화벽 드롭, 통신 경로 장애, 대상 서버의 연결 수락 문제 중 하나일 수 있습니다.',
        TCP_CONNECTION_REFUSED: '대상 주소의 443 포트가 연결을 거부했습니다. HTTP/OC 인증 이전 단계의 문제입니다.',
        CONNECTION_RESET: '연결이 상대 또는 중간 장비에 의해 재설정됐습니다. HTTP 응답 여부는 상세 원인 코드를 확인해야 합니다.',
        TLS_FAILURE: 'TCP 연결 뒤 TLS 인증서 또는 암호화 협상 단계에서 실패했습니다. HTTP/OC 인증 이전 단계의 문제입니다.',
        APPLICATION_TIMEOUT: '스크립트가 정한 시간 제한 안에 응답을 받지 못했습니다.',
        NETWORK_OR_UNKNOWN: 'HTTP 응답을 받지 못했으나 세부 네트워크 오류 코드가 충분하지 않습니다. error.cause와 TLS 진단 결과를 확인해야 합니다.',
    };
    return map[category] ?? '분류되지 않은 오류입니다.';
}

function buildApiUrl(rawUrl) {
    const url = new URL(rawUrl);
    url.searchParams.set('OC', LAW_API_KEY || API_KEY);
    return url.toString();
}

async function fetchText(url, timeoutMs = FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    let applicationTimeout = false;
    const started = Date.now();
    const timer = setTimeout(() => {
        applicationTimeout = true;
        controller.abort();
    }, timeoutMs);

    try {
        const response = await fetch(url, {
            method: 'GET',
            redirect: 'manual',
            signal: controller.signal,
            headers: {
                Accept: 'application/json, text/plain;q=0.9, */*;q=0.1',
                'User-Agent': 'law-sync-diagnostic/1.0',
            },
        });
        const body = await response.text();
        return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            headers: selectHeaders(response.headers),
            body,
            bodySnippet: safeText(body),
            elapsedMs: Date.now() - started,
        };
    } catch (error) {
        error.applicationTimeout = applicationTimeout;
        error.elapsedMs = Date.now() - started;
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

async function fetchJsonWithRetry(law, maxRetries = RETRY_COUNT) {
    const requestUrl = buildApiUrl(law.api);
    const attempts = [];
    let finalError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
        try {
            const result = await fetchText(requestUrl);
            if (!result.ok) throw new HttpStatusError(result);

            let data;
            try {
                data = JSON.parse(result.body);
            } catch (parseError) {
                throw new InvalidJsonError(result, parseError);
            }

            attempts.push({
                attempt,
                ok: true,
                status: result.status,
                elapsedMs: result.elapsedMs,
            });
            return { data, attempts, requestUrl };
        } catch (error) {
            const category = classifyError(error);
            const details = errorToObject(error);
            const attemptRecord = {
                attempt,
                ok: false,
                category,
                elapsedMs: error.elapsedMs ?? null,
                error: details,
            };
            attempts.push(attemptRecord);
            finalError = error;

            console.warn(
                `[경고] ${law.name} (${attempt}/${maxRetries}) ` +
                `분류=${category}, 원인=${safeText(error.message, 220)}`
            );

            if (attempt < maxRetries) await delay(RETRY_DELAY_MS);
        }
    }

    finalError.attempts = attempts;
    finalError.requestUrl = sanitizeUrl(requestUrl);
    finalError.category = classifyError(finalError);
    throw finalError;
}

async function resolveLawHost() {
    const result = { host: 'www.law.go.kr' };
    try {
        result.lookup = await dns.lookup(result.host, { all: true, verbatim: true });
    } catch (error) {
        result.lookupError = errorToObject(error);
    }
    try {
        result.ipv4 = await dns.resolve4(result.host);
    } catch (error) {
        result.ipv4Error = errorToObject(error);
    }
    try {
        result.ipv6 = await dns.resolve6(result.host);
    } catch (error) {
        result.ipv6Error = errorToObject(error);
    }
    return result;
}

async function getPublicEgressIp() {
    const services = [
        { name: 'api.ipify.org', url: 'https://api.ipify.org?format=json' },
        { name: 'icanhazip.com', url: 'https://icanhazip.com/' },
    ];

    for (const service of services) {
        try {
            const result = await fetchText(service.url, 8000);
            if (!result.ok) continue;

            let ip = '';
            try {
                const parsed = JSON.parse(result.body);
                ip = String(parsed.ip ?? parsed.address ?? '').trim();
            } catch {
                ip = String(result.body).trim();
            }

            if (/^[0-9A-Fa-f:.]+$/.test(ip)) {
                return { service: service.name, ip, elapsedMs: result.elapsedMs };
            }
        } catch {
            // 다른 진단 항목을 우선하기 위해 IP 조회 실패는 조용히 다음 서비스로 진행합니다.
        }
    }
    return { service: null, ip: null, elapsedMs: null, note: '공인 출구 IP 조회 실패' };
}

function probeHttpsConnection(url, timeoutMs = FETCH_TIMEOUT_MS) {
    return new Promise((resolve) => {
        const started = Date.now();
        const timeline = [];
        let finished = false;
        let totalTimer = null;

        const stamp = (phase, extra = {}) => {
            timeline.push({ phase, atMs: Date.now() - started, ...extra });
        };

        const finish = (result) => {
            if (finished) return;
            finished = true;
            clearTimeout(totalTimer);
            resolve({
                url: sanitizeUrl(url),
                elapsedMs: Date.now() - started,
                timeline,
                ...result,
            });
        };

        let request;
        try {
            request = https.request(url, {
                method: 'GET',
                headers: {
                    Accept: 'application/json, text/plain;q=0.9, */*;q=0.1',
                    'User-Agent': 'law-sync-diagnostic/1.0',
                },
                agent: false,
            }, (response) => {
                stamp('http_response', {
                    status: response.statusCode ?? null,
                    statusMessage: safeText(response.statusMessage, 100),
                    headers: selectHeaders(response.headers),
                });
                response.resume();
                response.on('end', () => finish({
                    ok: true,
                    phase: 'http_response',
                    status: response.statusCode ?? null,
                    statusMessage: safeText(response.statusMessage, 100),
                    headers: selectHeaders(response.headers),
                }));
                response.on('error', (error) => finish({
                    ok: false,
                    phase: 'response_stream_error',
                    category: classifyError(error),
                    error: errorToObject(error),
                }));
            });

            request.on('socket', (socket) => {
                socket.on('lookup', (error, address, family, host) => {
                    stamp('dns_lookup', {
                        host,
                        address: address ?? null,
                        family: family ?? null,
                        error: error ? errorToObject(error) : null,
                    });
                });
                socket.on('connect', () => stamp('tcp_connected', {
                    remoteAddress: socket.remoteAddress ?? null,
                    remotePort: socket.remotePort ?? null,
                }));
                socket.on('secureConnect', () => stamp('tls_connected', {
                    authorized: socket.authorized,
                    authorizationError: socket.authorizationError ?? null,
                    protocol: socket.getProtocol?.() ?? null,
                }));
                socket.on('timeout', () => stamp('socket_timeout'));
            });

            request.on('error', (error) => {
                const lastPhase = timeline.at(-1)?.phase ?? 'request_error';
                let phase = 'request_error';
                const category = classifyError(error);
                if (category === 'TCP_CONNECT_TIMEOUT') phase = 'tcp_connect_timeout';
                else if (category === 'DNS_FAILURE') phase = 'dns_failure';
                else if (category === 'TLS_FAILURE') phase = 'tls_failure';
                else if (lastPhase === 'tcp_connected') phase = 'post_tcp_error';

                finish({
                    ok: false,
                    phase,
                    category,
                    error: errorToObject(error),
                });
            });

            totalTimer = setTimeout(() => {
                stamp('application_timeout');
                const timeoutError = new Error(`진단 연결 시간초과(${Math.round(timeoutMs / 1000)}초)`);
                timeoutError.code = 'APP_DIAGNOSTIC_TIMEOUT';
                timeoutError.applicationTimeout = true;
                request.destroy(timeoutError);
            }, timeoutMs);

            request.end();
        } catch (error) {
            finish({
                ok: false,
                phase: 'request_setup_error',
                category: classifyError(error),
                error: errorToObject(error),
            });
        }
    });
}

function allAttemptsAreTransportFailures(attempts = []) {
    if (attempts.length < RETRY_COUNT) return false;
    const transportCategories = new Set([
        'DNS_FAILURE',
        'TCP_CONNECT_TIMEOUT',
        'TCP_CONNECTION_REFUSED',
        'CONNECTION_RESET',
        'TLS_FAILURE',
        'APPLICATION_TIMEOUT',
    ]);
    return attempts.every((attempt) => !attempt.ok && transportCategories.has(attempt.category));
}

function buildDiagnosticSummary(preflight, failureRecords) {
    const firstFailure = failureRecords[0] ?? null;
    const category = firstFailure?.category
        ?? preflight?.apiConnectionProbe?.category
        ?? (preflight?.apiConnectionProbe?.status >= 400
            ? (preflight.apiConnectionProbe.status === 401 || preflight.apiConnectionProbe.status === 403
                ? 'HTTP_ACCESS_DENIED'
                : preflight.apiConnectionProbe.status === 429
                    ? 'HTTP_RATE_LIMIT'
                    : preflight.apiConnectionProbe.status >= 500
                        ? 'HTTP_SERVER_ERROR'
                        : 'HTTP_ERROR')
            : 'NETWORK_OR_UNKNOWN');

    const status = firstFailure?.status ?? preflight?.apiConnectionProbe?.status ?? null;
    return {
        category,
        status,
        explanation: explanationForCategory(category, status),
        confidence: category === 'HTTP_ACCESS_DENIED' || category === 'HTTP_RATE_LIMIT' || category === 'HTTP_SERVER_ERROR'
            ? '높음: 법령 API의 HTTP 응답을 직접 확인함'
            : category === 'TCP_CONNECT_TIMEOUT' || category === 'DNS_FAILURE' || category === 'TLS_FAILURE'
                ? '높음: API 인증/HTTP 응답 이전 네트워크 단계의 실패임'
                : '제한적: 추가 실행 로그와 error.cause 확인 필요',
        ipBlockConclusion: category === 'HTTP_ACCESS_DENIED'
            ? '가능성 있음: 응답 본문과 등록 IP 설정을 함께 확인해야 함'
            : category === 'TCP_CONNECT_TIMEOUT'
                ? '확정 불가: GitHub 출구 IP 차단, 중간 경로 차단, 대상 서버 연결 장애가 모두 같은 현상을 낼 수 있음. 다른 고정 IP(예: Oracle Tokyo)에서 같은 진단을 비교해야 IP 차단을 판정할 수 있음.'
                : '현 단계에서 IP 차단 여부를 확정할 수 없음',
    };
}

function preserveOrMergeData(updatedLaws, successRate, metadata) {
    const previous = readJsonIfExists(DATA_FILE);
    const previousData = Array.isArray(previous?.data) ? previous.data : [];

    if (successRate < MIN_SUCCESS_RATE) {
        return {
            wroteData: false,
            dataCount: previousData.length,
            preservedPrevious: true,
            reason: `성공률 ${successRate}%가 기준 ${MIN_SUCCESS_RATE}% 미만이어서 기존 ${DATA_FILE}를 보존함`,
        };
    }

    const byTitle = new Map(previousData.map((item) => [item.title, item]));
    for (const item of updatedLaws) byTitle.set(item.title, item);

    const mergedData = [
        ...updatedLaws,
        ...previousData.filter((item) => !updatedLaws.some((updated) => updated.title === item.title)),
    ];

    writeJson(DATA_FILE, {
        metadata: {
            ...metadata,
            latestVersion: nowIso(),
            fetchedCount: updatedLaws.length,
            retainedPreviousCount: mergedData.length - updatedLaws.length,
            totalDataCount: mergedData.length,
        },
        data: mergedData,
    });

    return {
        wroteData: true,
        dataCount: mergedData.length,
        preservedPrevious: false,
        reason: `성공 ${updatedLaws.length}개를 반영하고 실패 항목은 기존 데이터에서 보존함`,
    };
}

async function main() {
    const startedAt = nowIso();
    console.log('데이터 동기화 시작...');
    console.log(`[실행 환경] node=${process.version}, os=${os.platform()} ${os.release()}, runner=${process.env.RUNNER_NAME ?? 'local'}`);

    const preflightUrl = buildApiUrl(LAW_LIST[0].api);
    const [egressIp, lawHostDns, apiConnectionProbe] = await Promise.all([
        getPublicEgressIp(),
        resolveLawHost(),
        probeHttpsConnection(preflightUrl),
    ]);

    const preflight = {
        checkedAt: nowIso(),
        runner: {
            runnerName: process.env.RUNNER_NAME ?? null,
            runnerOs: process.env.RUNNER_OS ?? os.platform(),
            githubRunId: process.env.GITHUB_RUN_ID ?? null,
            githubRunAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
            node: process.version,
        },
        egressIp,
        lawHostDns,
        apiConnectionProbe,
    };

    console.log(`[사전 진단] 출구 IP: ${egressIp.ip ?? '확인 실패'} (${egressIp.service ?? 'N/A'})`);
    console.log(`[사전 진단] law.go.kr DNS: ${JSON.stringify(lawHostDns.lookup ?? lawHostDns.lookupError ?? '확인 실패')}`);
    console.log(`[사전 진단] API 연결: phase=${apiConnectionProbe.phase}, category=${apiConnectionProbe.category ?? 'N/A'}, status=${apiConnectionProbe.status ?? 'N/A'}, ${apiConnectionProbe.elapsedMs}ms`);

    const outputDir = './laws_txt';
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const updatedLaws = [];
    const failedLaws = [];
    const failureRecords = [];
    let abortedEarly = false;
    let abortReason = null;
    let successCount = 0;

    for (let i = 0; i < LAW_LIST.length; i += CHUNK_SIZE) {
        const chunk = LAW_LIST.slice(i, i + CHUNK_SIZE);

        for (const item of chunk) {
            try {
                const { data } = await fetchJsonWithRetry(item);
                const basicInfo = data.Law?.기본정보 || data.EngLaw?.기본정보 || data;
                
                // 1. 개별 txt 파일로 저장 (개별 저장 유지)
                const safeName = item.name.replace(/[\\/:*?"<>|]/g, "");
                fs.writeFileSync(`${outputDir}/${safeName}.txt`, JSON.stringify(data, null, 2), 'utf-8');
                
                // 2. 통합 방식 부활: laws_data.json 저장을 위해 updatedLaws 배열에 추가
                updatedLaws.push({
                    id: basicInfo?.법령ID || basicInfo?.engLawId || `law_${item.no}`,
                    title: item.name,
                    raw_data: data,
                    lastUpdated: basicInfo?.시행일자 || basicInfo?.enfDt || new Date().toISOString().split('T')[0],
                });
                
                console.log(`[성공] ${item.name} -> 개별 txt 및 통합 객체 생성`);
                successCount++;
            } catch (error) {
                const category = error.category ?? classifyError(error);
                const record = {
                    no: item.no,
                    name: item.name,
                    request: error.requestUrl ?? sanitizeUrl(buildApiUrl(item.api)),
                    category,
                    status: error.status ?? null,
                    explanation: explanationForCategory(category, error.status ?? null),
                    attempts: error.attempts ?? [],
                    finalError: errorToObject(error),
                };

                failedLaws.push(item.name);
                failureRecords.push(record);

                console.error(`[최종 오류] ${item.name}: 분류=${category}`);
                console.error(`[최종 오류 상세] ${JSON.stringify(record.finalError)}`);

                if (i === 0 && allAttemptsAreTransportFailures(record.attempts)) {
                    abortedEarly = true;
                    abortReason = '첫 법령의 3회 재시도가 모두 연결 단계 오류로 실패하여 동일 호스트의 나머지 요청을 중단함';
                    console.error(`[연결 단계 조기 중단] ${abortReason}`);
                    break;
                }

                const maxFailedBeforeAbort = Math.floor(LAW_LIST.length * (100 - MIN_SUCCESS_RATE) / 100) + 1;
                if (failedLaws.length >= maxFailedBeforeAbort) {
                    abortedEarly = true;
                    abortReason = `실패 ${failedLaws.length}개로 성공률 ${MIN_SUCCESS_RATE}% 이상 달성이 불가능함`;
                    console.error(`[중단] ${abortReason}`);
                    break;
                }
            }

            await delay(BETWEEN_LAW_DELAY_MS);
        }

        if (abortedEarly) break;

        if (i + CHUNK_SIZE < LAW_LIST.length) {
            console.log(`[대기] 다음 청크까지 ${BETWEEN_CHUNK_DELAY_MS / 1000}초 대기...`);
            await delay(BETWEEN_CHUNK_DELAY_MS);
        }
    }

    const total = LAW_LIST.length;
    const failCount = failedLaws.length;
    const successRate = Math.round((successCount / total) * 100);
    const finishedAt = nowIso();

    const summary = buildDiagnosticSummary(preflight, failureRecords);
    const dataWrite = preserveOrMergeData(updatedLaws, successRate, {
        latestVersion: finishedAt,
        attemptedCount: total,
        successCount,
        failCount,
        successRate,
        abortedEarly,
        abortReason,
    });

    if (failedLaws.length > 0) {
        console.log(`\n[실패 목록]`);
        failedLaws.forEach(name => console.log(`  - ${name}`));
    }

    const diagnostics = {
        version: 1,
        startedAt,
        finishedAt,
        startedAtKst: toKstString(startedAt),
        finishedAtKst: toKstString(finishedAt),
        preflight,
        total,
        successCount,
        failCount,
        successRate,
        abortedEarly,
        abortReason,
        summary,
        dataWrite,
        failureRecords,
    };

    const shouldPersistDiagnostics =
        failedLaws.length > 0 ||
        successRate < MIN_SUCCESS_RATE ||
        process.env.LAW_DIAGNOSTICS_ALWAYS === 'true';

    if (shouldPersistDiagnostics) {
        writeJson(DIAGNOSTIC_FILE, diagnostics);
    } else if (fs.existsSync(DIAGNOSTIC_FILE)) {
        fs.unlinkSync(DIAGNOSTIC_FILE);
    }

    if (failedLaws.length > 0 || successRate < MIN_SUCCESS_RATE) {
        writeJson(FAILURE_FILE, {
            date: finishedAt,
            dateKst: toKstString(finishedAt),
            total,
            successCount,
            failCount,
            successRate,
            abortedEarly,
            abortReason,
            failedLaws,
            diagnosticSummary: summary,
            egressIp: egressIp.ip ?? null,
            apiConnectionProbe: {
                phase: apiConnectionProbe.phase,
                category: apiConnectionProbe.category ?? null,
                status: apiConnectionProbe.status ?? null,
                elapsedMs: apiConnectionProbe.elapsedMs,
            },
            dataWrite,
            failureRecords: failureRecords.slice(0, 10),
            diagnosticFile: DIAGNOSTIC_FILE,
        });
    } else if (fs.existsSync(FAILURE_FILE)) {
        fs.unlinkSync(FAILURE_FILE);
    }

    console.log('\n========== 동기화 결과 ==========');
    console.log(`총 ${total}개 중 ${successCount}개 성공 (${successRate}%), ${failCount}개 실패`);
    console.log(`[진단 판정] ${summary.category}`);
    console.log(`[진단 해석] ${summary.explanation}`);
    console.log(`[IP 차단 판단] ${summary.ipBlockConclusion}`);
    console.log(`[데이터 처리] ${dataWrite.reason}`);
    console.log(`[진단 파일] ${DIAGNOSTIC_FILE}`);

    if (successRate < MIN_SUCCESS_RATE) {
        console.error(`\n❌ 성공률 ${successRate}%로 기준치(${MIN_SUCCESS_RATE}%) 미달. 워크플로를 실패 처리합니다.`);
        process.exit(1);
    }
}


const LAW_LIST = [
    { no: 1,  name: "낚시 관리 및 육성법",                                      api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=011350&type=JSON" },
    { no: 2,  name: "낚시 관리 및 육성법 시행규칙",                              api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=011698&type=JSON" },
    { no: 3,  name: "낚시 관리 및 육성법 시행령",                                api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=011692&type=JSON" },
    { no: 4,  name: "선박안전 조업규칙",                                          api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=007458&type=JSON" },
    { no: 5,  name: "선박안전법",                                                 api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=001742&type=JSON" },
    { no: 6,  name: "선박안전법 시행규칙",                                        api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=007456&type=JSON" },
    { no: 7,  name: "선박안전법 시행령",                                          api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=003907&type=JSON" },
    { no: 8,  name: "선박의 입항 및 출항 등에 관한 법률",                        api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=012248&type=JSON" },
    { no: 9,  name: "선박의 입항 및 출항 등에 관한 법률 시행규칙",               api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=012344&type=JSON" },
    { no: 10, name: "선박의 입항 및 출항 등에 관한 법률 시행령",                 api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=012339&type=JSON" },
    { no: 11, name: "선박직원법",                                                 api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=001739&type=JSON" },
    { no: 12, name: "선박직원법 시행규칙",                                        api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=007464&type=JSON" },
    { no: 13, name: "선박직원법 시행령",                                          api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=003916&type=JSON" },
    { no: 14, name: "선원법",                                                     api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=001740&type=JSON" },
    { no: 15, name: "선원법 시행규칙",                                            api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=007473&type=JSON" },
    { no: 16, name: "선원법 시행령",                                              api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=003922&type=JSON" },
    { no: 17, name: "수산업법",                                                   api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=001486&type=JSON" },
    { no: 18, name: "수산업법 시행규칙",                                          api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=014396&type=JSON" },
    { no: 19, name: "수산업법 시행령",                                            api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=012248&type=JSON" },
    { no: 20, name: "수산자원관리법",                                             api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=010965&type=JSON" },
    { no: 21, name: "수산자원관리법 시행규칙",                                    api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=011207&type=JSON" },
    { no: 22, name: "수산자원관리법 시행령",                                      api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=011189&type=JSON" },
    { no: 23, name: "수상레저안전법",                                             api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=001988&type=JSON" },
    { no: 24, name: "수상레저안전법 시행규칙",                                    api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=007562&type=JSON" },
    { no: 25, name: "수상레저안전법 시행령",                                      api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=004026&type=JSON" },
    { no: 26, name: "수중레저활동의 안전 및 활성화 등에 관한 법률",              api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=012568&type=JSON" },
    { no: 27, name: "수중레저활동의 안전 및 활성화 등에 관한 법률 시행규칙",     api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=012884&type=JSON" },
    { no: 28, name: "수중레저활동의 안전 및 활성화 등에 관한 법률 시행령",       api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=012870&type=JSON" },
    { no: 29, name: "어선법",                                                     api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=001483&type=JSON" },
    { no: 30, name: "어선법 시행규칙",                                            api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=007684&type=JSON" },
    { no: 31, name: "어선법 시행령",                                              api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=004157&type=JSON" },
    { no: 32, name: "어선안전조업 및 어선원의 안전ㆍ보건 증진 등에 관한 법률",   api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=013575&type=JSON" },
    { no: 33, name: "어선안전조업 및 어선원의 안전ㆍ보건 증진 등에 관한 법률 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=013852&type=JSON" },
    { no: 34, name: "어선안전조업 및 어선원의 안전ㆍ보건 증진 등에 관한 법률 시행령",   api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=013840&type=JSON" },
    { no: 35, name: "어촌·어항법",                                                api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=009943&type=JSON" },
    { no: 36, name: "어촌·어항법 시행규칙",                                       api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=010070&type=JSON" },
    { no: 37, name: "어촌·어항법 시행령",                                         api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=010083&type=JSON" },
    { no: 38, name: "해사안전기본법",                                             api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=000058&type=JSON" },
    { no: 39, name: "해사안전기본법 시행규칙",                                    api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=008667&type=JSON" },
    { no: 40, name: "해사안전기본법 시행령",                                      api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=005570&type=JSON" },
    { no: 41, name: "해양경비법",                                                 api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=011562&type=JSON" },
    { no: 42, name: "해양경비법 시행규칙",                                        api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=011677&type=JSON" },
    { no: 43, name: "해양경비법 시행령",                                          api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=011674&type=JSON" },
    { no: 44, name: "해양환경관리법",                                             api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=010379&type=JSON" },
    { no: 45, name: "해양환경관리법 시행규칙",                                    api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=010636&type=JSON" },
    { no: 46, name: "해양환경관리법 시행령",                                      api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=010632&type=JSON" },
    { no: 47, name: "수상에서의 수색ㆍ구조 등에 관한 법률",                      api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=977&type=JSON" },
    { no: 48, name: "수상에서의 수색ㆍ구조 등에 관한 법률 시행령",               api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=3997&type=JSON" },
    { no: 49, name: "수상에서의 수색ㆍ구조 등에 관한 법률 시행규칙",             api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=7528&type=JSON" },
    { no: 50, name: "수상레저기구의 등록 및 검사에 관한 법률",                   api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=14294&type=JSON" },
    { no: 51, name: "수상레저기구의 등록 및 검사에 관한 법률 시행령",            api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=14451&type=JSON" },
    { no: 52, name: "수상레저기구의 등록 및 검사에 관한 법률 시행규칙",          api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=14470&type=JSON" },
    { no: 53, name: "내수면 수상레저활동 안전관리 지원 규칙",                    api: "https://www.law.go.kr/DRF/lawService.do?target=admrul&ID=2100000225134&type=JSON" },
    { no: 54, name: "동력수상레저기구 안전검사 기준",                             api: "https://www.law.go.kr/DRF/lawService.do?target=admrul&ID=2100000225688&type=JSON" },
    { no: 55, name: "수상레저기구의 종류에 관한 고시",                            api: "https://www.law.go.kr/DRF/lawService.do?target=admrul&ID=2100000249996&type=JSON" },
    { no: 56, name: "수상레저안전업무 처리규칙",                                  api: "https://www.law.go.kr/DRF/lawService.do?target=admrul&ID=2100000249826&type=JSON" },
    { no: 57, name: "전기추진 동력수상레저기구 설비기준",                         api: "https://www.law.go.kr/DRF/lawService.do?target=admrul&ID=2100000237242&type=JSON" },
    { no: 58, name: "해양사고의 조사 및 심판에 관한 법률의 적용대상이 아닌 수상레저기구", api: "https://www.law.go.kr/DRF/lawService.do?target=admrul&ID=2100000262268&type=JSON" },
    { no: 59, name: "수중레저 안전관리규정",                                      api: "https://www.law.go.kr/DRF/lawService.do?target=admrul&ID=2100000261918&type=JSON" },
    { no: 60, name: "수중형 체험활동 안전관리요원 자격 인정단체 지정에 관한 지침", api: "https://www.law.go.kr/DRF/lawService.do?target=admrul&ID=2100000275576&type=JSON" },
    { no: 61, name: "불법 외국선박 나포 포상금 지급에 관한 규정",                api: "https://www.law.go.kr/DRF/lawService.do?target=admrul&ID=2100000246764&type=JSON" },
    { no: 62, name: "불법조업 외국어선 사법처리 절차 등에 관한 규칙",            api: "https://www.law.go.kr/DRF/lawService.do?target=admrul&ID=2100000181898&type=JSON" },
    { no: 63, name: "선박패스(V-Pass) 장치 등의 설치기준 및 운영 등에 관한 고시", api: "https://www.law.go.kr/DRF/lawService.do?target=admrul&ID=2100000264514&type=JSON" },
    { no: 64, name: "수상레저사업장 종사 래프팅가이드 자격관리 규칙",            api: "https://www.law.go.kr/DRF/lawService.do?target=admrul&ID=2100000272918&type=JSON" },
    { no: 65, name: "수색구조수당 지급 규칙",                                     api: "https://www.law.go.kr/DRF/lawService.do?target=admrul&ID=2100000188479&type=JSON" },
    { no: 66, name: "어선 출입항신고 관리 규칙",                                  api: "https://www.law.go.kr/DRF/lawService.do?target=admrul&ID=2100000192325&type=JSON" },
    { no: 67, name: "연안사고 안전관리규정",                                      api: "https://www.law.go.kr/DRF/lawService.do?target=admrul&ID=2100000251878&type=JSON" },
    { no: 68, name: "연안안전지킴이 운영규칙",                                    api: "https://www.law.go.kr/DRF/lawService.do?target=admrul&ID=2100000275534&type=JSON" },
    { no: 69, name: "연안체험활동 안전교육 운영에 관한 규칙",                    api: "https://www.law.go.kr/DRF/lawService.do?target=admrul&ID=2100000215085&type=JSON" },
    { no: 70, name: "공유수면 관리 및 매립에 관한 법률",                         api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=011186&type=JSON" },
    { no: 71, name: "공유수면 관리 및 매립에 관한 법률 시행령",                  api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=011293&type=JSON" },
    { no: 72, name: "공유수면 관리 및 매립에 관한 법률 시행규칙",                api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=011295&type=JSON" },
    { no: 73, name: "마리나항만의 조성 및 관리 등에 관한 법률",                  api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=011016&type=JSON" },
    { no: 74, name: "마리나항만의 조성 및 관리 등에 관한 법률 시행령",           api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=011115&type=JSON" },
    { no: 75, name: "마리나항만의 조성 및 관리 등에 관한 법률 시행규칙",         api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=011114&type=JSON" },
    { no: 76, name: "항만법",                                                     api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=001737&type=JSON" },
    { no: 77, name: "항만법 시행령",                                              api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=005528&type=JSON" },
    { no: 78, name: "항만법 시행규칙",                                            api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=008651&type=JSON" },
    { no: 79, name: "자연유산의 보존 및 활용에 관한 법률",                       api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=014410&type=JSON" },
    { no: 80, name: "자연유산의 보존 및 활용에 관한 법률 시행령",                api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=014653&type=JSON" },
    { no: 81, name: "자연유산의 보존 및 활용에 관한 법률 시행규칙",              api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=014669&type=JSON" },
    { no: 82, name: "경범죄 처벌법",                                              api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=1674&type=JSON" },
    { no: 83, name: "경범죄 처벌법 시행령",                                       api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=2144&type=JSON" },
    { no: 84, name: "경범죄 처벌법 시행규칙",                                     api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=6220&type=JSON" },
    { no: 85, name: "해상교통안전법",                                             api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=014483&type=JSON" },
    { no: 86, name: "해상교통안전법 시행령",                                      api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=014593&type=JSON" },
    { no: 87, name: "해상교통안전법 시행규칙",                                    api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=014619&type=JSON" },
    { no: 88,  name: "유선 및 도선 사업법",                                      api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=1015&type=JSON" },
    { no: 89,  name: "유선 및 도선 사업법 시행령",                                api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=4379&type=JSON" },
    { no: 90,  name: "유선 및 도선 사업법 시행규칙",                              api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=7831&type=JSON" },
    { no: 91,  name: "수산관계법령 위반행위에 대한 행정처분의 기준과 절차에 관한 규칙",       api: "https://www.law.go.kr/DRF/lawService.do?target=eflaw&ID=7545&type=JSON" },
];

main().catch((error) => {
    const details = errorToObject(error);
    console.error(`[치명적 오류] ${JSON.stringify(details)}`);

    try {
        writeJson(DIAGNOSTIC_FILE, {
            version: 1,
            fatalAt: nowIso(),
            fatalError: details,
        });
    } catch {
        // 진단 파일 기록 실패는 원래 오류를 가리지 않습니다.
    }
    process.exit(1);
});
