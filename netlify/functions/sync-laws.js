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
    { no: 46, name: "해양환경관리법 시행령", api: "https://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=010632&type=JSON" }
];

export default async (req, context) => {
    try {
        // [중요] 이름만 전달하여 가장 기본적으로 스토어 열기
        const store = getStore('coast-guard-laws');
        const updatedLaws = [];
        const API_KEY = process.env.LAW_API_KEY || "bck";

        for (const item of LAW_LIST) {
            if (!item.name || !item.api) continue;
            const fetchUrl = item.api.replace('${API_KEY}', API_KEY);

            try {
                const response = await fetch(fetchUrl);
// ... existing code ...
                console.log(`[성공] ${item.name}`);
            } catch (err) {
                console.error(`[에러] ${item.name}: ${err.message}`);
            }
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