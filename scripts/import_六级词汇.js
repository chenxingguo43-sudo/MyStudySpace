// Import 43 missing CET-6 Russian vocabulary words into Obsidian vault
const fs = require('fs');
const path = require('path');

const BASE = '俄语笔记库/词汇';

// ── Data for 43 missing words ──
const words = {
  verb: [
    { word: "наста́ивать", meaning: "坚持，主张", theme: "思维情感社交",
      aspect: "несов.", pair: "настоять", case_gov: "на + чём (Предл.)",
      tags: ["六级", "高频动词", "B2"] },
    { word: "сли́пнуться", meaning: "粘在一起", theme: "动作行为",
      aspect: "сов.", pair: "слипаться",
      tags: ["六级", "动词", "B2"] },
    { word: "оде́ться", meaning: "穿好衣服", theme: "日常生活",
      aspect: "сов.", pair: "одеваться",
      tags: ["六级", "动词", "B2"] },
    { word: "дости́чь", meaning: "达到，获得，取得", theme: "动作行为",
      aspect: "сов.", pair: "достигать", case_gov: "чего (Род.)",
      tags: ["六级", "高频动词", "B2"] },
    { word: "соблюда́ться", meaning: "被遵守，被执行", theme: "社会生活",
      aspect: "несов.", pair: "соблюстись",
      tags: ["六级", "动词", "B2"] },
    { word: "возде́йствовать", meaning: "影响，作用", theme: "思维情感社交",
      aspect: "сов. и несов.", case_gov: "на + что (Вин.)",
      tags: ["六级", "动词", "B2"] },
    { word: "постуча́ть", meaning: "敲了敲", theme: "动作行为",
      aspect: "сов.", pair: "стучать",
      tags: ["六级", "动词", "B2"] },
    { word: "извини́ться", meaning: "道歉，请原谅", theme: "思维情感社交",
      aspect: "сов.", pair: "извиняться", case_gov: "перед + кем (Твор.)",
      tags: ["六级", "动词", "B2"] },
    { word: "определя́ть", meaning: "确定，定义，分配", theme: "思维情感社交",
      aspect: "несов.", pair: "определить", case_gov: "что (Вин.)",
      tags: ["六级", "高频动词", "B2"] },
    { word: "поступа́ть", meaning: "行为，做，进入", theme: "动作行为",
      aspect: "несов.", pair: "поступить",
      tags: ["六级", "高频动词", "B2"] },
    { word: "взве́сить", meaning: "称重，权衡", theme: "动作行为",
      aspect: "сов.", pair: "взвешивать", case_gov: "что (Вин.)",
      tags: ["六级", "动词", "B2"] },
    { word: "прису́тствовать", meaning: "出席，存在", theme: "动作行为",
      aspect: "несов.",
      tags: ["六级", "高频动词", "B2"] },
  ],
  noun: [
    { word: "кусо́чек", meaning: "小块，碎片", theme: "日常物品",
      gender: "муж.", tags: ["六级", "名词", "B2"] },
    { word: "счёт", meaning: "计算，账户，比分", theme: "抽象概念",
      gender: "муж.", tags: ["六级", "名词", "B2"] },
    { word: "проду́кты", meaning: "食品，农产品", theme: "日常生活",
      gender: "pl.", tags: ["六级", "名词", "B2"] },
    { word: "жени́х", meaning: "未婚夫，新郎", theme: "人际关系",
      gender: "муж.", animate: true, tags: ["六级", "名词", "B2"] },
    { word: "слу́жба", meaning: "服务，工作，服役", theme: "社会生活",
      gender: "жен.", tags: ["六级", "名词", "B2"] },
    { word: "кровь", meaning: "血，血液", theme: "身体医学",
      gender: "жен.", tags: ["六级", "名词", "B2"] },
    { word: "бой", meaning: "战斗，战役", theme: "军事战争",
      gender: "муж.", tags: ["六级", "名词", "B2"] },
    { word: "генера́л", meaning: "将军", theme: "军事战争",
      gender: "муж.", animate: true, tags: ["六级", "名词", "B2"] },
    { word: "долг", meaning: "职责，债务，义务", theme: "抽象概念",
      gender: "муж.", tags: ["六级", "名词", "B2"] },
    { word: "церемо́ния", meaning: "仪式，典礼", theme: "文化",
      gender: "жен.", tags: ["六级", "名词", "B2"] },
    { word: "гармо́ния", meaning: "和谐，融洽", theme: "抽象概念",
      gender: "жен.", tags: ["六级", "名词", "B2"] },
    { word: "мно́жество", meaning: "许多，大量", theme: "抽象概念",
      gender: "ср.", tags: ["六级", "名词", "B2"] },
    { word: "раскры́тие", meaning: "揭露，展现，启示", theme: "抽象概念",
      gender: "ср.", tags: ["六级", "名词", "B2"] },
    { word: "разнови́дность", meaning: "种类，变体", theme: "抽象概念",
      gender: "жен.", tags: ["六级", "名词", "B2"] },
    { word: "сопровожде́ние", meaning: "伴随，伴奏，护送", theme: "抽象概念",
      gender: "ср.", tags: ["六级", "名词", "B2"] },
    { word: "сочета́ние", meaning: "结合，配合", theme: "抽象概念",
      gender: "ср.", tags: ["六级", "名词", "B2"] },
    { word: "листо́чек", meaning: "小叶子，便条纸", theme: "自然",
      gender: "муж.", tags: ["六级", "名词", "B2"] },
    { word: "пове́рхность", meaning: "表面", theme: "空间方位",
      gender: "жен.", tags: ["六级", "名词", "B2"] },
    { word: "выраже́ние", meaning: "表达，词语", theme: "语言",
      gender: "ср.", tags: ["六级", "名词", "B2"] },
    { word: "наме́рение", meaning: "意图，打算", theme: "思维情感社交",
      gender: "ср.", tags: ["六级", "名词", "B2"] },
    { word: "отве́тственность", meaning: "责任，职责", theme: "抽象概念",
      gender: "жен.", tags: ["六级", "名词", "B2"] },
    { word: "брак", meaning: "婚姻；次品，废品", theme: "社会生活",
      gender: "муж.", tags: ["六级", "名词", "B2"] },
  ],
  adj: [
    { word: "пло́тный", meaning: "密集的，浓厚的，结实的", theme: "描述属性",
      tags: ["六级", "形容词", "B2"] },
    { word: "перечи́сленный", meaning: "被列举的，上述的", theme: "描述属性",
      tags: ["六级", "形容词", "B2"] },
    { word: "определённый", meaning: "确定的，一定的，具体的", theme: "描述属性",
      tags: ["六级", "形容词", "B2"] },
    { word: "со́бственный", meaning: "自己的，本身的", theme: "描述属性",
      tags: ["六级", "形容词", "B2"] },
    { word: "винова́тый", meaning: "有过错的，愧疚的", theme: "人的品质态度",
      tags: ["六级", "形容词", "B2"] },
    { word: "актуа́льный", meaning: "迫切的，现实的，具有现实意义的", theme: "描述属性",
      tags: ["六级", "形容词", "B2"] },
  ],
  adv: [
    { word: "персона́льно", meaning: "亲自，个别地", theme: "方式",
      tags: ["六级", "副词", "B2"] },
    { word: "осо́бенно", meaning: "特别，非常", theme: "程度",
      tags: ["六级", "副词", "B2"] },
  ],
  func: [
    { word: "пусть", meaning: "让，愿，哪怕（语气词）", theme: "功能词",
      tags: ["六级", "功能词", "B2"] },
  ],
};

