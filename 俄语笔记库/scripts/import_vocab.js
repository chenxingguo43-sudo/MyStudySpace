const fs = require('fs');
const path = require('path');

const outputDir = path.resolve(__dirname, '..', '词汇');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const today = new Date().toISOString().slice(0, 10);

// ── 名词 ──
const nouns = [
  ["совещание", "会议,商议", "neuter", false],
  ["снижение", "降低,减少,下降", "neuter", false],
  ["гонка", "比赛,竞速", "feminine", false],
  ["тренер", "教练", "masculine", true],
  ["катание", "滑行,溜冰", "neuter", false],
  ["вклад", "贡献,存款", "masculine", false],
  ["процветание", "繁荣,兴旺", "neuter", false],
  ["политик", "政治家,政客", "masculine", true],
  ["фонд", "基金,资金", "masculine", false],
  ["приз", "奖品,奖项", "masculine", false],
  ["фестиваль", "节日,艺术节", "masculine", false],
  ["новизна", "新颖,新奇性", "feminine", false],
  ["покраска", "涂漆,粉刷", "feminine", false],
  ["труд", "劳动,工作", "masculine", false],
  ["команда", "队伍,团队,命令", "feminine", false],
  ["титул", "头衔,称号", "masculine", false],
  ["коллектив", "集体,团队", "masculine", false],
  ["сцена", "舞台,场景", "feminine", false],
  ["степь", "草原", "feminine", false],
  ["село", "村庄", "neuter", false],
  ["общество", "社会,协会", "neuter", false],
  ["количество", "数量", "neuter", false],
  ["оттенок", "色调,细微差别", "masculine", false],
  ["средство", "手段,方法,资金", "neuter", false],
  ["национальность", "民族,国籍", "feminine", false],
  ["понятие", "概念,理解", "neuter", false],
  ["развитие", "发展,发育", "neuter", false],
  ["отношение", "态度,关系", "neuter", false],
  ["экипаж", "乘务组,机组", "masculine", false],
  ["финиш", "终点", "masculine", false],
  ["победитель", "胜利者", "masculine", true],
  ["скала", "岩石,悬崖", "feminine", false],
  ["степень", "程度,等级", "feminine", false],
  ["жилище", "住所,住宅", "neuter", false],
  ["власть", "权力,政权", "feminine", false],
  ["творчество", "创作,创造力", "neuter", false],
  ["рефлекс", "反射", "masculine", false],
  ["согласие", "同意,一致", "neuter", false],
  ["заповедник", "自然保护区", "masculine", false],
  ["растение", "植物", "neuter", false],
  ["генерация", "一代,产生", "feminine", false],
  ["столетие", "世纪,百年", "neuter", false],
  ["полоса", "条纹,地带", "feminine", false],
  ["опасность", "危险", "feminine", false],
  ["просьба", "请求,恳求", "feminine", false],
  ["лагерь", "营地,阵营", "masculine", false],
  ["свет", "光,世界", "masculine", false],
  ["частица", "粒子,颗粒", "feminine", false],
  ["аспирант", "博士研究生", "masculine", true],
  ["срок", "期限,日期", "masculine", false],
  ["сопротивление", "抵抗,阻力", "neuter", false],
  ["солнце", "太阳", "neuter", false],
  ["течение", "潮流,过程", "neuter", false],
  ["формат", "格式,规格", "masculine", false],
  ["супруг", "配偶(丈夫/妻子)", "masculine", true],
  ["учреждение", "机构,设施", "neuter", false],
  ["металл", "金属", "masculine", false],
  ["штора", "窗帘", "feminine", false],
  ["предостережение", "警告,防备", "neuter", false],
  ["работодатель", "雇主", "masculine", true],
  ["зверёк", "小动物", "masculine", true],
  ["режим", "制度,模式", "masculine", false],
  ["голосование", "投票,表决", "neuter", false],
  ["таблетка", "药片", "feminine", false],
  ["передача", "传递,电视/广播节目", "feminine", false],
  ["реклама", "广告", "feminine", false],
  ["агент", "代理人", "masculine", true],
  ["заявление", "声明,申请书", "neuter", false],
];

