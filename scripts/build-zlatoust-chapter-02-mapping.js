const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const textbookRoot = path.join(repoRoot, 'data', 'textbook', 'zlatoust_grammar');
const theoryRoot = path.join(textbookRoot, 'theory');
const chapter = JSON.parse(fs.readFileSync(path.join(textbookRoot, 'ch0001.json'), 'utf8'));

const sectionSources = {
  '2.1': { printed: [98, 99], pdf: [100, 101] },
  '2.2': { printed: [99], pdf: [101] },
  '2.3': { printed: [100], pdf: [102] },
  '2.4': { printed: [101, 102, 103], pdf: [103, 104, 105] },
  '2.4.1': { printed: [101], pdf: [103] },
  '2.4.2': { printed: [102, 103], pdf: [104, 105] },
  '2.5': { printed: [103, 104, 105], pdf: [105, 106, 107] },
  '2.6': { printed: [105, 106], pdf: [107, 108] },
  '2.7': { printed: [106, 107], pdf: [108, 109] },
  '2.8': { printed: [107], pdf: [109] }
};

const ruleCatalog = {
  'gl2-2.1-sodeistvovat-v-prep': { sectionId: '2.1', titleZh: 'содействовать + в + 第六格', sourceText: '2.1 表列出 содействовать кому, чему; в чём。' },
  'gl2-2.1-miritsya-s-inst': { sectionId: '2.1', titleZh: 'мириться + с + 第五格', sourceText: '2.1 表列出 мириться / примириться с кем; с чем。' },
  'gl2-2.1-predpochitat-acc-dat': { sectionId: '2.1', titleZh: 'предпочитать + 第四格 + 第三格', sourceText: '2.1 表列出 предпочитать кого, что; кому, чему。' },
  'gl2-2.1-uprekat-acc-v-prep': { sectionId: '2.1', titleZh: 'упрекать + 第四格 + в + 第六格', sourceText: '2.1 表列出 упрекать кого; в чём。' },
  'gl2-2.1-dostigat-gen': { sectionId: '2.1', titleZh: 'достигать + 第二格', sourceText: '2.1 表列出 достигать / достичь чего。' },
  'gl2-2.1-izbegat-gen': { sectionId: '2.1', titleZh: 'избегать + 第二格', sourceText: '2.1 表列出 избегать кого, чего。' },
  'gl2-2.1-obizhatsya-na-acc': { sectionId: '2.1', titleZh: 'обижаться + на + 第四格', sourceText: '2.1 表列出 обижаться / обидеться на кого, на что。' },
  'gl2-2.1-vliyat-na-acc': { sectionId: '2.1', titleZh: 'влиять + на + 第四格', sourceText: '2.1 表列出 влиять / повлиять на кого, на что。' },
  'gl2-2.1-polagatsya-na-acc': { sectionId: '2.1', titleZh: 'полагаться + на + 第四格', sourceText: '2.1 表列出 полагаться / положиться на кого, на что。' },
  'gl2-2.1-smeyatsya-nad-inst': { sectionId: '2.1', titleZh: 'смеяться + над + 第五格', sourceText: '2.1 表列出 смеяться / посмеяться над кем, над чем。' },
  'gl2-2.1-uchit-acc-dat': { sectionId: '2.1', titleZh: 'учить + 第四格 + 第三格', sourceText: '2.1 表列出 учить / научить кого; чему。' },
  'gl2-2.1-porazhat-acc-inst': { sectionId: '2.1', titleZh: 'поражать + 第四格 + 第五格', sourceText: '2.1 表列出 поражать / поразить кого; чем。' },
  'gl2-2.1-slivatsya-s-inst': { sectionId: '2.1', titleZh: 'сливаться + с + 第五格', sourceText: '2.1 表列出 сливаться / слиться с чем。' },
  'gl2-2.1-protivostoyat-dat': { sectionId: '2.1', titleZh: 'противостоять + 第三格', sourceText: '2.1 表列出 противостоять кому, чему。' },
  'gl2-2.1-sootvetstvovat-dat': { sectionId: '2.1', titleZh: 'соответствовать + 第三格', sourceText: '2.1 表列出 соответствовать чему。' },
  'gl2-2.1-priderzhivatsya-gen': { sectionId: '2.1', titleZh: 'придерживаться + 第二格', sourceText: '2.1 表列出 придерживаться / придержаться чего。' },
  'gl2-2.1-privykat-k-dat': { sectionId: '2.1', titleZh: 'привыкать + к + 第三格', sourceText: '2.1 表列出 привыкать / привыкнуть к кому, к чему。' },
  'gl2-2.1-napominat-acc-acc': { sectionId: '2.1', titleZh: 'напоминать + 第四格', sourceText: '2.1 表列出 напоминать / напомнить кого, что; чем。' },
  'gl2-2.1-prisposablivatsya-k-dat': { sectionId: '2.1', titleZh: 'приспосабливаться + к + 第三格', sourceText: '2.1 表列出 приспосабливаться / приспособиться к чему。' },
  'gl2-2.1-otlichatsya-inst': { sectionId: '2.1', titleZh: 'отличаться + 第五格', sourceText: '2.1 表列出 отличаться чем。' },
  'gl2-2.1-verit-v-acc': { sectionId: '2.1', titleZh: 'верить + в + 第四格', sourceText: '2.1 表列出 верить / поверить в кого, во что。' },
  'gl2-2.1-verit-dat': { sectionId: '2.1', titleZh: 'верить + 第三格', sourceText: '2.1 表列出 верить / поверить кому, чему。' },
  'gl2-2.2-svoboden-v-prep': { sectionId: '2.2', titleZh: 'свободен + в + 第六格', sourceText: '2.2 表列出 свободен в чём; от чего。' },
  'gl2-2.2-chuzhd-dat': { sectionId: '2.2', titleZh: 'чужд + 第三格', sourceText: '2.2 表列出 чужд кому, чему。' },
  'gl2-2.2-izvesten-dat': { sectionId: '2.2', titleZh: 'известен + 第三格', sourceText: '2.2 表列出 известен кому; чем。' },
  'gl2-2.2-prisushch-dat': { sectionId: '2.2', titleZh: 'присущ + 第三格', sourceText: '2.2 表列出 присущ кому, чему。' },
  'gl2-2.2-terpim-k-dat': { sectionId: '2.2', titleZh: 'терпим + к + 第三格', sourceText: '2.2 表列出 терпим к кому, к чему。' },
  'gl2-2.2-protivopolozhen-dat': { sectionId: '2.2', titleZh: 'противоположен + 第三格', sourceText: '2.2 表列出 противоположен кому, чему; по чему。' },
  'gl2-2.2-vnimatelen-k-dat': { sectionId: '2.2', titleZh: 'внимателен + к + 第三格', sourceText: '2.2 表列出 внимателен к кому, к чему。' },
  'gl2-2.2-snishoditelen-k-dat': { sectionId: '2.2', titleZh: 'снисходителен + к + 第三格', sourceText: '2.2 表列出 снисходителен к кому, к чему。' },
  'gl2-2.2-blagopriyatен-dlya-gen': { sectionId: '2.2', titleZh: 'благоприятен + для + 第二格', sourceText: '2.2 表列出 благоприятен для кого, для чего。' },
  'gl2-2.2-dostupen-dat': { sectionId: '2.2', titleZh: 'доступен + 第三格', sourceText: '2.2 表列出 доступен кому, чему; для кого, для чего。' },
  'gl2-2.2-ustoichiv-k-dat': { sectionId: '2.2', titleZh: 'устойчив + к + 第三格', sourceText: '2.2 表列出 устойчив к чему。' },
  'gl2-2.2-raven-dat': { sectionId: '2.2', titleZh: 'равен + 第三格', sourceText: '2.2 表列出 равен чему。' },
  'gl2-2.3-s-inst-accompanying': { sectionId: '2.3', titleZh: 'с + 第五格表示伴随感受、动作或态度', sourceText: '2.3 第 1 条规定感受、伴随动作以及抽象的性质/态度可用 с + 第五格。' },
  'gl2-2.3-no-s-qualitative': { sectionId: '2.3', titleZh: '无 с 的第五格表示动作方式', sourceText: '2.3 第 2 条规定，若形容词性成分承载动作的质性特征，则不用 с，且该定语不可省略。' },
  'gl2-2.4.1-genitive-sphere': { sectionId: '2.4.1', titleZh: '第二格表达领域、所属或相关关系', sourceText: '2.4.1 表列出第二格可表达所属、领域、特征等定语关系。' },
  'gl2-2.4.1-genitive-quantity': { sectionId: '2.4.1', titleZh: '第二格表达数量、部分与整体', sourceText: '2.4.1 表列出部分—整体及集合/事物总和关系。' },
  'gl2-2.4.1-instrumental-comparison': { sectionId: '2.4.1', titleZh: '第五格无介词表达比较性定语', sourceText: '2.4.1 表列出第五格无介词可表达与被限定词的比较。' },
  'gl2-2.4.2-iz-gen-composition': { sectionId: '2.4.2', titleZh: 'из + 第二格表示组成', sourceText: '2.4.2 表列出 из + 第二格可表示构成整体的部分。' },
  'gl2-2.4.2-po-dat-content': { sectionId: '2.4.2', titleZh: 'по + 第三格表示内容或领域', sourceText: '2.4.2 表列出 по + 第三格可表示信息内容或活动领域。' },
  'gl2-2.4.2-in-na-acc-feature': { sectionId: '2.4.2', titleZh: 'в/на + 第四格表示外部特征或空间位置', sourceText: '2.4.2 表列出 в、на + 第四格可表示外部特征和空间位置。' },
  'gl2-2.4.2-s-inst-feature': { sectionId: '2.4.2', titleZh: 'с + 第五格表示特征或伴随属性', sourceText: '2.4.2 表列出 с + 第五格可表示外部/内部特征或伴随特征。' },
  'gl2-2.4.2-spatial-inst': { sectionId: '2.4.2', titleZh: '空间介词 + 第五格作定语', sourceText: '2.4.2 表列出 над、под、перед、за、между + 第五格表示空间位置。' },
  'gl2-2.4.2-v-na-prep-location': { sectionId: '2.4.2', titleZh: 'в/на + 第六格表示静态位置或特征', sourceText: '2.4.2 续表列出 в、на + 第六格表示特征、数量和空间位置。' },
  'gl2-2.4.2-o-prep-content': { sectionId: '2.4.2', titleZh: 'о + 第六格表示内容', sourceText: '2.4.2 表列出 о (об) + 第六格表示被限定名词的内容。' },
  'gl2-2.4.2-infinitive-attribute': { sectionId: '2.4.2', titleZh: '名词 + 不定式表达定语关系', sourceText: '2.4.2 注意项说明愿望、能力、权利、计划等抽象名词可与不定式形成定语关系。' },
  'gl2-2.5-historical-period': { sectionId: '2.5', titleZh: '历史时期中的 в + 第四格 / при + 第六格', sourceText: '2.5 第 1 条区分时期的 в + 第四格与 при + 第六格。' },
  'gl2-2.5-za-result-duration': { sectionId: '2.5', titleZh: 'за + 第四格表示完成所需时间', sourceText: '2.5 第 4 条说明 за + 第四格表示取得结果所需的时段。' },
  'gl2-2.5-za-before-event': { sectionId: '2.5', titleZh: 'за + 时段 + до + 第二格表示事件前的时段', sourceText: '2.5 第 4 条区分 за + 第四格 与 за + 第四格 + до + 第二格。' },
  'gl2-2.5-na-stay-duration': { sectionId: '2.5', titleZh: 'на + 第四格表示预定停留时长', sourceText: '2.5 第 4 条说明 на + 第四格表示动作应持续的确定时期。' },
  'gl2-2.5-bare-acc-duration': { sectionId: '2.5', titleZh: '裸第四格表示动作持续时长', sourceText: '2.5 第 4 条说明无介词第四格表示完成动作所花的时间。' },
  'gl2-2.5-per-interval': { sectionId: '2.5', titleZh: 'сколько раз + в + 第四格表示频率', sourceText: '2.5 第 3 条给出次数 + в + 第四格的频率结构。' },
  'gl2-2.5-every-acc': { sectionId: '2.5', titleZh: 'каждый + 第四格表示规律重复', sourceText: '2.5 第 2 条给出 каждый + 第四格的规律性时间表达。' },
  'gl2-2.5-pered-inst': { sectionId: '2.5', titleZh: 'перед + 第五格表示紧接在前', sourceText: '2.5 第 5 条说明 перед + 第五格表示紧接另一动作之前。' },
  'gl2-2.5-posle-gen': { sectionId: '2.5', titleZh: 'после + 第二格表示某事之后', sourceText: '2.5 第 6 条说明 после + 第二格可接带说明的时段或事件名词。' },
  'gl2-2.5-s-gen-start': { sectionId: '2.5', titleZh: 'с + 第二格表示起点', sourceText: '2.5 第 7 条表格列出 с + 第二格表示动作开始时刻。' },
  'gl2-2.5-s-do-range': { sectionId: '2.5', titleZh: 'с ... до 表示时间区间', sourceText: '2.5 第 7 条表格列出 с ... до 表示时间范围。' },
  'gl2-2.5-na-acc-moment': { sectionId: '2.5', titleZh: 'на + 第四格表示确定时点', sourceText: '2.5 第 8 条说明 на + 第四格表示与前一时点关联的确定时刻。' },
  'gl2-2.5-cherez-acc': { sectionId: '2.5', titleZh: 'через + 第四格表示经过时段后', sourceText: '2.5 第 6 条说明 через + 第四格接时间单位表示事件在一段时间后发生。' },
  'gl2-2.6-vdol-vokrug-sredi': { sectionId: '2.6', titleZh: 'вдоль、вокруг、среди表达空间关系', sourceText: '2.6 第 6 条分别说明 вдоль、вокруг、среди 的空间意义。' },
  'gl2-2.6-distance-ot-gen': { sectionId: '2.6', titleZh: 'от + 第二格表示距离或起点', sourceText: '2.6 第 5 条说明 от + 第二格可与地点/距离副词关联。' },
  'gl2-2.6-k-iz-direction': { sectionId: '2.6', titleZh: 'к/из 与方向和来源', sourceText: '2.6 第 1、3、5 条说明 к、из、от 的方向/来源对应关系。' },
  'gl2-2.6-na-acc-purpose': { sectionId: '2.6', titleZh: 'на + 第四格表示到某地的目的', sourceText: '2.6 第 2 条说明在地点方向结构中，на + 第四格可说明 пребывания 的目的。' },
  'gl2-2.6-k-u-ot-person': { sectionId: '2.6', titleZh: 'к/у/от + 人名词的方向与静态位置', sourceText: '2.6 第 3 条区分 к、от 表示朝向/离开某人，у 表示在某人处。' },
  'gl2-2.6-k-u-ot-inanimate': { sectionId: '2.6', titleZh: 'к/у/от + 非生命名词的空间关系', sourceText: '2.6 第 5 条说明非生命名词与 к、у、от 的方向、邻近和起点意义。' },
  'gl2-2.6-za-iz-za': { sectionId: '2.6', titleZh: 'за / из-за 区分静态、方向与来源', sourceText: '2.6 第 4 条表格区分 за + 第五格、за + 第四格、из-за + 第二格。' },
  'gl2-2.6-v-na-acc-direction': { sectionId: '2.6', titleZh: 'в/на + 第四格表示方向终点', sourceText: '2.6 第 1 条区分 куда? 的方向终点与 где? 的静态地点；方向运动使用 в/на + 第四格。' },
  'gl2-2.6-static-v-na-prep': { sectionId: '2.6', titleZh: 'в/на + 第六格表示静态地点', sourceText: '2.6 第 1 条区分 где? 的在场地点与方向运动。' },
  'gl2-2.7-blagodarya-dat': { sectionId: '2.7', titleZh: 'благодаря + 第三格表示有利原因', sourceText: '2.7 第 1 条规定 благодаря + 第三格表示促成结果的有利原因。' },
  'gl2-2.7-iz-za-gen': { sectionId: '2.7', titleZh: 'из-за + 第二格表示阻碍或不利原因', sourceText: '2.7 第 2 条规定 из-за + 第二格表示阻碍动作或引起不良事件的原因。' },
  'gl2-2.7-iz-gen-conscious': { sectionId: '2.7', titleZh: 'из + 第二格表示主动动机', sourceText: '2.7 第 3 条规定 из + 第二格接性格或情感名词，表示主动且有意识的动机。' },
  'gl2-2.7-ot-gen-state': { sectionId: '2.7', titleZh: 'от + 第二格表示状态变化或非自主反应原因', sourceText: '2.7 第 4 条说明 от + 第二格表示外因、人的状态变化/非自主反应及疾病原因。' },
  'gl2-2.7-s-gen-colloquial': { sectionId: '2.7', titleZh: 'с (со) + 第二格的口语原因表达', sourceText: '2.7 注意项说明 с (со) + 第二格与 от 同义，但限于 страх、скука、радость 等少数名词并属口语风格。' },
  'gl2-2.7-po-dat': { sectionId: '2.7', titleZh: 'по + 第三格表示情境或性格原因', sourceText: '2.7 第 5 条区分 обстоятельства 与性格造成的 по + 第三格原因。' },
  'gl2-2.7-pod-inst': { sectionId: '2.7', titleZh: 'под + 第五格表示作用或影响', sourceText: '2.7 第 6 条说明 под действием / под влиянием / под давлением 的原因关系。' },
  'gl2-2.7-vsledstvie-gen': { sectionId: '2.7', titleZh: 'вследствие + 第二格表示有结果的原因', sourceText: '2.7 第 7 条规定 вследствие、в результате + 第二格表示产生结果的原因。' },
  'gl2-2.7-v-svyazi-s-inst': { sectionId: '2.7', titleZh: 'в связи с + 第五格表示行动的依据', sourceText: '2.7 第 8 条说明 в связи с чем、ввиду чего 表示行动的依据。' },
  'gl2-2.8-dlya-gen': { sectionId: '2.8', titleZh: 'для + 第二格表示目的', sourceText: '2.8 第 1 条说明 для + 第二格是最常见的目的结构，可接运动动词和多类动词。' },
  'gl2-2.8-goal-inventory': { sectionId: '2.8', titleZh: 'ради、за、на等目的介词的来源目录', sourceText: '2.8 导言列出 для、ради、за、на 作为目的关系的介词；清洗来源未保留后三种的独立条件说明。' }
};

