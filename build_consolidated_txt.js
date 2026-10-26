const fs = require('fs');
const path = require('path');

const lawsTxtDir = path.join(__dirname, 'laws_txt');
const outDir = path.join(__dirname, 'laws_consolidated');

// 최대 크기 6.4 MB (6.5 MB 미만 보장)
const MAX_PART_SIZE_BYTES = 6.4 * 1024 * 1024;

if (!fs.existsSync(lawsTxtDir)) {
  console.error('[FAIL] laws_txt 디렉터리가 존재하지 않습니다.');
  process.exit(1);
}

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
} else {
  // 기존 파일 정리
  for (const f of fs.readdirSync(outDir)) {
    if (f.endsWith('.txt')) {
      fs.unlinkSync(path.join(outDir, f));
    }
  }
}

// update_laws.js에서 LAW_LIST 로드
const updateScriptPath = path.join(__dirname, 'update_laws.js');
const updateScript = fs.readFileSync(updateScriptPath, 'utf8');
const match = updateScript.match(/const LAW_LIST = (\[[\s\S]*?\n\]);/);
let LAW_LIST = [];
if (match) {
  try {
    LAW_LIST = eval(match[1]);
  } catch (e) {
    console.warn('[WARN] LAW_LIST 평가 실패:', e.message);
  }
}

function classifyLawType(name) {
  const norm = name.trim();
  if (norm.endsWith('조례') || norm.includes('조례')) return '자치법규';
  if (norm.endsWith('시행령') || norm.includes('시행령')) return '시행령';
  if (norm.endsWith('시행규칙') || norm.includes('시행규칙')) return '시행규칙';
  if (norm.endsWith('훈령') || norm.endsWith('예규') || norm.endsWith('고시') || norm.endsWith('공고') || norm.endsWith('지침')) return '행정규칙';
  if (norm.endsWith('법') || norm.endsWith('법률')) return '법률';
  return '기타규정';
}

const categoryMap = {
  '법률': '01_법률_통합본.txt',
  '시행령': '02_시행령_통합본.txt',
  '시행규칙': '03_시행규칙_통합본.txt',
  '행정규칙': '04_행정규칙_고시_훈령_통합본.txt',
  '기타규정': '05_기타규정_자치법규_통합본.txt',
  '자치법규': '05_기타규정_자치법규_통합본.txt'
};

const bundles = {
  '01_법률_통합본.txt': [],
  '02_시행령_통합본.txt': [],
  '03_시행규칙_통합본.txt': [],
  '04_행정규칙_고시_훈령_통합본.txt': [],
  '05_기타규정_자치법규_통합본.txt': []
};

// LAW_LIST 순서대로 수집된 txt 파일 번들링
const lawListNames = new Set();
for (const item of LAW_LIST) {
  lawListNames.add(item.name);
  const filePath = path.join(lawsTxtDir, `${item.name}.txt`);
  if (!fs.existsSync(filePath)) continue;

  const content = fs.readFileSync(filePath, 'utf8').trim();
  if (!content) continue;

  const cat = classifyLawType(item.name);
  const bundleFileName = categoryMap[cat] || '05_기타규정_자치법규_통합본.txt';

  const section = [
    '================================================================================',
    `【법령명】 ${item.name} (No. ${item.no})`,
    `【분류】 ${cat}`,
    '================================================================================',
    '',
    content,
    '',
    ''
  ].join('\n');

  bundles[bundleFileName].push(section);
}

// 혹시 LAW_LIST에 없지만 laws_txt에 있는 파일도 누락 없이 번들링
const allTxtFiles = fs.readdirSync(lawsTxtDir).filter(f => f.endsWith('.txt'));
for (const file of allTxtFiles) {
  const name = path.basename(file, '.txt');
  if (lawListNames.has(name)) continue;

  const filePath = path.join(lawsTxtDir, file);
  const content = fs.readFileSync(filePath, 'utf8').trim();
  if (!content) continue;

  const cat = classifyLawType(name);
  const bundleFileName = categoryMap[cat] || '05_기타규정_자치법규_통합본.txt';

  const section = [
    '================================================================================',
    `【법령명】 ${name}`,
    `【분류】 ${cat}`,
    '================================================================================',
    '',
    content,
    '',
    ''
  ].join('\n');

  bundles[bundleFileName].push(section);
}

console.log('=== [통합 법령집 생성 시작 (NotebookLM 소스용, 파일당 최대 6.5 MB 분할)] ===');
let totalBundledLaws = 0;
let totalCreatedFiles = 0;

for (const [baseFileName, sections] of Object.entries(bundles)) {
  const parts = [];
  let currentPart = [];
  let currentBytes = 0;

  for (const sec of sections) {
    const secBytes = Buffer.byteLength(sec, 'utf8') + 1;
    if (currentPart.length > 0 && currentBytes + secBytes > MAX_PART_SIZE_BYTES) {
      parts.push(currentPart);
      currentPart = [sec];
      currentBytes = secBytes;
    } else {
      currentPart.push(sec);
      currentBytes += secBytes;
    }
  }
  if (currentPart.length > 0) {
    parts.push(currentPart);
  }

  for (let i = 0; i < parts.length; i++) {
    const fileName = parts.length > 1
      ? baseFileName.replace('.txt', `_${String(i + 1).padStart(2, '0')}.txt`)
      : baseFileName;

    const outPath = path.join(outDir, fileName);
    const combined = parts[i].join('\n');
    fs.writeFileSync(outPath, combined, 'utf8');

    const sizeMb = (Buffer.byteLength(combined, 'utf8') / (1024 * 1024)).toFixed(2);
    console.log(`- ${fileName}: ${parts[i].length}개 법령 포함 (${sizeMb} MB)`);
    totalBundledLaws += parts[i].length;
    totalCreatedFiles++;
  }
}

console.log(`\n[완료] 총 ${totalBundledLaws}개 법령을 ${totalCreatedFiles}개 분할 통합 파일로 생성 완료 (모든 파일 6.5 MB 이하 보장)`);
