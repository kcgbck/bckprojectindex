import os
import requests

# 본인의 법령센터 API URL과 OC값에 맞게 수정하세요.
API_URL = "https://www.law.go.kr/DRF/lawSearch.do?OC=본인OC값&target=law&type=XML"

try:
    response = requests.get(API_URL, timeout=30)
    if response.status_code == 200:
        # data 폴더 생성 및 저장
        os.makedirs("./data", exist_ok=True)
        with open("./data/law_data.xml", "w", encoding="utf-8") as f:
            f.write(response.text)
        print("API 다운로드 성공")
    else:
        print(f"API 오류 코드: {response.status_code}")
except Exception as e:
    print(f"에러 발생: {e}")