function exercisePage(number) {
  if (number <= 5) return 18;
  if (number <= 12) return 19;
  if (number <= 19) return 20;
  if (number <= 25) return 21;
  if (number <= 32) return 22;
  if (number <= 38) return 23;
  if (number <= 45) return 24;
  if (number <= 51) return 25;
  if (number <= 58) return 26;
  if (number <= 67) return 27;
  if (number <= 73) return 28;
  if (number <= 80) return 29;
  if (number <= 87) return 30;
  if (number <= 93) return 31;
  if (number <= 99) return 32;
  if (number <= 106) return 33;
  if (number <= 112) return 34;
  if (number <= 119) return 35;
  if (number <= 126) return 36;
  if (number <= 135) return 37;
  if (number <= 141) return 38;
  if (number <= 148) return 39;
  return 40;
}

const assignments = new Map();
function sourceFor(sectionIds) {
  const printed = new Set();
  const pdf = new Set();
  sectionIds.forEach(sectionId => {
    (sectionSources[sectionId]?.printed || []).forEach(page => printed.add(page));
    (sectionSources[sectionId]?.pdf || []).forEach(page => pdf.add(page));
  });
  return { printed: [...printed].sort((a, b) => a - b), pdf: [...pdf].sort((a, b) => a - b) };
}
function put(number, status, sectionIds, ruleIds, evidence, candidateRuleIds = []) {
  if (assignments.has(number)) throw new Error(`Duplicate assignment for ${number}`);
  assignments.set(number, { status, sectionIds, ruleIds, candidateRuleIds, evidence });
}
function mapped(number, sectionIds, ruleId, evidence) { put(number, 'mapped', sectionIds, [ruleId], evidence); }
function reviewed(number, sectionIds, candidateRuleId, evidence) { put(number, 'needs-review', sectionIds, [], evidence, [candidateRuleId]); }
function sourceOnly(number, sectionIds, evidence) { put(number, 'source-exercise-only', sectionIds, [], evidence); }
function many(sectionIds, ruleId, pairs) { pairs.forEach(([number, evidence]) => mapped(number, sectionIds, ruleId, evidence)); }

