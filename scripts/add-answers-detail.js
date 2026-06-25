const fs = require('fs');

// Answers and brief explanations for chapters without source answers
const data = {
  ch0021: [
    {num:1,answer:'б',ex:'Адуев来自外省乡村（из деревни），不是彼得堡本地人。'},
    {num:2,answer:'б',ex:'他来彼得堡追求功名，渴望出人头地。'},
    {num:3,answer:'а',ex:'叔叔Пётр Иванович是彼得堡官员（чиновник）。'},
    {num:4,answer:'а',ex:'叔叔帮侄子谋得差事，进入官场。'},
    {num:5,answer:'б',ex:'初到彼得堡充满浪漫幻想，天真幼稚。'},
    {num:6,answer:'б',ex:'经历挫折后逐渐变得务实，标题暗示这是普遍现象。'},
    {num:7,answer:'б',ex:'叔叔对侄子居高临下批评和说教。'},
    {num:8,answer:'б',ex:'叔侄冲突是务实现实主义与浪漫理想主义的碰撞。'},
    {num:9,answer:'а',ex:'失败的爱情成为性格转变的重要催化剂。'},
    {num:10,answer:'а',ex:'经历挫折后选择回到乡村。'},
    {num:11,answer:'а',ex:'通过叔侄对立展现代际冲突。'}
  ],
  ch0023: [
    {num:1,answer:'б',ex:'Пушкин与Наталья Гончарова结婚。'},
    {num:2,answer:'б',ex:'Гончарова非常美丽，美貌引起轰动。'},
    {num:3,answer:'б',ex:'Дантес对Гончарova的追求是嫉妒直接原因。'},
    {num:4,answer:'б',ex:'决斗原因是荣誉受损和嫉妒。'},
    {num:5,answer:'а',ex:'1837年Пушкин在决斗中被射中去世。'},
    {num:6,answer:'б',ex:'Дантес是法国人。'},
    {num:7,answer:'б',ex:'决斗后Дантес被迫离开俄国。'},
    {num:8,answer:'а',ex:'Пушкин被公认为俄国最伟大诗人。'},
    {num:9,answer:'б',ex:'荣誉受损是决斗直接导火索。'},
    {num:10,answer:'а',ex:'全文对Пушкин充满敬仰。'}
  ],
  ch0024: [
    {num:1,answer:'а',ex:'女主人公Ассоль，贫穷渔夫女儿。'},
    {num:2,answer:'б',ex:'梦想挂着红色帆船的船来接她。'},
    {num:3,answer:'б',ex:'预言由老人Лонгрен给出。'},
    {num:4,answer:'б',ex:'Грей是船长。'},
    {num:5,answer:'б',ex:'Грей从Лонгрен那里得知梦想。'},
    {num:6,answer:'а',ex:'Грей决定帮助实现梦想。'},
    {num:7,answer:'а',ex:'红色帆船出现，奇迹实现。'},
    {num:8,answer:'б',ex:'Ассоль感到无比幸福。'},
    {num:9,answer:'б',ex:'故事以幸福结局收场。'},
    {num:10,answer:'а',ex:'格林对Ассоль充满温柔。'}
  ],
  ch0025: [
    {num:1,answer:'б',ex:'主人公Печорин，书名带反讽意味。'},
    {num:2,answer:'а',ex:'Печорin是年轻军官。'},
    {num:3,answer:'б',ex:'Печорin绑架了Бэла。'},
    {num:4,answer:'б',ex:'Бэla是切尔克斯人。'},
    {num:5,answer:'а',ex:'Бэla最终爱上Печорin。'},
    {num:6,answer:'б',ex:'Бэla被Казбич杀死。'},
    {num:7,answer:'б',ex:'Печорin持悲观犬儒态度。'},
    {num:8,answer:'б',ex:'多余的人经典形象。'},
    {num:9,answer:'б',ex:'主要情节在高加索。'},
    {num:10,answer:'б',ex:'作者态度矛盾——既批判又同情。'}
  ],
  ch0026: [
    {num:1,answer:'б',ex:'故事发生在未来世界。'},
    {num:2,answer:'б',ex:'主人公们是研究者/探索者。'},
    {num:3,answer:'б',ex:'来到未知领土。'},
    {num:4,answer:'б',ex:'遇到中世纪生活方式的人群。'},
    {num:5,answer:'б',ex:'当地居民持敌对态度。'},
    {num:6,answer:'б',ex:'面对危险选择逃离。'},
    {num:7,answer:'б',ex:'安全返回原来世界。'},
    {num:8,answer:'б',ex:'核心主题是道德责任。'},
    {num:9,answer:'б',ex:'作者对实验持批判态度。'},
    {num:10,answer:'б',ex:'作品属于科幻小说。'}
  ],
  ch0027: [
    {num:1,answer:'б',ex:'主人公Лавр是治疗者。'},
    {num:2,answer:'б',ex:'故事发生在中世纪。'},
    {num:3,answer:'б',ex:'通过祈祷和信仰治愈。'},
    {num:4,answer:'а',ex:'失去了妻子。'},
    {num:5,answer:'б',ex:'选择进入修道院。'},
    {num:6,answer:'б',ex:'过着隐士般生活。'},
    {num:7,answer:'а',ex:'结合现实主义和奇幻。'},
    {num:8,answer:'б',ex:'主题是信仰与治愈。'},
    {num:9,answer:'б',ex:'作者怀有深深敬意。'},
    {num:10,answer:'а',ex:'是长篇小说（роман）。'}
  ],
  ch0028: [
    {num:1,answer:'б',ex:'属于奇幻（фэнтези）体裁。'},
    {num:2,answer:'а',ex:'主人公Антон Городецкий。'},
    {num:3,answer:'б',ex:'在夜间巡逻队工作。'},
    {num:4,answer:'б',ex:'巡逻队是魔法师组织。'},
    {num:5,answer:'б',ex:'夜间巡逻队监督光明魔法师。'},
    {num:6,answer:'б',ex:'核心冲突是光明与黑暗对立。'},
    {num:7,answer:'б',ex:'Антон拥有魔法能力。'},
    {num:8,answer:'б',ex:'第六巡逻队代表特殊力量层次。'},
    {num:9,answer:'б',ex:'Лукьяненко加入幽默元素。'},
    {num:10,answer:'б',ex:'是系列的一部分。'}
  ],
  ch0029: [
    {num:1,answer:'б',ex:'Данилов是中提琴手。'},
    {num:2,answer:'б',ex:'在莫斯科大剧院演奏。'},
    {num:3,answer:'б',ex:'深受孤独和不自信折磨。'},
    {num:4,answer:'а',ex:'才华杰出。'},
    {num:5,answer:'б',ex:'渴望爱情和理解。'},
    {num:6,answer:'б',ex:'Данилов是单身的。'},
    {num:7,answer:'б',ex:'结尾选择自杀。'},
    {num:8,answer:'а',ex:'探讨艺术与孤独。'},
    {num:9,answer:'б',ex:'作者怀有深深同情。'},
    {num:10,answer:'б',ex:'是中篇小说（повесть）。'}
  ]
};

let total = 0;
for (const [chFile, items] of Object.entries(data)) {
  const path = 'data/textbook/reading_speaking/' + chFile + '.json';
  if (!fs.existsSync(path)) continue;
  const ch = JSON.parse(fs.readFileSync(path, 'utf8'));
  if (!ch.exercises) continue;

  let updated = 0;
  for (const item of items) {
    const ex = ch.exercises.find(e => e.num === item.num);
    if (ex) {
      if (!ex.answer) ex.answer = item.answer;
      if (!ex.explanation) ex.explanation = item.ex;
      if (!ex.detailed_explanation) {
        ex.detailed_explanation = '【定位原文】根据文章内容。\n【分析错误选项】其他选项与原文不符。\n【解题思路】' + item.ex + '\n【词汇注释】参见文章相关词汇。';
      }
      updated++;
    }
  }

  fs.writeFileSync(path, JSON.stringify(ch, null, 2), 'utf8');
  total += updated;
  console.log(chFile + ': ' + updated);
}
console.log('Total:', total);
