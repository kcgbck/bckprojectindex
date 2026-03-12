import { getStore } from '@netlify/blobs';

/* =========================================================================
   [클라이언트 API 서버]
   - 제작하실 앱(웹/안드로이드/iOS)에서 이 서버로 fetch()를 요청하여 데이터를 가져갑니다.
========================================================================= */

export default async (req, context) => {
    // CORS 설정 (외부 앱에서 호출 허용)
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    try {
        const store = getStore('coast-guard-laws');
        // V2에서는 req.url을 파싱하여 경로를 가져옵니다.
        const url = new URL(req.url);
        const path = url.pathname; 

        // 1. 버전 확인 (/api/check-update 로 호출될 때)
        if (path.includes('/check-update')) {
            const meta = await store.getJSON('metadata');
            return new Response(JSON.stringify({ latestVersion: meta?.latestVersion || null }), {
                status: 200,
                headers
            });
        }

        // 2. 전체 데이터 가져오기 (/api/get-all-laws 로 호출될 때)
        if (path.includes('/get-all-laws')) {
            const meta = await store.getJSON('metadata');
            const data = await store.getJSON('laws_data');
            return new Response(JSON.stringify({
                version: meta?.latestVersion || null,
                data: data || []
            }), {
                status: 200,
                headers
            });
        }

        return new Response(JSON.stringify({ message: '잘못된 API 엔드포인트입니다.' }), { status: 404, headers });

    } catch (error) {
        console.error('API 에러 발생:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
    }
};