many(['2.1'], 'gl2-2.1-sodeistvovat-v-prep', [[1, 'содействовать в укреплении']]);
many(['2.1'], 'gl2-2.1-miritsya-s-inst', [[2, 'мириться с обстоятельствами']]);
sourceOnly(3, ['2.1'], 'высказывать разные мнения 考查一般第四格宾语；2.1 表未列 высказывать，也没有通用宾格规则。');
many(['2.1'], 'gl2-2.1-predpochitat-acc-dat', [[4, 'предпочитал радость веселью']]);
many(['2.1'], 'gl2-2.1-uprekat-acc-v-prep', [[5, 'упрекать вас ни в чём']]);
many(['2.1'], 'gl2-2.1-dostigat-gen', [[6, 'достигли высокого уровня']]);
sourceOnly(7, ['2.1'], 'требуют бережного отношения；2.1 表未列 требовать，不能以常识补写原书支配规则。');
many(['2.1'], 'gl2-2.1-izbegat-gen', [[8, 'избегать общения']]);
many(['2.1'], 'gl2-2.1-obizhatsya-na-acc', [[9, 'обижаться на кого-либо']]);
many(['2.1'], 'gl2-2.1-vliyat-na-acc', [[10, 'влиять на мировоззрение']]);
many(['2.1'], 'gl2-2.1-polagatsya-na-acc', [[11, 'полагаться на свои силы']]);
many(['2.1'], 'gl2-2.1-smeyatsya-nad-inst', [[12, 'посмеяться над собой']]);
many(['2.1'], 'gl2-2.1-uchit-acc-dat', [[13, 'учит журналистов умению']]);
many(['2.1'], 'gl2-2.1-porazhat-acc-inst', [[14, 'поражает телезрителей начитанностью']]);
many(['2.1'], 'gl2-2.1-slivatsya-s-inst', [[15, 'сливаются с вечностью']]);
many(['2.1'], 'gl2-2.1-protivostoyat-dat', [[16, 'противостоять огню']]);
many(['2.1'], 'gl2-2.1-sootvetstvovat-dat', [[17, 'соответствовать экологическим нормам']]);
many(['2.1'], 'gl2-2.1-priderzhivatsya-gen', [[18, 'не придерживаются режима']]);
many(['2.1'], 'gl2-2.1-privykat-k-dat', [[19, 'привыкнуть к морозам']]);
many(['2.1'], 'gl2-2.1-napominat-acc-acc', [[20, 'мозг дельфина напоминает мозг человека']]);
many(['2.1'], 'gl2-2.1-prisposablivatsya-k-dat', [[21, 'приспосабливаются к условиям']]);
many(['2.1'], 'gl2-2.1-otlichatsya-inst', [[22, 'отличаться низкими ценами']]);
many(['2.1'], 'gl2-2.1-verit-v-acc', [[23, 'верят в успех']]);

