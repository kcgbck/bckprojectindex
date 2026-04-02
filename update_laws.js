import fs from 'fs';

// 지정된 시간(ms)만큼 대기하는 헬퍼 함수
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 재시도 로직이 포함된 fetch 함수 (시간 단축용)
 */
async function fetchWithRetry(url, maxRetries = 2, delayMs = 300) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP 상태 코드 에러: ${response.status}`);
            }
            // JSON이 아닌 HTML 원본 소스코드를 텍스트로 반환
            return await response.text();
        } catch (error) {
            console.warn(`[경고] fetch 실패 (재시도 ${i + 1}/${maxRetries}): ${error.message}`);
            if (i === maxRetries - 1) {
                throw error; // 최대 재시도 횟수 초과 시 최종 에러
            }
            await delay(delayMs); // 단축된 고정 대기 시간 사용
        }
    }
}

const LAW_LIST = [
    { no: 1, name: "낚시 관리 및 육성법", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011350&type=HTML" },
    { no: 2, name: "낚시 관리 및 육성법 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011698&type=HTML" },
    { no: 3, name: "낚시 관리 및 육성법 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011692&type=HTML" },
    { no: 4, name: "선박안전 조업규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=007458&type=HTML" },
    { no: 5, name: "선박안전법", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=001742&type=HTML" },
    { no: 6, name: "선박안전법 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=007456&type=HTML" },
    { no: 7, name: "선박안전법 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=003907&type=HTML" },
    { no: 8, name: "선박의 입항 및 출항 등에 관한 법률", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012248&type=HTML" },
    { no: 9, name: "선박의 입항 및 출항 등에 관한 법률 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012344&type=HTML" },
    { no: 10, name: "선박의 입항 및 출항 등에 관한 법률 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012339&type=HTML" },
    { no: 11, name: "선박직원법", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=001739&type=HTML" },
    { no: 12, name: "선박직원법 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=007464&type=HTML" },
    { no: 13, name: "선박직원법 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=003916&type=HTML" },
    { no: 14, name: "선원법", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=001740&type=HTML" },
    { no: 15, name: "선원법 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=007473&type=HTML" },
    { no: 16, name: "선원법 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=003922&type=HTML" },
    { no: 17, name: "수산업법", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=001486&type=HTML" },
    { no: 18, name: "수산업법 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=014396&type=HTML" },
    { no: 19, name: "수산업법 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012248&type=HTML" },
    { no: 20, name: "수산자원관리법", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=010965&type=HTML" },
    { no: 21, name: "수산자원관리법 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011207&type=HTML" },
    { no: 22, name: "수산자원관리법 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011189&type=HTML" },
    { no: 23, name: "수상레저안전법", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=001988&type=HTML" },
    { no: 24, name: "수상레저안전법 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=007562&type=HTML" },
    { no: 25, name: "수상레저안전법 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=004026&type=HTML" },
    { no: 26, name: "수중레저활동의 안전 및 활성화 등에 관한 법률", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012568&type=HTML" },
    { no: 27, name: "수중레저활동의 안전 및 활성화 등에 관한 법률 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012884&type=HTML" },
    { no: 28, name: "수중레저활동의 안전 및 활성화 등에 관한 법률 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012870&type=HTML" },
    { no: 29, name: "어선법", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=001483&type=HTML" },
    { no: 30, name: "어선법 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=007684&type=HTML" },
    { no: 31, name: "어선법 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=004157&type=HTML" },
    { no: 32, name: "어선안전조업 및 어선원의 안전ㆍ보건 증진 등에 관한 법률", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=013575&type=HTML" },
    { no: 33, name: "어선안전조업 및 어선원의 안전ㆍ보건 증진 등에 관한 법률 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=013852&type=HTML" },
    { no: 34, name: "어선안전조업 및 어선원의 안전ㆍ보건 증진 등에 관한 법률 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=013840&type=HTML" },
    { no: 35, name: "어촌·어항법", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=009943&type=HTML" },
    { no: 36, name: "어촌·어항법 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=010070&type=HTML" },
    { no: 37, name: "어촌·어항법 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=010083&type=HTML" },
    { no: 38, name: "해사안전기본법", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=000058&type=HTML" },
    { no: 39, name: "해사안전기본법 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=008667&type=HTML" },
    { no: 40, name: "해사안전기본법 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=005570&type=HTML" },
    { no: 41, name: "해양경비법", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011562&type=HTML" },
    { no: 42, name: "해양경비법 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011677&type=HTML" },
    { no: 43, name: "해양경비법 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011674&type=HTML" },
    { no: 44, name: "해양환경관리법", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=010379&type=HTML" },
    { no: 45, name: "해양환경관리법 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=010636&type=HTML" },
    { no: 46, name: "해양환경관리법 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=010632&type=HTML" },
    { no: 47, name: "수상에서의 수색ㆍ구조 등에 관한 법률", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=977&type=HTML" },
    { no: 48, name: "수상에서의 수색ㆍ구조 등에 관한 법률 시행령", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=3997&type=HTML" },
    { no: 49, name: "수상에서의 수색ㆍ구조 등에 관한 법률 시행규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=7528&type=HTML" },
    { no: 50, name: "수상레저기구의 등록 및 검사에 관한 법률", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=14294&type=HTML" },
    { no: 51, name: "수상레저기구의 등록 및 검사에 관한 법률 시행령", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=14451&type=HTML" },
    { no: 52, name: "수상레저기구의 등록 및 검사에 관한 법률 시행규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=14470&type=HTML" },
    { no: 53, name: "내수면 수상레저활동 안전관리 지원 규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000225134&type=HTML" },
    { no: 54, name: "동력수상레저기구 안전검사 기준", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000225688&type=HTML" },
    { no: 55, name: "수상레저기구의 종류에 관한 고시", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000249996&type=HTML" },
    { no: 56, name: "수상레저안전업무 처리규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000249826&type=HTML" },
    { no: 57, name: "전기추진 동력수상레저기구 설비기준", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000237242&type=HTML" },
    { no: 58, name: "해양사고의 조사 및 심판에 관한 법률의 적용대상이 아닌 수상레저기구", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000262268&type=HTML" },
    { no: 59, name: "수중레저 안전관리규정", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000261918&type=HTML" },
    { no: 60, name: "수중형 체험활동 안전관리요원 자격 인정단체 지정에 관한 지침", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000275576&type=HTML" },
    { no: 61, name: "불법 외국선박 나포 포상금 지급에 관한 규정", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000246764&type=HTML" },
    { no: 62, name: "불법조업 외국어선 사법처리 절차 등에 관한 규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000181898&type=HTML" },
    { no: 63, name: "선박패스(V-Pass) 장치 등의 설치기준 및 운영 등에 관한 고시", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000264514&type=HTML" },
    { no: 64, name: "수상레저사업장 종사 래프팅가이드 자격관리 규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000272918&type=HTML" },
    { no: 65, name: "수색구조수당 지급 규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000188479&type=HTML" },
    { no: 66, name: "어선 출입항신고 관리 규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000192325&type=HTML" },
    { no: 67, name: "연안사고 안전관리규정", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000251878&type=HTML" },
    { no: 68, name: "연안안전지킴이 운영규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000275534&type=HTML" },
    { no: 69, name: "연안체험활동 안전교육 운영에 관한 규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000215085&type=HTML" },
    { no: 70, name: "공유수면 관리 및 매립에 관한 법률", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011186&type=HTML" },
    { no: 71, name: "공유수면 관리 및 매립에 관한 법률 시행령", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011293&type=HTML" },
    { no: 72, name: "공유수면 관리 및 매립에 관한 법률 시행규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011295&type=HTML" },
    { no: 73, name: "마리나항만의 조성 및 관리 등에 관한 법률", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011016&type=HTML" },
    { no: 74, name: "마리나항만의 조성 및 관리 등에 관한 법률 시행령", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011115&type=HTML" },
    { no: 75, name: "마리나항만의 조성 및 관리 등에 관한 법률 시행규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011114&type=HTML" },
    { no: 76, name: "항만법", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=001737&type=HTML" },
    { no: 77, name: "항만법 시행령", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=005528&type=HTML" },
    { no: 78, name: "항만법 시행규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=008651&type=HTML" },
    { no: 79, name: "자연유산의 보존 및 활용에 관한 법률", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=014410&type=HTML" },
    { no: 80, name: "자연유산의 보존 및 활용에 관한 법률 시행령", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=014653&type=HTML" },
    { no: 81, name: "자연유산의 보존 및 활용에 관한 법률 시행규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=014669&type=HTML" }
];

async function main() {
    try {
        console.log("데이터 동기화 시작...");
        const updatedLaws = [];
        // GitHub Actions 환경에서는 process.env.LAW_API_KEY를 Secret으로 등록해야 합니다.
        const API_KEY = process.env.LAW_API_KEY || "bck";
        
        // 청크 크기를 20개로 늘림
        const chunkSize = 20; 
        
        for (let i = 0; i < LAW_LIST.length; i += chunkSize) {
            const chunk = LAW_LIST.slice(i, i + chunkSize);
            
            const promises = chunk.map(async (item, index) => {
                if (!item.name || !item.api) return null;
                const fetchUrl = item.api.replace('${API_KEY}', API_KEY);
                
                await delay(index * 50); 
                try {
                    // 1. 껍데기 HTML 수집
                    const wrapperData = await fetchWithRetry(fetchUrl, 2, 300);
                    let finalHtml = wrapperData;
                    
                    // 2. 껍데기 HTML에서 실제 법령 내용이 담긴 iframe 주소(src)를 정규식으로 추출
                    const iframeMatch = wrapperData.match(/src\s*=\s*["']([^"']+)["']/i);
                    
                    if (iframeMatch && iframeMatch[1]) {
                        let innerUrl = iframeMatch[1].replace(/&amp;/g, '&');
                        
                        // 추출된 주소가 상대경로일 경우 도메인 강제 결합
                        if (innerUrl.startsWith('/')) {
                            innerUrl = 'https://www.law.go.kr' + innerUrl;
                        }
                        
                        // 3. 진짜 알맹이 주소로 다시 요청하여 상세 HTML 가져오기 (API 과부하 방지 위해 50ms 대기)
                        await delay(50);
                        const innerData = await fetchWithRetry(innerUrl, 2, 300);
                        
                        // 4. 모바일 앱이나 웹에서 <base> 태그가 없으면 CSS와 법령 간 링크가 깨지므로 강제 주입
                        if (/<head>/i.test(innerData)) {
                            finalHtml = innerData.replace(/<head>/i, '<head><base href="https://www.law.go.kr">');
                        } else {
                            finalHtml = '<base href="https://www.law.go.kr">' + innerData;
                        }
                    }
                    
                    console.log(`[성공] ${item.name} (알맹이 HTML 수집 완료)`);
                    
                    const urlIdMatch = item.api.match(/ID=([0-9a-zA-Z]+)/);
                    const lawId = urlIdMatch ? urlIdMatch[1] : `law_${item.no}`;
                    
                    return {
                        id: lawId,
                        title: item.name,
                        html_content: finalHtml, // 진짜 알맹이 HTML 저장
                        lastUpdated: new Date().toISOString().split('T')[0]
                    };
                } catch (err) {
                    console.error(`[최종 에러] ${item.name}: ${err.message}`);
                    return null; 
                }
            });
            
            const results = await Promise.all(promises);
            updatedLaws.push(...results.filter(law => law !== null));
            
            if (i + chunkSize < LAW_LIST.length) {
                await delay(200); 
            }
        }
        
        const version = new Date().toISOString();
        const finalData = {
            metadata: { latestVersion: version },
            data: updatedLaws 
        };

        // GitHub 저장소 안에 laws_data.json 파일로 저장
        fs.writeFileSync('./laws_data.json', JSON.stringify(finalData, null, 2), 'utf-8');
        console.log(`[동기화 완료] 버전: ${version}, 총 ${updatedLaws.length}개 법령 처리됨`);

    } catch (error) {
        console.error('[치명적 오류]', error);
        process.exit(1); 
    }
}

main();