const typeDirMap = {
  verb: '动词',
  noun: '名词',
  adj: '形容词',
  adv: '副词',
  func: '功能词',
};

const today = new Date().toISOString().slice(0, 10); // 2026-06-03

let created = 0;
let skipped = 0;

for (const [type, entries] of Object.entries(words)) {
  const dir = path.join(BASE, typeDirMap[type]);
  for (const entry of entries) {
    const filePath = path.join(dir, entry.word + '.md');
    if (fs.existsSync(filePath)) {
      console.log('SKIP (exists): ' + filePath);
      skipped++;
      continue;
    }

    let frontmatter = `---
word: "${entry.word}"
type: "${type === 'func' ? 'particle' : type}"
theme: "${entry.theme}"
meaning: "${entry.meaning}"
mastery: 1
tags: ${JSON.stringify(entry.tags)}`;

    if (type === 'verb') {
      if (entry.aspect) frontmatter += `\naspect: "${entry.aspect}"`;
      if (entry.pair) frontmatter += `\npair: "${entry.pair}"`;
      if (entry.case_gov) frontmatter += `\ncase_gov: "${entry.case_gov}"`;
    }
    if (type === 'noun') {
      if (entry.gender) frontmatter += `\ngender: "${entry.gender}"`;
      if (entry.animate) frontmatter += `\nanimate: ${entry.animate}`;
    }

    frontmatter += `\ncreated: "${today}"
---\n`;

    // Markdown body
    let body = `\n\n\n\n# ${entry.word}\n\n`;
    body += `## 📖 释义\n${entry.meaning}\n\n`;
    body += `## ✍️ 例句\n\n`;
    body += `| 俄语 | 中文 |\n`;
    body += `|------|------|\n`;
    body += `| (待补充) | (待补充) |\n`;

    if (type === 'verb') {
      body += `\n## 📐 变位/变格/接格\n`;
      if (entry.case_gov) body += `**接格:** ${entry.case_gov}\n\n`;
      body += `(待补充)\n`;
    }

    if (type === 'verb' && entry.pair) {
      body += `\n## 📚 相关词\n- 配对: [[${entry.pair}]]\n`;
    }

    fs.writeFileSync(filePath, frontmatter + body, 'utf-8');
    console.log('CREATED: ' + filePath);
    created++;
  }
}

console.log(`\nDone: ${created} created, ${skipped} skipped`);