many(['2.2'], 'gl2-2.2-svoboden-v-prep', [[24, 'свободны в своём выборе']]);
many(['2.2'], 'gl2-2.2-chuzhd-dat', [[25, 'сострадание было ему не чуждо']]);
many(['2.2'], 'gl2-2.2-izvesten-dat', [[26, 'шахматы были известны им одним']]);
many(['2.2'], 'gl2-2.2-terpim-k-dat', [[27, 'терпимы к окружающим']]);
sourceOnly(28, ['2.2'], 'свойственно любому человеку；2.2 表未列 краткое прилагательное свойственен/свойственно。');
many(['2.2'], 'gl2-2.2-protivopolozhen-dat', [[29, 'противоположно ему']]);
many(['2.2'], 'gl2-2.2-vnimatelen-k-dat', [[30, 'внимателен к деталям']]);
many(['2.2'], 'gl2-2.2-snishoditelen-k-dat', [[31, 'снисходительны к счастливым']]);
many(['2.2'], 'gl2-2.2-blagopriyatен-dlya-gen', [[32, 'благоприятна для прогулки']]);
many(['2.2'], 'gl2-2.2-dostupen-dat', [[33, 'одежда доступна среднему классу']]);
many(['2.2'], 'gl2-2.2-ustoichiv-k-dat', [[34, 'устойчивы к воздействию']]);
many(['2.2'], 'gl2-2.2-raven-dat', [[35, 'равноценна победе']]);

