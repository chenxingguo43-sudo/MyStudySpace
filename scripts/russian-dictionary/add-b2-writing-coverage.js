const fs = require('node:fs');
const path = require('node:path');

const entries = {
  'авиаперелета': { meaning: '航空旅行、航班（第二格）', type: 'noun' },
  'английского': { meaning: '英国的、英语的（第二格）', type: 'adj' },
  'бакалавриата': { meaning: '本科阶段、学士教育（第二格）', type: 'noun' },
  'гарантируются': { meaning: '被保障、得到保证', type: 'verb' },
  'дизайна': { meaning: '设计、设计方案（第二格）', type: 'noun' },
  'завершите': { meaning: '请完成、结束（命令式）', type: 'verb' },
  'зарекомендовала': { meaning: '表现出、证明自己是（阴性过去时）', type: 'verb' },
  'заявителя': { meaning: '申请人（第二格）', type: 'noun' },
  'интересуешься': { meaning: '你对……感兴趣', type: 'verb' },
  'консульско-протокольного': { meaning: '领事与礼宾事务的（第二格）', type: 'adj' },
  'летию': { meaning: '周年、纪念日（第三格）', type: 'noun' },
  'магистратуре': { meaning: '硕士阶段、硕士项目（第六格）', type: 'noun' },
  'магистратуры': { meaning: '硕士阶段、硕士项目（第二格）', type: 'noun' },
  'менеджмент': { meaning: '管理学、管理', type: 'noun' },
  'обнаружены': { meaning: '被发现、查出（复数短尾被动形动词）', type: 'participle' },
  'отводится': { meaning: '被安排、被分配（时间/位置）', type: 'verb' },
  'оцените': { meaning: '请评价、评估（命令式）', type: 'verb' },
  'письмо-поздравление': { meaning: '贺信、祝贺信', type: 'noun' },
  'письмо-рекомендация': { meaning: '推荐信', type: 'noun' },
  'письмо-характеристика': { meaning: '介绍信、鉴定信', type: 'noun' },
  'подтверждаемый': { meaning: '被证明的、被确认的', type: 'participle' },
  'предлагаются': { meaning: '被提供、被建议', type: 'verb' },
  'приглашающую': { meaning: '邀请的（阴性第四格）', type: 'participle' },
  'продолжается': { meaning: '继续、持续进行', type: 'verb' },
  'проживанием': { meaning: '居住、住宿（第五格）', type: 'noun' },
  'реквизиты': { meaning: '正式文书要素；机构信息', type: 'noun' },
  'стажировкой': { meaning: '实习（第五格）', type: 'noun' },
  'фитотерапии': { meaning: '植物疗法、草药疗法（第二/第三/第六格）', type: 'noun' },
  'экопоселение': { meaning: '生态社区、生态村', type: 'noun' }
};

function addB2WritingCoverage(root = path.resolve(__dirname, '..', '..')) {
  const filePath = path.join(root, 'data', 'external-vocab.json');
  const vocabulary = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  Object.assign(vocabulary, entries);
  fs.writeFileSync(filePath, `${JSON.stringify(vocabulary, null, 2)}\n`, 'utf8');
  return Object.keys(entries).length;
}

if (require.main === module) {
  process.stdout.write(`Added ${addB2WritingCoverage()} B2 writing lookup entries.\n`);
}

module.exports = { addB2WritingCoverage, entries };
