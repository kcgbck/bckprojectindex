import fs from 'fs';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 타임아웃 포함 fetch 재시도 함수
async function fetchWithRetry(url, maxRetries = 3, delayMs = 2000, timeoutMs = 30000) {
    for (let i = 0; i < maxRetries; i++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timer);
            if (!response.ok) throw new Error(`HTTP 에러: ${response.status}`);
            return await response.json();
        } catch (error) {
            clearTimeout(timer);
            const reason = error.name === 'AbortError' ? '타임아웃(30s)' : error.message;
            console.warn(`[경고] fetch 실패 (재시도 ${i + 1}/${maxRetries}): ${reason}`);
            if (i === maxRetries - 1) throw new Error(reason);
            await delay(delayMs);
        }
    }
}

// 모든 URL을 https://로 통일
const LAW_LIST = [
    { no: 1,  name: "낚시 관리 및 육성법",                                      api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011350&type=JSON" },
    { no: 2,  name: "낚시 관리 및 육성법 시행규칙",                              api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011698&type=JSON" },
    { no: 3,  name: "낚시 관리 및 육성법 시행령",                                api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011692&type=JSON" },
    { no: 4,  name: "선박안전 조업규칙",                                          api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=007458&type=JSON" },
    { no: 5,  name: "선박안전법",                                                 api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=001742&type=JSON" },
    { no: 6,  name: "선박안전법 시행규칙",                                        api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=007456&type=JSON" },
    { no: 7,  name: "선박안전법 시행령",                                          api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=003907&type=JSON" },
    { no: 8,  name: "선박의 입항 및 출항 등에 관한 법률",                        api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012248&type=JSON" },
    { no: 9,  name: "선박의 입항 및 출항 등에 관한 법률 시행규칙",               api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012344&type=JSON" },
    { no: 10, name: "선박의 입항 및 출항 등에 관한 법률 시행령",                 api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012339&type=JSON" },
    { no: 11, name: "선박직원법",                                                 api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=001739&type=JSON" },
    { no: 12, name: "선박직원법 시행규칙",                                        api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=007464&type=JSON" },
    { no: 13, name: "선박직원법 시행령",                                          api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=003916&type=JSON" },
    { no: 14, name: "선원법",                                                     api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=001740&type=JSON" },
    { no: 15, name: "선원법 시행규칙",                                            api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=007473&type=JSON" },
    { no: 16, name: "선원법 시행령",                                              api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=003922&type=JSON" },
    { no: 17, name: "수산업법",                                                   api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=001486&type=JSON" },
    { no: 18, name: "수산업법 시행규칙",                                          api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=014396&type=JSON" },
    { no: 19, name: "수산업법 시행령",                                            api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012248&type=JSON" },
    { no: 20, name: "수산자원관리법",                                             api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=010965&type=JSON" },
    { no: 21, name: "수산자원관리법 시행규칙",                                    api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011207&type=JSON" },
    { no: 22, name: "수산자원관리법 시행령",                                      api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011189&type=JSON" },
    { no: 23, name: "수상레저안전법",                                             api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=001988&type=JSON" },
    { no: 24, name: "수상레저안전법 시행규칙",                                    api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=007562&type=JSON" },
    { no: 25, name: "수상레저안전법 시행령",                                      api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=004026&type=JSON" },
    { no: 26, name: "수중레저활동의 안전 및 활성화 등에 관한 법률",              api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012568&type=JSON" },
    { no: 27, name: "수중레저활동의 안전 및 활성화 등에 관한 법률 시행규칙",     api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012884&type=JSON" },
    { no: 28, name: "수중레저활동의 안전 및 활성화 등에 관한 법률 시행령",       api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012870&type=JSON" },
    { no: 29, name: "어선법",                                                     api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=001483&type=JSON" },
    { no: 30, name: "어선법 시행규칙",                                            api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=007684&type=JSON" },
    { no: 31, name: "어선법 시행령",                                              api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=004157&type=JSON" },
    { no: 32, name: "어선안전조업 및 어선원의 안전ㆍ보건 증진 등에 관한 법률",   api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=013575&type=JSON" },
    { no: 33, name: "어선안전조업 및 어선원의 안전ㆍ보건 증진 등에 관한 법률 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=013852&type=JSON" },
    { no: 34, name: "어선안전조업 및 어선원의 안전ㆍ보건 증진 등에 관한 법률 시행령",   api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=013840&type=JSON" },
    { no: 35, name: "어촌·어항법",                                                api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=009943&type=JSON" },
    { no: 36, name: "어촌·어항법 시행규칙",                                       api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=010070&type=JSON" },
    { no: 37, name: "어촌·어항법 시행령",                                         api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=010083&type=JSON" },
    { no: 38, name: "해사안전기본법",                                             api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=000058&type=JSON" },
    { no: 39, name: "해사안전기본법 시행규칙",                                    api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=008667&type=JSON" },
    { no: 40, name: "해사안전기본법 시행령",                                      api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=005570&type=JSON" },
    { no: 41, name: "해양경비법",                                                 api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011562&type=JSON" },
    { no: 42, name: "해양경비법 시행규칙",                                        api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011677&type=JSON" },
    { no: 43, name: "해양경비법 시행령",                                          api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011674&type=JSON" },
    { no: 44, name: "해양환경관리법",                                             api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=010379&type=JSON" },
    { no: 45, name: "해양환경관리법 시행규칙",                                    api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=010636&type=JSON" },
    { no: 46, name: "해양환경관리법 시행령",                                      api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=010632&type=JSON" },
    { no: 47, name: "수상에서의 수색ㆍ구조 등에 관한 법률",                      api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=977&type=JSON" },
    { no: 48, name: "수상에서의 수색ㆍ구조 등에 관한 법률 시행령",               api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=3997&type=JSON" },
    { no: 49, name: "수상에서의 수색ㆍ구조 등에 관한 법률 시행규칙",             api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=7528&type=JSON" },
    { no: 50, name: "수상레저기구의 등록 및 검사에 관한 법률",                   api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=14294&type=JSON" },
    { no: 51, name: "수상레저기구의 등록 및 검사에 관한 법률 시행령",            api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=14451&type=JSON" },
    { no: 52, name: "수상레저기구의 등록 및 검사에 관한 법률 시행규칙",          api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=14470&type=JSON" },
    { no: 53, name: "내수면 수상레저활동 안전관리 지원 규칙",                    api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000225134&type=JSON" },
    { no: 54, name: "동력수상레저기구 안전검사 기준",                             api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000225688&type=JSON" },
    { no: 55, name: "수상레저기구의 종류에 관한 고시",                            api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000249996&type=JSON" },
    { no: 56, name: "수상레저안전업무 처리규칙",                                  api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000249826&type=JSON" },
    { no: 57, name: "전기추진 동력수상레저기구 설비기준",                         api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000237242&type=JSON" },
    { no: 58, name: "해양사고의 조사 및 심판에 관한 법률의 적용대상이 아닌 수상레저기구", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000262268&type=JSON" },
    { no: 59, name: "수중레저 안전관리규정",                                      api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000261918&type=JSON" },
    { no: 60, name: "수중형 체험활동 안전관리요원 자격 인정단체 지정에 관한 지침", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000275576&type=JSON" },
    { no: 61, name: "불법 외국선박 나포 포상금 지급에 관한 규정",                api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000246764&type=JSON" },
    { no: 62, name: "불법조업 외국어선 사법처리 절차 등에 관한 규칙",            api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000181898&type=JSON" },
    { no: 63, name: "선박패스(V-Pass) 장치 등의 설치기준 및 운영 등에 관한 고시", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000264514&type=JSON" },
    { no: 64, name: "수상레저사업장 종사 래프팅가이드 자격관리 규칙",            api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000272918&type=JSON" },
    { no: 65, name: "수색구조수당 지급 규칙",                                     api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000188479&type=JSON" },
    { no: 66, name: "어선 출입항신고 관리 규칙",                                  api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000192325&type=JSON" },
    { no: 67, name: "연안사고 안전관리규정",                                      api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000251878&type=JSON" },
    { no: 68, name: "연안안전지킴이 운영규칙",                                    api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000275534&type=JSON" },
    { no: 69, name: "연안체험활동 안전교육 운영에 관한 규칙",                    api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000215085&type=JSON" },
    { no: 70, name: "공유수면 관리 및 매립에 관한 법률",                         api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011186&type=JSON" },
    { no: 71, name: "공유수면 관리 및 매립에 관한 법률 시행령",                  api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011293&type=JSON" },
    { no: 72, name: "공유수면 관리 및 매립에 관한 법률 시행규칙",                api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011295&type=JSON" },
    { no: 73, name: "마리나항만의 조성 및 관리 등에 관한 법률",                  api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011016&type=JSON" },
    { no: 74, name: "마리나항만의 조성 및 관리 등에 관한 법률 시행령",           api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011115&type=JSON" },
    { no: 75, name: "마리나항만의 조성 및 관리 등에 관한 법률 시행규칙",         api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011114&type=JSON" },
    { no: 76, name: "항만법",                                                     api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=001737&type=JSON" },
    { no: 77, name: "항만법 시행령",                                              api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=005528&type=JSON" },
    { no: 78, name: "항만법 시행규칙",                                            api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=008651&type=JSON" },
    { no: 79, name: "자연유산의 보존 및 활용에 관한 법률",                       api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=014410&type=JSON" },
    { no: 80, name: "자연유산의 보존 및 활용에 관한 법률 시행령",                api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=014653&type=JSON" },
    { no: 81, name: "자연유산의 보존 및 활용에 관한 법률 시행규칙",              api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=014669&type=JSON" },
    { no: 82, name: "경범죄 처벌법",                                              api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=1674&type=JSON" },
    { no: 83, name: "경범죄 처벌법 시행령",                                       api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=2144&type=JSON" },
    { no: 84, name: "경범죄 처벌법 시행규칙",                                     api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=6220&type=JSON" },
];

async function main() {
    console.log("데이터 동기화 시작...");
    const updatedLaws = [];
    const failedLaws = [];

    // 청크 5개씩 순차 처리 (Rate Limit 방지)
    const chunkSize = 5;

    for (let i = 0; i < LAW_LIST.length; i += chunkSize) {
        const chunk = LAW_LIST.slice(i, i + chunkSize);

        // 청크 내에서는 300ms 간격으로 순차 실행
        for (const item of chunk) {
            if (!item.name || !item.api) continue;
            try {
                const data = await fetchWithRetry(item.api, 3, 2000, 30000);
                const basicInfo = data.Law?.기본정보 || data.EngLaw?.기본정보 || data;
                console.log(`[성공] ${item.name}`);
                updatedLaws.push({
                    id: basicInfo?.법령ID || basicInfo?.engLawId || `law_${item.no}`,
                    title: item.name,
                    raw_data: data,
                    lastUpdated: basicInfo?.시행일자 || basicInfo?.enfDt || new Date().toISOString().split('T')[0]
                });
            } catch (err) {
                console.error(`[최종 에러] ${item.name}: ${err.message}`);
                failedLaws.push(item.name);
            }
            await delay(300);
        }

        // 청크 간 대기 (Rate Limit 해제)
        if (i + chunkSize < LAW_LIST.length) {
            console.log(`[대기] 다음 청크까지 3초 대기...`);
            await delay(3000);
        }
    }

    // 결과 집계 출력
    const total = LAW_LIST.length;
    const successCount = updatedLaws.length;
    const failCount = failedLaws.length;
    const successRate = Math.round((successCount / total) * 100);

    console.log(`\n========== 동기화 결과 ==========`);
    console.log(`총 ${total}개 중 ${successCount}개 성공 (${successRate}%), ${failCount}개 실패`);

    if (failedLaws.length > 0) {
        console.log(`\n[실패 목록]`);
        failedLaws.forEach(name => console.log(`  - ${name}`));
    }

    // laws_data.json 저장 (성공한 것만)
    const version = new Date().toISOString();
    fs.writeFileSync('./laws_data.json', JSON.stringify({
        metadata: { latestVersion: version, successCount, failCount, successRate },
        data: updatedLaws
    }, null, 2), 'utf-8');
    console.log(`\n[저장 완료] laws_data.json (버전: ${version})`);

    // 실패 목록을 파일로 저장 (워크플로에서 이슈 생성에 활용)
    if (failedLaws.length > 0) {
        fs.writeFileSync('./laws_fetch_failures.json', JSON.stringify({
            date: new Date().toISOString(),
            total,
            successCount,
            failCount,
            successRate,
            failedLaws
        }, null, 2), 'utf-8');
        console.log(`[실패 기록] laws_fetch_failures.json 저장됨`);
    }

    // 성공률 50% 미만이면 워크플로 실패 처리
    if (successRate < 50) {
        console.error(`\n❌ 성공률 ${successRate}%로 기준치(50%) 미달. 워크플로를 실패 처리합니다.`);
        process.exit(1);
    }
}

main().catch(err => {
    console.error('[치명적 오류]', err);
    process.exit(1);
});