reviewed(36, ['2.3'], 'gl2-2.3-s-inst-accompanying', 'с промежутком 属于带 с 的方式搭配，但原书只直接列感受、伴随动作与态度；语义边界保留复核。');
many(['2.3'], 'gl2-2.3-s-inst-accompanying', [[37, 'с громким шумом'], [38, 'с серьёзным выражением лица'], [40, 'с любовью'], [47, 'с нежностью'], [49, 'с волнением'], [143, 'с надеждой']]);
sourceOnly(39, ['2.3'], 'на высоком уровне 是方式搭配；2.3 仅解释 с 与无 с 的第五格对立。');
many(['2.3'], 'gl2-2.3-no-s-qualitative', [[41, 'медленными шагами'], [42, 'простым языком'], [43, 'звонким голосом'], [44, 'тихим и лёгким смехом'], [48, 'широко открытыми глазами'], [141, 'говорить шёпотом']]);
sourceOnly(45, ['2.3'], 'под присмотром 不属于 2.3 明示的 с / 无 с 第五格对立。');
sourceOnly(46, ['2.3'], 'с первого взгляда 是固定方式搭配；2.3 未给出该搭配或同类条件。');

many(['2.4', '2.4.2'], 'gl2-2.4.2-po-dat-content', [[50, 'соревнования по бегу'], [53, 'сборник упражнений по стилистике']]);
many(['2.4', '2.4.2'], 'gl2-2.4.2-in-na-acc-feature', [[51, 'обувь на каблуках'], [58, 'дом на скале']]);
many(['2.4', '2.4.2'], 'gl2-2.4.2-iz-gen-composition', [[52, 'семья из трёх человек']]);
many(['2.4', '2.4.1'], 'gl2-2.4.1-genitive-sphere', [[54, 'антология русской поэзии']]);
many(['2.4', '2.4.2'], 'gl2-2.4.2-s-inst-feature', [[55, 'писатель с мировым именем'], [56, 'с чувством юмора'], [57, 'номер с видом на залив']]);
many(['2.4', '2.4.2'], 'gl2-2.4.2-o-prep-content', [[59, 'договор о дружбе']]);
many(['2.4', '2.4.2'], 'gl2-2.4.2-infinitive-attribute', [[60, 'готовность продолжить сотрудничество'], [61, 'право искать новую интонацию'], [63, 'желание переехать'], [64, 'способность обеспечивать растения'], [144, 'желание искать']]);
reviewed(62, ['2.4', '2.4.2'], 'gl2-2.4.2-infinitive-attribute', 'традиция праздновать：属于名词 + 不定式，但 традиция 不在原书点名的抽象名词及例表中。');
many(['2.4', '2.4.1'], 'gl2-2.4.1-genitive-quantity', [[65, 'чайную ложку мёда'], [66, 'коробка конфет'], [67, 'литр молока'], [68, 'стакан сока'], [69, 'пачку творога']]);
many(['2.4', '2.4.1'], 'gl2-2.4.1-instrumental-comparison', [[138, 'Берег обрывом спускался к морю']]);

