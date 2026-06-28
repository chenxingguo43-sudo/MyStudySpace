const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..', 'B2口语素材');

// Mapping: old section → new standardized section
const mapping = {
  // Already standard — keep
  '场景对话': '场景对话',
  '核心句型': '核心句型',
  '词汇小灶': '词汇小灶',
  '表达技巧': '表达技巧',
  '素材更新': '素材更新',

  // 场景对话 variants
  '新增场景对话': '场景对话',
  '【你的发言】': '场景对话',
  '【对方应答】': '场景对话',
  '场景对话：旅行·出行': '场景对话',
  '场景对话：情绪表达': '场景对话',
  '场景对话：饮食·健康·生活习惯': '场景对话',
  '场景对话：天气·季节': '场景对话',
  'B3. 主题讨论练习（社会话题）': '场景对话',

  // 核心句型 variants
  '核心句型：情绪表达': '核心句型',
  '核心句型：饮食·健康·生活习惯': '核心句型',
  '核心句型：语言学习与交流技巧': '核心句型',
  '核心句型：计划与未来安排': '核心句型',
  '核心句型：兴趣爱好·文化·科技': '核心句型',
  'A1. 表达观点': '核心句型',
  'A2. 同意与不同意': '核心句型',
  'A3. 假设与推测': '核心句型',
  'A4. 比较与对比': '核心句型',
  'A5. 话语连接词（B2评分重点！）': '核心句型',
  'A6. 交际策略（当不知道怎么说时）': '核心句型',
  'C. 追问题句': '核心句型',
  'B1. 叙述模板（独白描述 — 说2-3分钟）': '核心句型',
  'B2. 文字场景描述练习（替代看图说话）': '核心句型',
  '◆ 日常寒暄与关心问候': '核心句型',
  '◆ 天气与出行相关': '核心句型',
  '◆ 情绪表达与共情互动': '核心句型',
  '◆ 饮食相关': '核心句型',
  '◆ 宠物相关': '核心句型',
  '◆ 日常起居与生活琐事': '核心句型',
  '◆ 学习与考试相关': '核心句型',
  '◆ 计划与未来安排': '核心句型',
  '▶ 物品丢失与沮丧表达': '核心句型',
  '▶ 朋友日常闲聊类（平级朋友，ты形式，口语化）': '核心句型',
  '▶ 看书': '核心句型',
  '▶ 俄语表达"笑"': '核心句型',
  '▶ 中文学习讨论': '核心句型',
  '▶ 学习计划与考试安排': '核心句型',
  '▶ 旅游与出行计划': '核心句型',
  '▶ 备考安排通知（老师发来的俄语）': '核心句型',
  '▶ 拖延症与立即行动': '核心句型',
  '▶ 同场景拓展句': '核心句型',

  // 词汇小灶 variants
  '词汇小灶：日常起居': '词汇小灶',
  '词汇小灶：饮食·健康·生活习惯': '词汇小灶',
  '词汇小灶：旅行·出行': '词汇小灶',
  '词汇小灶：家庭·朋友': '词汇小灶',
  '词汇小灶：工作·职业': '词汇小灶',
  '词汇小灶：天气·季节': '词汇小灶',
  '词汇小灶：兴趣爱好·文化·科技': '词汇小灶',
  '词汇小灶：计划与未来': '词汇小灶',
  '词汇小灶：语言学习': '词汇小灶',
  '词汇小灶：情绪表达': '词汇小灶',
  'C2. 中国学生常读错重音的50个高频词': '词汇小灶',
  'C3. 口语高频易错重音词（精选20个 — B2口语必备）': '词汇小灶',

  // 表达技巧 variants
  '表达技巧：日常起居话题': '表达技巧',
  '表达技巧：饮食·健康话题': '表达技巧',
  '表达技巧：工作话题': '表达技巧',
  '表达技巧：天气话题': '表达技巧',
  '表达技巧：旅行话题': '表达技巧',
  '表达技巧：家庭·朋友话题': '表达技巧',
  '表达技巧：兴趣·文化话题': '表达技巧',
  '表达技巧：计划·未来话题': '表达技巧',
  '表达技巧：语言学习话题': '表达技巧',
  '表达技巧：情绪表达话题': '表达技巧',
  '表达技巧：宠物话题': '表达技巧',
  'C1. 重音规则速查': '表达技巧',
  '推荐练习计划': '表达技巧',
};

const stats = {};
let updated = 0;

function walk(d) {
  for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
    if (entry.isDirectory()) walk(path.join(d, entry.name));
    else if (entry.name.endsWith('.md') && !entry.name.includes('章节索引')) {
      const filePath = path.join(d, entry.name);
      let raw = fs.readFileSync(filePath, 'utf8');

      const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
      if (!fmMatch) continue;
      const fm = fmMatch[1];

      const secMatch = fm.match(/^section: "(.+)"$/m);
      if (!secMatch) continue;

      const oldSection = secMatch[1];
      const newSection = mapping[oldSection];
      if (!newSection || newSection === oldSection) continue; // no change needed

      // Track
      const key = `${oldSection} → ${newSection}`;
      stats[key] = (stats[key] || 0) + 1;

      // Replace section
      let newFm = fm.replace(
        /^section: ".+"$/m,
        'section: "' + newSection + '"'
      );

      // Update tags[0] to match new section
      const tagsMatch = fm.match(/^tags: \[(.+)\]$/m);
      if (tagsMatch) {
        const oldTags = tagsMatch[1];
        const tagParts = oldTags.split(',').map(t => t.trim().replace(/"/g, ''));
        tagParts[0] = newSection;
        const newTags = '[' + tagParts.map(t => '"' + t + '"').join(', ') + ']';
        newFm = newFm.replace(/^tags: \[.+\]$/m, 'tags: ' + newTags);
      }

      raw = raw.replace(fm, newFm);
      fs.writeFileSync(filePath, raw, 'utf8');
      updated++;
    }
  }
}
walk(baseDir);

console.log(`=== 统一 section 命名完成 ===`);
console.log(`更新笔记: ${updated} 条\n`);
for (const [key, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${count.toString().padStart(4)}  ${key}`);
}
