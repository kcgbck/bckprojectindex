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
    { no: 48, name: "수상에서의 수색ㆍ구조 등에 관한 법률 시행령", api: "