reviewed(70, ['2.5'], 'gl2-2.5-za-result-duration', 'за 2 миллиарда лет 与“未改变”搭配；原书把 за + 第四格主要说明为完成结果所需时段，否定持续语义需保留复核。');
many(['2.5'], 'gl2-2.5-historical-period', [[71, 'в эру великих географических открытий'], [72, 'при Петре I'], [73, 'в наши дни'], [74, 'в век высоких технологий'], [146, 'в век научно-технического прогресса']]);
many(['2.5'], 'gl2-2.5-za-result-duration', [[75, 'за считанные минуты найти информацию'], [78, 'облетел Землю за сто восемь минут'], [92, 'преодолевают дистанцию за семь секунд']]);
many(['2.5'], 'gl2-2.5-za-before-event', [[76, 'за семь часов до начала'], [83, 'за час до его закрытия'], [93, 'за десять минут до отправления']]);
many(['2.5'], 'gl2-2.5-na-acc-moment', [[77, 'переносится на четверг']]);
many(['2.5'], 'gl2-2.5-pered-inst', [[79, 'перед выходом в открытый космос']]);
many(['2.5'], 'gl2-2.5-na-stay-duration', [[80, 'путешествие на три года'], [87, 'перевели на две недели'], [140, 'приехал на сутки']]);
many(['2.5'], 'gl2-2.5-posle-gen', [[81, 'после десяти лет молчания'], [88, 'после звонка']]);
many(['2.5'], 'gl2-2.5-s-gen-start', [[82, 'с 1995 года']]);
many(['2.5'], 'gl2-2.5-s-do-range', [[84, 'с утра до вечера']]);
many(['2.5'], 'gl2-2.5-bare-acc-duration', [[85, 'длится два часа']]);
many(['2.5'], 'gl2-2.5-every-acc', [[86, 'каждую неделю']]);
sourceOnly(89, ['2.5'], 'уменьшилось на два-три часа 表示差额；2.5 未说明 на + 第四格的数量变化。');
many(['2.5'], 'gl2-2.5-cherez-acc', [[90, 'через сутки']]);
many(['2.5'], 'gl2-2.5-per-interval', [[91, 'пять раз в сутки']]);

