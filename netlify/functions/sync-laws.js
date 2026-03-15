import { schedule } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

const LAW_LIST = [
    { no: 1, name: "낚시 관리 및 육성법", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011350&type=JSON" },
    { no: 2, name: "낚시 관리 및 육성법 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011698&type=JSON" },
    { no: 3, name: "낚시 관리 및 육성법 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011692&type=JSON" },
    { no: 4, name: "선박안전 조업규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=007458&type=JSON" },
    { no: 5, name: "선박안전법", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=001742&type=JSON" },
    { no: 6, name: "선박안전법 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=007456&type=JSON" },
    { no: 7, name: "선박안전법 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=003907&type=JSON" },
    { no: 8, name: "선박의 입항 및 출항 등에 관한 법률", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012248&type=JSON" },
    { no: 9, name: "선박의 입항 및 출항 등에 관한 법률 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012344&type=JSON" },
    { no: 10, name: "선박의 입항 및 출항 등에 관한 법률 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012339&type=JSON" },
    { no: 11, name: "선박직원법", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=001739&type=JSON" },
    { no: 12, name: "선박직원법 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=007464&type=JSON" },
    { no: 13, name: "선박직원법 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=003916&type=JSON" },
    { no: 14, name: "선원법", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=001740&type=JSON" },
    { no: 15, name: "선원법 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=007473&type=JSON" },
    { no: 16, name: "선원법 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=003922&type=JSON" },
    { no: 17, name: "수산업법", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=001486&type=JSON" },
    { no: 18, name: "수산업법 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=014396&type=JSON" },
    { no: 19, name: "수산업법 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012248&type=JSON" },
    { no: 20, name: "수산자원관리법", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=010965&type=JSON" },
    { no: 21, name: "수산자원관리법 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011207&type=JSON" },
    { no: 22, name: "수산자원관리법 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011189&type=JSON" },
    { no: 23, name: "수상레저안전법", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=001988&type=JSON" },
    { no: 24, name: "수상레저안전법 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=007562&type=JSON" },
    { no: 25, name: "수상레저안전법 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=004026&type=JSON" },
    { no: 26, name: "수중레저활동의 안전 및 활성화 등에 관한 법률", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012568&type=JSON" },
    { no: 27, name: "수중레저활동의 안전 및 활성화 등에 관한 법률 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012884&type=JSON" },
    { no: 28, name: "수중레저활동의 안전 및 활성화 등에 관한 법률 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012870&type=JSON" },
    { no: 29, name: "어선법", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=001483&type=JSON" },
    { no: 30, name: "어선법 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=007684&type=JSON" },
    { no: 31, name: "어선법 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=004157&type=JSON" },
    { no: 32, name: "어선안전조업 및 어선원의 안전ㆍ보건 증진 등에 관한 법률", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=013575&type=JSON" },
    { no: 33, name: "어선안전조업 및 어선원의 안전ㆍ보건 증진 등에 관한 법률 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=013852&type=JSON" },
    { no: 34, name: "어선안전조업 및 어선원의 안전ㆍ보건 증진 등에 관한 법률 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=013840&type=JSON" },
    { no: 35, name: "어촌·어항법", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=009943&type=JSON" },
    { no: 36, name: "어촌·어항법 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=010070&type=JSON" },
    { no: 37, name: "어촌·어항법 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=010083&type=JSON" },
    { no: 38, name: "해사안전기본법", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=000058&type=JSON" },
    { no: 39, name: "해사안전기본법 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=008667&type=JSON" },
    { no: 40, name: "해사안전기본법 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=005570&type=JSON" },
    { no: 41, name: "해양경비법", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011562&type=JSON" },
    { no: 42, name: "해양경비법 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011677&type=JSON" },
    { no: 43, name: "해양경비법 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011674&type=JSON" },
    { no: 44, name: "해양환경관리법", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=010379&type=JSON" },
    { no: 45, name: "해양환경관리법 시행규칙", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=010636&type=JSON" },
    { no: 46, name: "해양환경관리법 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=010632&type=JSON" },
    { no: 47, name: "수상에서의 수색ㆍ구조 등에 관한 법률", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=977&type=JSON" },
    { no: 48, name: "수상에서의 수색ㆍ구조 등에 관한 법률 시행령", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=3997&type=JSON" },
    { no: 49, name: "수상에서의 수색ㆍ구조 등에 관한 법률 시행규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=7528&type=JSON" },
    { no: 50, name: "수상레저기구의 등록 및 검사에 관한 법률", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=14294&type=JSON" },
    { no: 51, name: "수상레저기구의 등록 및 검사에 관한 법률 시행령", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=14451&type=JSON" },
    { no: 52, name: "수상레저기구의 등록 및 검사에 관한 법률 시행규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=14470&type=JSON" },
    { no: 53, name: "내수면 수상레저활동 안전관리 지원 규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000225134&type=JSON" },
    { no: 54, name: "동력수상레저기구 안전검사 기준", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000225688&type=JSON" },
    { no: 55, name: "서귀포해양경찰서 수상레저활동 금지구역 지정 고시", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000231428&type=JSON" },
    { no: 56, name: "수상레저기구의 종류에 관한 고시", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000249996&type=JSON" },
    { no: 57, name: "수상레저안전업무 처리규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000249826&type=JSON" },
    { no: 58, name: "전기추진 동력수상레저기구 설비기준", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000237242&type=JSON" },
    { no: 59, name: "(제주해양경찰서) 수상레저활동 금지구역 지정 고시", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000230212&type=JSON" },
    { no: 60, name: "해양사고의 조사 및 심판에 관한 법률의 적용대상이 아닌 수상레저기구", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000262268&type=JSON" },
    { no: 61, name: "수중레저 안전관리규정", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000261918&type=JSON" },
    { no: 62, name: "수중레저활동 금지구역 지정 고시", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000186526&type=JSON" },
    { no: 63, name: "수중형 체험활동 안전관리요원 자격 인정단체 지정에 관한 지침", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000275576&type=JSON" },
    { no: 64, name: "불법 외국선박 나포 포상금 지급에 관한 규정", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000246764&type=JSON" },
    { no: 65, name: "불법조업 외국어선 사법처리 절차 등에 관한 규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000181898&type=JSON" },
    { no: 66, name: "서귀포해양경찰서 수상레저활동 금지구역 지정 고시", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000231428&type=JSON" },
    { no: 67, name: "(서귀포해양경찰서) 해양레저활동 허가필요수역 고시", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000224910&type=JSON" },
    { no: 68, name: "선박패스(V-Pass) 장치 등의 설치기준 및 운영 등에 관한 고시", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000264514&type=JSON" },
    { no: 69, name: "수상레저기구의 종류에 관한 고시", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000249996&type=JSON" },
    { no: 70, name: "수상레저사업장 종사 래프팅가이드 자격관리 규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000272918&type=JSON" },
    { no: 71, name: "수상레저안전업무 처리규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000249826&type=JSON" },
    { no: 72, name: "수색구조수당 지급 규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000188479&type=JSON" },
    { no: 73, name: "어선 출입항신고 관리 규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000192325&type=JSON" },
    { no: 74, name: "연안사고 안전관리규정", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000251878&type=JSON" },
    { no: 75, name: "연안안전지킴이 운영규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000275534&type=JSON" },
    { no: 76, name: "연안체험활동 안전교육 운영에 관한 규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=admrul&ID=2100000215085&type=JSON" },
];

export default async (req, context) => {
    try {
        // [중요] 이름만 전달하여 가장 기본적으로 스토어 열기
        const store = getStore('coast-guard-laws');
        const updatedLaws = [];
        const API_KEY = process.env.LAW_API_KEY || "bck";

        // 기존의 1개씩 처리하는 for문을 삭제하고, 10개씩 병렬로 처리하도록 변경합니다.
        const chunkSize = 10; 
        for (let i = 0; i < LAW_LIST.length; i += chunkSize) {
            const chunk = LAW_LIST.slice(i, i + chunkSize);
            
            // 10개의 API 요청을 동시에 생성
            const promises = chunk.map(async (item) => {
                if (!item.name || !item.api) return null;
                const fetchUrl = item.api.replace('${API_KEY}', API_KEY);

                try {
                    const response = await fetch(fetchUrl);
                    if (!response.ok) throw new Error(`${item.name} 응답 에러`);
                    const data = await response.json();
                    
                    const basicInfo = data.Law?.기본정보 || data.EngLaw?.기본정보 || data;
                    console.log(`[성공] ${item.name}`);
                    
                    // 성공 시 데이터 객체 반환
                    return {
                        id: basicInfo?.법령ID || basicInfo?.engLawId || `law_${item.no}`,
                        title: item.name,
                        raw_data: data,
                        lastUpdated: basicInfo?.시행일자 || basicInfo?.enfDt || new Date().toISOString()
                    };
                } catch (err) {
                    console.error(`[에러] ${item.name}: ${err.message}`);
                    return null; // 실패 시 null 반환하여 다른 요청에 영향을 주지 않음
                }
            });

            // 10개의 요청이 모두 완료될 때까지 기다림 (약 1~2초 소요)
            const results = await Promise.all(promises);
            
            // 배열에서 실패한 항목(null)을 제거하고 updatedLaws 배열에 병합
            updatedLaws.push(...results.filter(law => law !== null));
        }

        const version = new Date().toISOString();
        await store.setJSON('metadata', { latestVersion: version });
        await store.setJSON('laws_data', updatedLaws);

        console.log(`[동기화 완료] 버전: ${version}`);
        return new Response("OK", { status: 200 });
    } catch (error) {
        console.error('[치명적 오류]', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};

export const config = {
    schedule: "0 1 * * *"
};