// ── 动词 ──
const verbs = [
  ["поставить", "放置,建立,提出", "perfective", "ставить"],
  ["отправиться", "出发,动身前往", "perfective", "отправляться"],
  ["представить", "提交,展示,想象", "perfective", "представлять"],
  ["потребовать", "要求,需要", "perfective", "требовать"],
  ["доставлять", "投递,运送,带来", "imperfective", "доставить"],
  ["окутать", "笼罩,包住", "perfective", "окутывать"],
  ["различать", "区分,辨别", "imperfective", "различить"],
  ["предоставлять", "提供,给予", "imperfective", "предоставить"],
  ["исчезать", "消失,失踪", "imperfective", "исчезнуть"],
  ["утверждать", "肯定,断言,批准", "imperfective", "утвердить"],
  ["праздновать", "庆祝,过节", "imperfective", "отпраздновать"],
  ["провести", "进行,度过", "perfective", "проводить"],
  ["обосноваться", "定居,安家", "perfective", "обосновываться"],
  ["достигать", "达到,获得", "imperfective", "достигнуть"],
  ["обитать", "居住,栖息", "imperfective", ""],
  ["приписать", "添写上,归因于", "perfective", "приписывать"],
  ["спорить", "争论,辩论", "imperfective", "поспорить"],
  ["ограничиться", "局限于", "perfective", "ограничиваться"],
  ["надоесть", "厌烦,讨厌", "perfective", "надоедать"],
  ["заметить", "注意到,发现", "perfective", "замечать"],
  ["поддерживать", "支持,支撑,维持,维护", "imperfective", "поддержать"],
];


function slug(word) {
  return word.replace(/[\\/:*?"<>|]/g, '-');
}

function writeNoun(entry) {
  const [word, meaning, gender, animate] = entry;
  const safe = slug(word);
  const fileName = `${safe}.md`;
  const filePath = path.join(outputDir, fileName);

  const animateStr = animate ? 'true' : 'false';

  const content = `---
word: "${word}"
type: "noun"
meaning: "${meaning}"
mastery: 1
tags: ["名词", "生词"]
gender: "${gender}"
animate: ${animateStr}
created: ${today}
---

# ${word}

## 释义
${meaning}

## 性
${gender} | 有生命: ${animate ? '是' : '否'}

## 例句

## 变格
-
`;

  // Check if file already exists
  if (fs.existsSync(filePath)) {
    console.log(`  SKIP (exists): ${fileName}`);
    return;
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  OK: ${fileName}`);
}

function writeVerb(entry) {
  const [word, meaning, aspect, pair] = entry;
  const safe = slug(word);
  const fileName = `${safe}.md`;
  const filePath = path.join(outputDir, fileName);

  const pairLine = pair ? `pair: "${pair}"` : 'pair: ""';

  const content = `---
word: "${word}"
type: "verb"
meaning: "${meaning}"
mastery: 1
tags: ["动词", "生词"]
aspect: "${aspect}"
${pairLine}
created: ${today}
---

# ${word}

## 释义
${meaning}

## 体
${aspect === 'perfective' ? '完成体 (CB)' : '未完成体 (HCB)'}${pair ? ` | 对应体: ${pair}` : ''}

## 例句

## 变位/接格
-
`;

  if (fs.existsSync(filePath)) {
    console.log(`  SKIP (exists): ${fileName}`);
    return;
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  OK: ${fileName}`);
}

console.log('=== 名词 ===');
nouns.forEach(writeNoun);
console.log(`名词: ${nouns.length} 个`);

console.log('=== 动词 ===');
verbs.forEach(writeVerb);
console.log(`动词: ${verbs.length} 个`);

console.log('\nDone. Output dir:', outputDir);