many(['2.6'], 'gl2-2.6-vdol-vokrug-sredi', [[94, 'вдоль реки Амур'], [95, 'вокруг земного шара'], [96, 'среди камней'], [147, 'вдоль южного побережья']]);
many(['2.6'], 'gl2-2.6-distance-ot-gen', [[97, 'недалеко от озера Байкал'], [100, 'от Ростова-на-Дону'], [104, 'в стороне от дороги'], [148, 'в ста сорока километрах от Гаваны']]);
many(['2.6', '2.4.2'], 'gl2-2.4.2-spatial-inst', [[98, 'над уровнем моря']]);
sourceOnly(99, ['2.6'], 'на глубине два метра 是深度量词结构；2.6 未给出该结构的独立条件。');
many(['2.6'], 'gl2-2.6-k-iz-direction', [[101, 'подходил к родным берегам'], [102, 'разлетаются из гнезда'], [105, 'из сада пахнет сиренью']]);
many(['2.6'], 'gl2-2.6-za-iz-za', [[103, 'вышла из-за дома'], [106, 'за столом']]);
many(['2.6'], 'gl2-2.6-v-na-acc-direction', [[107, 'обратиться в деканат']]);
many(['2.6'], 'gl2-2.6-static-v-na-prep', [[108, 'на нашей кафедре'], [109, 'на собрании']]);

many(['2.7'], 'gl2-2.7-pod-inst', [[110, 'под влиянием глобального потепления'], [115, 'под действием воды, ветра и времени']]);
many(['2.7'], 'gl2-2.7-vsledstvie-gen', [[111, 'в результате осуществления проекта'], [116, 'вследствие проникновения тёплых масс']]);
many(['2.7'], 'gl2-2.7-blagodarya-dat', [[112, 'благодаря своей надёжности'], [114, 'благодаря созданию заповедника'], [149, 'благодаря историко-архитектурным памятникам']]);
many(['2.7'], 'gl2-2.7-ot-gen-state', [[113, 'от мороза'], [120, 'побледнев от негодования'], [121, 'от курения']]);
many(['2.7'], 'gl2-2.7-po-dat', [[117, 'по рассеянности']]);
many(['2.7'], 'gl2-2.7-iz-gen-conscious', [[118, 'из страха'], [119, 'из жалости']]);
many(['2.7'], 'gl2-2.7-iz-za-gen', [[122, 'из-за волнения']]);
many(['2.7'], 'gl2-2.7-v-svyazi-s-inst', [[150, 'в связи с трёхсотлетием Санкт-Петербурга']]);

many(['2.8'], 'gl2-2.8-dlya-gen', [[123, 'для получения высшего образования'], [128, 'для спасения жизни'], [133, 'для ухода за новорождённым'], [135, 'для обсуждения тематики']]);
[[124, 'рисковали жизнью ради науки'], [125, 'покидает города ради жизни'], [126, 'воевал за победу'], [127, 'сражаясь за свободу'], [129, 'войне за независимость'], [130, 'годы на поиск'], [131, 'останавливаются на отдых'], [132, 'пришли на помощь'], [134, 'пошёл за мороженым'], [136, 'пошёл за билетами']].forEach(([number, evidence]) => reviewed(number, ['2.8'], 'gl2-2.8-goal-inventory', `${evidence}；原书仅在 2.8 导言列出该目的介词，未保留独立用法条件。`));

