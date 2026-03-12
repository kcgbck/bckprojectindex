import { schedule } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

/* =========================================================================
   [관리자 서버: 자동 업데이트 스케줄러]
   - 매일 새벽 1시에 자동으로 실행됩니다.
   - 아래 LAW_LIST에 입력된 API 목록을 순회하며 데이터를 수집합니다.
========================================================================= */

// ▼ 직접 확인하신 원본 주소 리스트 (빈칸은 자동 무시됨)
const LAW_LIST = [
    { no: 1, name: "낚시 관리 및 육성법", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011350&type=JSON" },
    { no: 2, name: "낚시 관리 및 육성법 시행규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011698&type=JSON" },
    { no: 3, name: "낚시 관리 및 육성법 시행령", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011692&type=JSON" },
    { no: 4, name: "선박안전 조업규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=007458&type=JSON" },
    { no: 5, name: "선박안전법", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=001742&type=JSON" },
    { no: 6, name: "선박안전법 시행규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=007456&type=JSON" },
    { no: 7, name: "선박안전법 시행령", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=003907&type=JSON" },
    { no: 8, name: "선박의 입항 및 출항 등에 관한 법률", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012248&type=JSON" },
    { no: 9, name: "선박의 입항 및 출항 등에 관한 법률 시행규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012344&type=JSON" },
    { no: 10, name: "선박의 입항 및 출항 등에 관한 법률 시행령", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012339&type=JSON" },
    { no: 11, name: "선박직원법", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=001739&type=JSON" },
    { no: 12, name: "선박직원법 시행규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=007464&type=JSON" },
    { no: 13, name: "선박직원법 시행령", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=003916&type=JSON" },
    { no: 14, name: "선원법", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=001740&type=JSON" },
    { no: 15, name: "선원법 시행규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=007473&type=JSON" },
    { no: 16, name: "선원법 시행령", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=003922&type=JSON" },
    { no: 17, name: "수산업법", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=001486&type=JSON" },
    { no: 18, name: "수산업법 시행규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=014396&type=JSON" },
    { no: 19, name: "수산업법 시행령", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012248&type=JSON" },
    { no: 20, name: "수산자원관리법", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=010965&type=JSON" },
    { no: 21, name: "수산자원관리법 시행규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011207&type=JSON" },
    { no: 22, name: "수산자원관리법 시행령", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011189&type=JSON" },
    { no: 23, name: "수상레저안전법", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=001988&type=JSON" },
    { no: 24, name: "수상레저안전법 시행규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=007562&type=JSON" },
    { no: 25, name: "수상레저안전법 시행령", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=004026&type=JSON" },
    { no: 26, name: "수중레저활동의 안전 및 활성화 등에 관한 법률", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012568&type=JSON" },
    { no: 27, name: "수중레저활동의 안전 및 활성화 등에 관한 법률 시행규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012884&type=JSON" },
    { no: 28, name: "수중레저활동의 안전 및 활성화 등에 관한 법률 시행령", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=012870&type=JSON" },
    { no: 29, name: "어선법", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=001483&type=JSON" },
    { no: 30, name: "어선법 시행규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=007684&type=JSON" },
    { no: 31, name: "어선법 시행령", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=004157&type=JSON" },
    { no: 32, name: "어선안전조업 및 어선원의 안전ㆍ보건 증진 등에 관한 법률", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=013575&type=JSON" },
    { no: 33, name: "어선안전조업 및 어선원의 안전ㆍ보건 증진 등에 관한 법률 시행규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=013852&type=JSON" },
    { no: 34, name: "어선안전조업 및 어선원의 안전ㆍ보건 증진 등에 관한 법률 시행령", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=013840&type=JSON" },
    { no: 35, name: "어촌·어항법", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=009943&type=JSON" },
    { no: 36, name: "어촌·어항법 시행규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=010070&type=JSON" },
    { no: 37, name: "어촌·어항법 시행령", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=010083&type=JSON" },
    { no: 38, name: "해사안전기본법", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=000058&type=JSON" },
    { no: 39, name: "해사안전기본법 시행규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=008667&type=JSON" },
    { no: 40, name: "해사안전기본법 시행령", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=005570&type=JSON" },
    { no: 41, name: "해양경비법", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011562&type=JSON" },
    { no: 42, name: "해양경비법 시행규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011677&type=JSON" },
    { no: 43, name: "해양경비법 시행령", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=011674&type=JSON" },
    { no: 44, name: "해양환경관리법", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=010379&type=JSON" },
    { no: 45, name: "해양환경관리법 시행규칙", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=010636&type=JSON" },
    { no: 46, name: "해양환경관리법 시행령", api: "http://www.law.go.kr/DRF/lawService.do?OC=bck&target=eflaw&ID=010632&type=JSON" },
    { no: 47, name: "", api: "" },
    { no: 48, name: "", api: "" },
    { no: 49, name: "", api: "" },
    { no: 50, name: "", api: "" }
];

export const handler = schedule("0 1 * * *", async (event) => {
    // Netlify 환경 변수에 등록된 국가법령정보센터 API 키 (현재는 URL에 하드코딩된 'bck'를 사용 중이므로 필수값은 아닙니다)
    const API_KEY = process.env.LAW_API_KEY || "bck"; 

    try {
        const store = getStore('coast-guard-laws');
        const updatedLaws = [];

        // 50개 목록을 하나씩 확인합니다.
        for (const item of LAW_LIST) {
            // [허수 처리 로직] 법령명이나 api 주소가 비어있으면 실행하지 않고 다음 번호로 넘어갑니다.
            if (!item.name || !item.api || item.name.trim() === "" || item.api.trim() === "") {
                continue; // 건너뛰기
            }

            // api 문자열 안에 ${API_KEY}가 포함되어 있다면 실제 보안 키 값으로 바꿉니다.
            const fetchUrl = item.api.replace('${API_KEY}', API_KEY);

            try {
                const response = await fetch(fetchUrl);
                if (!response.ok) throw new Error(`${item.name} API 호출 실패`);
                
                const data = await response.json();
                
                // 상세조회 API 구조에 맞춘 파싱 로직
                const basicInfo = data.Law?.기본정보 || data.EngLaw?.기본정보 || data;
                const lawId = basicInfo?.법령ID || basicInfo?.engLawId || `custom_law_${item.no}`;
                const lastUpdated = basicInfo?.시행일자 || basicInfo?.enfDt || new Date().toISOString().split('T')[0];
                
                updatedLaws.push({
                    id: lawId,
                    title: item.name,
                    content: `${item.name}의 상세 데이터가 캐싱되었습니다.`, // 실제 앱에서 본문이 필요할 경우 수정 필요
                    raw_data: data, // 앱에서 조문 등을 파싱할 수 있게 원본 JSON 통째로 캐싱
                    lastUpdated: lastUpdated
                });

                console.log(`[성공] ${item.no}번 ${item.name} 가져오기 완료`);
                
            } catch (err) {
                console.error(`[실패] ${item.no}번 ${item.name} 데이터를 가져오는 중 에러 발생:`, err.message);
                // 에러가 나더라도 서버가 멈추지 않고 다음 번호 법령을 계속 다운로드합니다.
            }
        }

        // 서버 시간(버전) 기록 및 저장
        const newVersion = new Date().toISOString();
        await store.setJSON('metadata', { latestVersion: newVersion });
        await store.setJSON('laws_data', updatedLaws);

        console.log(`[완료] 총 ${updatedLaws.length}개의 법령 데이터 동기화 완료 (버전: ${newVersion})`);
        return { statusCode: 200, body: "데이터 동기화 완료" };

    } catch (error) {
        console.error('[치명적 에러] 전체 스케줄러 실행 실패:', error);
        return { statusCode: 500, body: error.message };
    }
});