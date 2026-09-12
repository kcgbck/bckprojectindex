const fs = require('fs');
const path = require('path');

// 1. update_laws.js에서 LAW_LIST 로드
const updateScriptPath = path.join(__dirname, 'update_laws.js');
if (!fs.existsSync(updateScriptPath)) {
  console.error('[FAIL] update_laws.js 파일을 찾을 수 없습니다.');
  process.exit(1);
}

const updateScript = fs.readFileSync(updateScriptPath, 'utf8');
const match = updateScript.match(/const LAW_LIST = (\[[\s\S]*?\n\]);/);
if (!match) {
  console.error('[FAIL] update_laws.js에서 LAW_LIST를 파싱할 수 없습니다.');
  process.exit(1);
}

let LAW_LIST;
try {
  LAW_LIST = eval(match[1]);
} catch (e) {
  console.error('[FAIL] LAW_LIST 평가 실패:', e.message);
  process.exit(1);
}

console.log(`=== [법령 데이터 무결성 검증 시작] (총 ${LAW_LIST.length}개 대상) ===\n`);

// 정규화 헬퍼 (공백 및 특수문자 제거하여 비교)
function normalizeTitle(title) {
  if (!title) return '';
  return title.replace(/\s+/g, '').replace(/[\(\)\[\]\{\}\·\ㆍ]/g, '').trim();
}

function extractLawTitle(data) {
  if (!data) return '';
  const raw = data.raw_data || data.raw || data;
  if (raw.Law && raw.Law.기본정보 && raw.Law.기본정보.법령명_한글) {
    return raw.Law.기본정보.법령명_한글;
  }
  if (raw['법령'] && raw['법령'].기본정보 && raw['법령'].기본정보.법령명_한글) {
    return raw['법령'].기본정보.법령명_한글;
  }
  if (raw.AdmRulService && raw.AdmRulService.행정규칙기본정보 && raw.AdmRulService.행정규칙기본정보.행정규칙명) {
    return raw.AdmRulService.행정규칙기본정보.행정규칙명;
  }
  if (data.title) {
    return data.title;
  }
  return '';
}

function classifyLawType(name) {
  const norm = name.trim();
  if (norm.endsWith('시행령') || norm.includes('시행령')) return '시행령';
  if (norm.endsWith('시행규칙') || norm.includes('시행규칙')) return '시행규칙';
  if (norm.endsWith('훈령') || norm.endsWith('예규') || norm.endsWith('고시') || norm.endsWith('공고') || norm.endsWith('지침')) return '행정규칙';
  if (norm.endsWith('법') || norm.endsWith('법률')) return '법률';
  return '기타규정';
}

let hasError = false;
const stats = {
  total: LAW_LIST.length,
  jsonMatched: 0,
  jsonMissing: 0,
  jsonMismatch: 0,
  txtMatched: 0,
  txtMissing: 0,
  txtMismatch: 0,
  categories: {}
};

// 1. LAW_LIST 중복 및 분류 검사
const nameSet = new Set();
for (const item of LAW_LIST) {
  if (nameSet.has(item.name)) {
    console.error(`[WARN] LAW_LIST에 중복된 법령명이 있습니다: ${item.name}`);
    hasError = true;
  }
  nameSet.add(item.name);
  const cat = classifyLawType(item.name);
  stats.categories[cat] = (stats.categories[cat] || 0) + 1;
}

// 2. laws_data.json 로드 및 인덱싱
const jsonPath = path.join(__dirname, 'laws_data.json');
const jsonMap = new Map();

if (fs.existsSync(jsonPath)) {
  try {
    const rawJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const entries = Array.isArray(rawJson.data) 
      ? rawJson.data 
      : (rawJson.data ? Object.values(rawJson.data) : Object.values(rawJson));

    for (const entry of entries) {
      if (entry && entry.title) {
        jsonMap.set(normalizeTitle(entry.title), entry);
      }
    }
    console.log(`[OK] laws_data.json 로드 성공 (등록 법령 수: ${jsonMap.size})`);
  } catch (e) {
    console.error(`[FAIL] laws_data.json 파싱 실패: ${e.message}`);
    hasError = true;
  }
} else {
  console.error('[FAIL] laws_data.json 파일이 존재하지 않습니다.');
  hasError = true;
}

// 3. laws_txt 폴더 검증
const txtDir = path.join(__dirname, 'laws_txt');
if (!fs.existsSync(txtDir)) {
  console.error('[FAIL] laws_txt 폴더가 존재하지 않습니다.');
  hasError = true;
}

for (const item of LAW_LIST) {
  const normExpected = normalizeTitle(item.name);

  // JSON 대조
  const lawEntry = jsonMap.get(normExpected);
  if (!lawEntry) {
    console.error(`  ❌ [JSON 누락] '${item.name}' 엔트리가 laws_data.json에 없습니다.`);
    stats.jsonMissing++;
    hasError = true;
  } else {
    const actualTitle = extractLawTitle(lawEntry);
    const normActual = normalizeTitle(actualTitle);
    if (!normActual.includes(normExpected) && !normExpected.includes(normActual)) {
      console.error(`  ❌ [JSON 불일치] '${item.name}' -> 실제 반환 법령명: '${actualTitle}'`);
      stats.jsonMismatch++;
      hasError = true;
    } else {
      stats.jsonMatched++;
    }
  }

  // TXT 파일 대조
  const txtPath = path.join(txtDir, `${item.name}.txt`);
  if (!fs.existsSync(txtPath)) {
    console.error(`  ❌ [TXT 누락] 파일 없음: laws_txt/${item.name}.txt`);
    stats.txtMissing++;
    hasError = true;
  } else {
    const statsInfo = fs.statSync(txtPath);
    if (statsInfo.size === 0) {
      console.error(`  ❌ [TXT 빈 파일] laws_txt/${item.name}.txt 크기가 0바이트입니다.`);
      stats.txtMismatch++;
      hasError = true;
    } else {
      const content = fs.readFileSync(txtPath, 'utf8');
      const firstLine = content.split('\n')[0] || '';
      const normFirstLine = normalizeTitle(firstLine);
      if (!normFirstLine.includes(normExpected) && !normExpected.includes(normFirstLine)) {
        console.error(`  ❌ [TXT 제목 불일치] '${item.name}.txt' 1행 제목: '${firstLine.trim()}'`);
        stats.txtMismatch++;
        hasError = true;
      } else {
        stats.txtMatched++;
      }
    }
  }
}

console.log('\n=== [검증 결과 통계] ===');
console.log(`- 대상 법령 수: ${stats.total}개`);
const catStr = Object.entries(stats.categories).map(([k, v]) => `${k} ${v}개`).join(', ');
console.log(`- 체계 분류: ${catStr}`);
console.log(`- laws_data.json 일치: ${stats.jsonMatched}/${stats.total} (누락: ${stats.jsonMissing}, 불일치: ${stats.jsonMismatch})`);
console.log(`- laws_txt/*.txt 일치: ${stats.txtMatched}/${stats.total} (누락: ${stats.txtMissing}, 불일치: ${stats.txtMismatch})`);

if (hasError) {
  console.log('\n❌ [검증 실패] 데이터 불일치 또는 누락이 발견되었습니다.');
  process.exit(1);
} else {
  console.log('\n✅ [검증 통과] 94개 모든 법령의 설정, JSON 데이터, 개별 TXT 파일이 100% 정상 일치합니다.');
  process.exit(0);
}