sourceOnly(137, ['2.5'], 'в начале октября 1773 года 的“何时”问法属于 2.9 语义辨认练习；2.5 未给出该问法的独立规则。');
sourceOnly(139, ['2.3'], 'счастливым 的“什么样”问法不属于 2.3 已说明的 с / 无 с 方式结构。');
sourceOnly(142, ['2.1'], 'Большую Медведицу 的“什么”问法涉及一般第四格宾语；2.1 仅为部分动词支配表。');
many(['2.1'], 'gl2-2.1-verit-dat', [[145, 'верить статистике']]);

if (assignments.size !== chapter.exercises.length) {
  const missing = chapter.exercises.map(exercise => exercise.printedNumber).filter(number => !assignments.has(number));
  throw new Error(`Missing Chapter 2 assignments: ${missing.join(', ')}`);
}

const exercises = {};
for (const exercise of chapter.exercises) {
  const assignment = assignments.get(exercise.printedNumber);
  const source = sourceFor(assignment.sectionIds);
  const printedPage = exercisePage(exercise.printedNumber);
  const ruleReason = assignment.ruleIds.map(ruleId => ruleCatalog[ruleId].sourceText).join(' ');
  exercises[exercise.id] = {
    exerciseId: exercise.id,
    printedNumber: exercise.printedNumber,
    chapterId: 'gl2',
    sectionIds: assignment.sectionIds,
    ruleIds: assignment.ruleIds,
    candidateRuleIds: assignment.candidateRuleIds,
    status: assignment.status,
    exercisePrintedPage: printedPage,
    exercisePdfPage: printedPage + 2,
    theoryPrintedPages: source.printed,
    theoryPdfPages: source.pdf,
    mappingReason: `${assignment.evidence}。${ruleReason}`,
    reviewStatus: assignment.status === 'mapped' ? 'source-and-pdf-checked' : 'needs-review'
  };
}

const sectionToExercises = {};
for (const sectionId of Object.keys(sectionSources)) {
  const linked = Object.values(exercises).filter(entry => entry.sectionIds.includes(sectionId));
  sectionToExercises[sectionId] = {
    exerciseIds: linked.map(entry => entry.exerciseId),
    mappedIds: linked.filter(entry => entry.status === 'mapped').map(entry => entry.exerciseId),
    needsReviewIds: linked.filter(entry => entry.status === 'needs-review').map(entry => entry.exerciseId),
    sourceExerciseOnlyIds: linked.filter(entry => entry.status === 'source-exercise-only').map(entry => entry.exerciseId)
  };
}

const countByStatus = status => Object.values(exercises).filter(entry => entry.status === status).length;
const output = {
  schemaVersion: 1,
  chapterId: 'gl2',
  sourceBook: 'zlatoust-grammar-lexika-v1',
  status: 'review',
  mappingBasis: '逐题视觉核对 PDF 020-042（印刷页 18-40）、PDF 125 原书答案表及 cleaned-source/chapter-02.md。原书未说明的结构保留 needs-review 或 source-exercise-only。',
  statusDefinitions: {
    mapped: '原书理论中有直接或足够明确的规则依据。',
    'needs-review': '已确定主要理论范围，但原书条件不足以无风险确定细边界。',
    'source-exercise-only': '原书有练习，但理论区没有对应的独立规则说明。'
  },
  ruleCatalog,
  exercises
};
const review = {
  schemaVersion: 1,
  chapterId: 'gl2',
  status: 'review',
  summary: {
    accounted: chapter.exercises.length,
    mapped: countByStatus('mapped'),
    needsReview: countByStatus('needs-review'),
    sourceExerciseOnly: countByStatus('source-exercise-only'),
    pdfAnswerKeyMismatches: 18,
    questionOrOptionMismatches: 0,
    sourceMetadataMismatches: 1
  },
  reviewCases: Object.values(exercises).filter(entry => entry.status !== 'mapped').map(entry => ({
    exerciseId: entry.exerciseId,
    printedNumber: entry.printedNumber,
    status: entry.status,
    sectionIds: entry.sectionIds,
    candidateRuleIds: entry.candidateRuleIds,
    reason: entry.mappingReason
  })),
  pdfAudit: {
    questionPages: { pdfPages: [20, 42], printedPages: [18, 40] },
    answerKey: { pdfPage: 125, printedPage: 123, heading: 'Ключи ко второй главе' },
    ledger: 'quality-reports/chapter-02-data-repair.json'
  }
};
fs.writeFileSync(path.join(theoryRoot, 'mappings', 'chapter-02-exercise-to-rules.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(theoryRoot, 'mappings', 'chapter-02-section-to-exercises.json'), `${JSON.stringify({ schemaVersion: 1, chapterId: 'gl2', status: 'review', accountedExerciseCount: chapter.exercises.length, sections: sectionToExercises }, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(theoryRoot, 'mappings', 'chapter-02-mapping-review.json'), `${JSON.stringify(review, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ accounted: chapter.exercises.length, mapped: countByStatus('mapped'), needsReview: countByStatus('needs-review'), sourceExerciseOnly: countByStatus('source-exercise-only') }, null, 2));
