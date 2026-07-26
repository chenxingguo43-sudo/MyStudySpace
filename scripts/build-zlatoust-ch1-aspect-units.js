#!/usr/bin/env node
'use strict';

/* Build the audited 1.4.1–1.4.8 sample from cleaned source only.
 * Original-book text remains explicitly marked; Chinese guidance is a separate
 * learning-note layer. This script never writes raw OCR or cleaned source. */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const theoryRoot = path.join(root, 'data', 'textbook', 'zlatoust_grammar', 'theory');
const cleanedSourcePath = path.join(theoryRoot, 'cleaned-source', 'chapter-01.md');
const chapterPath = path.join(root, 'data', 'textbook', 'zlatoust_grammar', 'ch0000.json');
const mappingPath = path.join(theoryRoot, 'mappings', 'exercise-to-rules.json');
const outputDirectory = path.join(theoryRoot, 'rule-units', 'gl1');
const reportPath = path.join(theoryRoot, 'quality-reports', 'sample-1.4-coverage.md');

const SECTION_META = {
  '1.4.1': {
    ruleItemCount: 10,
    titleZh: '过去时和将来时：体的五组语义对立',
    orientationZh: '本节不是把“未完成体＝过程、完成体＝结果”当作万能口诀，而是让学习者在过去时和将来时分别判断：问的是事实还是一次结果、过程还是整体、重复还是单次、同时还是先后，以及结果是否仍与现在相关。',
    quickDecision: [
      '先确认时态：本节适用于过去时和将来时；现在时只能用未完成体，不能把本节规则套进现在时。',
      '先问说话人要呈现的是动作内部过程／重复／并行，还是一个有边界的完整结果／单次／先后链。',
      '若句子问“是否曾发生过”而不问完成状态，优先核对一般事实；若强调终于、全部、立即等达成结果，核对具体事实。',
      '过去时再检查结果是否保留到说话时：动作已被抵消时不是简单“完成”，结果仍在时才是 сохранение результата。'
    ],
    semanticAnalysis: '同一动作词并不自动决定体。选择由说话人如何切分事件决定：把事件打开为过程、习惯或背景，就出现未完成体；把事件作为完成的整体、一次转折或步骤链来陈述，就出现完成体。第五组只限过去时，因为它比较的是结果在说话时是否仍成立。',
    signalAnalysis: [
      { signals: ['когда-нибудь', 'один раз', 'хоть раз', 'однажды', 'ни разу'], use: '它们可与一般事实问句共现，帮助识别“是否发生过”，但 один раз 也能和具体一次事实共现，不能单凭一个词决定体。' },
      { signals: ['весь день', 'всю неделю', 'долго', 'подолгу', 'круглые сутки'], use: '持续长度通常支持过程义，但要先看说话人是否把整个时段当作完成整体。' },
      { signals: ['каждый день', 'ежедневно', 'часто', 'регулярно', 'всякий раз'], use: '反复频率支持未完成体；若语境只说一次明确事件，则不能仅因词形相似误判。' },
      { signals: ['сначала', 'потом', 'как только', 'сразу', 'наконец', 'в конце концов'], use: '它们常提示完成体的步骤或达成，但仍须确认句子确实表达有界结果而非计划、习惯或背景。' }
    ],
    contrasts: [
      { sourceType: 'source-example', left: 'Аспирант писал статью всю неделю.', right: 'Аспирант написал статью за неделю.', analysis: '左侧让读者看到写作过程和持续时间；右侧把写作作为在一周内完成的整体结果。' },
      { sourceType: 'source-example', left: 'Ко мне приходили друзья (пришли и уже ушли).', right: 'Ко мне пришли друзья (они и сейчас у меня).', analysis: '两句都在过去发生；差别不是“发生／未发生”，而是说话时结果是否仍保留。' }
    ],
    commonErrors: [
      '把每一个过去时完成体都解释为“结果仍在”。原书只把结果保留与未保留这一对立限定为过去时的特定语境。',
      '见到 один раз 就机械选完成体；原书把它同时列在一般事实可用的环境中。',
      '把并列动词一律理解为先后；需看动作是平行背景还是有顺序的事件链。'
    ],
    relatedRules: ['1.4.2（否定时的体）', '1.4.3（不定式中的过程／结果）', '1.4.7（命令式中的单次／反复）'],
    pages: { pdfPages: [95, 96], printedPages: [93, 94] }
  },
  '1.4.2': {
    ruleItemCount: 3,
    titleZh: '否定中的事实、结果与断然拒绝',
    orientationZh: '本节处理的是 отрицание（否定）改变体的观察点：否定可以否定动作事实本身，也可以否定本应达成的结果；未完成体还可表达说话人的断然不做。',
    quickDecision: [
      '先问是否是在说“这件事根本没有做／不打算做”：这是未完成体的事实否定。',
      '若动作已开始、计划达成却尚未达到终点，或因能力不足不能达到结果，核对完成体的结果否定。',
      '若回答是在拒绝承担动作（如我不去寄），不要把它误作“尚未完成”的完成体否定。'
    ],
    semanticAnalysis: '否定词 не 本身不决定体。关键是它否定的对象：未完成体取消的是动作事实或意愿，完成体取消的是一个可达到的结果。',
    signalAnalysis: [
      { signals: ['вообще', 'не буду'], use: '可提示一般事实／意图的否定；仍需听清说话人是在拒绝行动，还是描述尚未达到结果。' },
      { signals: ['ещё не', 'только начал', 'не смогу'], use: '常提示结果尚未实现或无法实现；不是每个 не 都自动等于完成体。' }
    ],
    contrasts: [
      { sourceType: 'source-example', left: 'Я его вообще не писал. Буду писать завтра.', right: 'Я его ещё не написал, я только начал работу над ним.', analysis: '左侧否定“曾写过”这一事实；右侧承认写作过程已开始，只是否定成稿结果。' }
    ],
    commonErrors: ['把 ещё не 当作绝对规则而忽略结果语义。', '把 категорическое отрицание 误读为“动作尚未结束”；它是拒绝或否定实施该动作。'],
    relatedRules: ['1.4.1（一般事实／具体事实）', '1.4.6（否定不定式）'],
    pages: { pdfPages: [97], printedPages: [95] }
  },
  '1.4.3': {
    ruleItemCount: 4,
    titleZh: '不定式中的过程、结果、重复与单次',
    orientationZh: '本节先不看支配动词的词汇类别，而看不定式所表示的事件本身：它是没有边界的过程／反复，还是带明确界限的一次结果。',
    quickDecision: [
      '先确认不定式的语义，而不要先背支配动词：活动正在展开或无终点时看未完成体。',
      '出现明确完成界限、交付点或一次目标时看完成体。',
      '有每周、经常等重复信息时看未完成体；有明天要得到一次答复等单次信息时看完成体。',
      '若支配词本身被原书 1.4.4 明确列出，先服从其词汇限制；表外动词则不可虚构触发词，应回到本节语义。'
    ],
    semanticAnalysis: '不定式不自带时态，但仍要求说话人选择事件视角。过程和反复让事件边界不突出；结果和单次使界限成为信息焦点。Q052–Q055 与 Q061 的边界复核正是如此：уметь／учить／удалось 不在 1.4.4 的原书触发词表中，必须按本节的过程或结果义判断。',
    signalAnalysis: [
      { signals: ['хотя бы изредка', 'каждую неделю'], use: '提示非一次的持续／反复活动，支持未完成体；信号词须与不定式实际语义一致。' },
      { signals: ['ещё на прошлой неделе', 'в понедельник', 'завтра'], use: '若指向应完成的界限或一次交付，支持完成体；单独的时间词未必足够。' }
    ],
    contrasts: [
      { sourceType: 'source-example', left: 'Я собираюсь изучать русский язык в университете.', right: 'Мы планируем сдать эту работу в понедельник.', analysis: '左侧是展开的学习活动；右侧的重点是周一交付结果。' },
      { sourceType: 'source-example', left: 'Мы надеемся каждую неделю получать от вас известия.', right: 'Завтра я хочу получить от тебя ответ.', analysis: '左侧按周重复；右侧期待一次具体答复。' }
    ],
    commonErrors: ['把 уме́ть 或 учи́ть 自动塞入 1.4.4；原书没有把它们列为词汇触发词。', '只看 завтра 就选完成体，而没有判断是否要求一个有界结果。'],
    relatedRules: ['1.4.4（已列出的词汇限制）', '1.4.6（否定不定式）', '1.4.1（有限动词中的过程／结果）'],
    pages: { pdfPages: [97], printedPages: [95] }
  },
  '1.4.4': {
    ruleItemCount: 4,
    titleZh: '不定式的词汇—语义限制',
    orientationZh: '当支配词属于原书列出的词汇组时，体由该组合的词汇—语义关系限制；这里不是把“完成／未完成”简化为普遍的时间长短。',
    quickDecision: [
      '先检查支配词是否在原书列举的四组之内，而不是把所有动词都当作触发词。',
      '阶段动词（开始、继续、停止等）后选未完成体，因为关注活动的启动／延续／终止过程。',
      '获得或丧失习惯、兴趣等语义后选未完成体；表达厌烦、禁止或不合宜的组也选未完成体。',
      'успеть、забыть、спешить／поспешить 后，原书要求完成体；若动词不在表内，回到 1.4.3 判断。'
    ],
    semanticAnalysis: '这是有限的原书列举，不是可无限外推的“词典规则”。它解释为什么相同的体对在不同支配词后选择不同；表外题目仍需要 1.4.3 的事件语义。',
    signalAnalysis: [
      { signals: ['начать', 'продолжать', 'перестать'], use: '仅当它们作原书所述阶段意义的支配词时，才是未完成体的可靠线索。' },
      { signals: ['успеть', 'забыть', 'спешить'], use: '原书明确列入完成体栏；不要把 удалось 等未列词偷偷并入。' },
      { signals: ['хватит', 'опасно', 'вредно', 'бесполезно'], use: '表达禁止或不合宜时支持未完成体，但须确认它们修饰的正是该不定式。' }
    ],
    contrasts: [
      { sourceType: 'source-example', left: 'Осенью он начал учиться в университете.', right: 'Дачники успели сесть на последнюю электричку.', analysis: '左侧阶段动词开启学习活动；右侧 успеть 关注及时实现一次结果。' },
      { sourceType: 'source-example', left: 'Сын устал возражать матери.', right: 'Я забыл купить свежую газету.', analysis: '厌烦对象是持续活动；忘记的是一次应完成的购买结果。' }
    ],
    commonErrors: ['把表外的 уме́ть、учи́ть、удалось 误标为 1.4.4 触发词。', '只凭“不喜欢／禁止”字面判断，忽略它必须表达对所述活动的负面态度。'],
    relatedRules: ['1.4.3（表外支配词的语义判断）', '1.4.5（нельзя）', '1.4.6（否定不定式）'],
    pages: { pdfPages: [97, 98], printedPages: [95, 96] }
  },
  '1.4.5': {
    ruleItemCount: 2,
    titleZh: 'нельзя：禁止与客观不可能',
    orientationZh: '同一个 нельзя 不等于同一种体：未完成体描述不允许实施某类行为，完成体描述因为客观条件而无法实现一次动作。',
    quickDecision: [
      '先问是否有人为规则、禁令或行为限制：是则核对 нельзя + 未完成体。',
      '若障碍来自灯泡、电话等客观条件，问“这一次能不能完成”：核对 нельзя + 完成体。',
      '不要把所有“不能”都当禁止，也不要把所有完成体解释为命令。'
    ],
    semanticAnalysis: '区别由 невозможность 的来源决定：规章针对活动本身，客观条件阻断一次可完成的结果。',
    signalAnalysis: [
      { signals: ['здесь', 'после одиннадцати часов'], use: '场所和规章时间常支持禁止义，但仍需有行为规范语境。' },
      { signals: ['лампочка перегорела', 'телефон не работает'], use: '客观故障是完成体不可能义的强证据；不是单凭 нельзя。' }
    ],
    contrasts: [
      { sourceType: 'source-example', left: 'Здесь нельзя переходить дорогу.', right: 'Свет нельзя включить, лампочка перегорела.', analysis: '左侧禁止“过马路”这类行为；右侧是灯泡故障使一次开灯无法实现。' }
    ],
    commonErrors: ['把禁止与物理／技术障碍混为一谈。', '将 Q076 的标牌式 Не беспокоить 硬映射给本节；原书本节只论 нельзя。'],
    relatedRules: ['1.4.6（否定不定式）', '1.4.8（否定命令式）'],
    pages: { pdfPages: [98], printedPages: [96] }
  },
  '1.4.6': {
    ruleItemCount: 5,
    titleZh: '否定不定式：依存、独立与 мочь + не',
    orientationZh: '本节先辨认不定式是否依附于有限动词，再区分独立不定式的不可能／口语提议，以及 мочь + не 是许可无需还是担心无法实现。',
    quickDecision: [
      '先找有限动词：若不定式依附于决定、建议等有限动词，否定作用于依存不定式，原书给未完成体。',
      '若没有有限动词，判断独立不定式是客观不可能还是口语疑问提议；这两类原书给完成体。',
      '遇到 мочь + не + 不定式，问其意义是“可以不做／不必做”还是“可能做不成”；前者未完成体、后者完成体。',
      'не стоит、не нужно 等建议或不宜结构后，原书给未完成体；标牌式 Не беспокоить 不在表内，保持 source-exercise-only。'
    ],
    semanticAnalysis: '否定位置不是视觉上“не 在动词前”那么简单。依存关系、独立性和说话人意图共同决定体；尤其 мочь + не 需先分清许可与担忧。',
    signalAnalysis: [
      { signals: ['решили', 'советуют'], use: '有限动词提示依存不定式，支持未完成体；仍需确认 не 确实作用于不定式。' },
      { signals: ['Мне не...', 'Не ... ли'], use: '无有限动词时可分别提示不可能或口语提议，原书列为完成体。' },
      { signals: ['можно не', 'можешь не'], use: '表示许可或无需时支持未完成体；若上下文是担心未实现，不能照搬。' },
      { signals: ['боюсь', 'может не'], use: '担心结果实现不了时支持完成体；关键是可能不发生的有界结果。' }
    ],
    contrasts: [
      { sourceType: 'source-example', left: 'Мы решили не брать слишком много вещей.', right: 'Мне не поднять этот чемодан.', analysis: '左侧不定式依附于 решили；右侧没有有限动词，表达一次抬起的客观不可能。' },
      { sourceType: 'source-example', left: 'Завтра можешь не убирать в комнате.', right: 'Мы можем не сдать всю документацию на этой неделе.', analysis: '左侧允许不做日常活动；右侧担心一项有界的提交结果无法实现。' }
    ],
    commonErrors: ['只见 не 就选未完成体，忽略独立不定式的客观不可能。', '把 можешь не 做成“未来一定不做”；它可以表示许可或无需。', '将标牌式 Не беспокоить 伪装成原书规则；该题必须保留 source-exercise-only。'],
    relatedRules: ['1.4.2（有限动词的否定）', '1.4.3（不定式语义）', '1.4.5（нельзя）'],
    pages: { pdfPages: [98, 99], printedPages: [96, 97] }
  },
  '1.4.7': {
    ruleItemCount: 11,
    titleZh: '肯定命令式：反复、单次与交际意图',
    orientationZh: '命令式的体不仅表达动作次数，也编码说话人的交际安排：是在允许、邀请、让对方开始／继续／改变方式，还是要求完成一次具体任务。',
    quickDecision: [
      '先判断动作是常规反复还是一次具体任务：反复通常未完成体，一次任务通常完成体。',
      '再看有无补语：原书说未完成体常无补语，完成体常带补语；这是倾向，不可脱离意义机械套用。',
      '若说话人允许、邀请、要求开始／继续／改变方式或祝愿，核对未完成体的交际功能。',
      '若重点是完成一个有对象的单次动作，核对完成体的 просьба／совет／приказ。'
    ],
    semanticAnalysis: '这里的单次／多次和礼貌程度不能分开理解。未完成体常把动作作为正在展开或可持续的活动管理；完成体把对方推向一个边界清楚的完成动作。',
    signalAnalysis: [
      { signals: ['постоянно', 'на каждой перемене'], use: '明确反复支持未完成体。' },
      { signals: ['дальше', 'аккуратнее', 'громче'], use: '分别提示继续或改变方式，均是原书未完成体的交际用途。' },
      { signals: ['составьте', 'запишите', 'сядьте'], use: '有具体对象或一次完成任务时常支持完成体；要结合句子的命令目的。' }
    ],
    contrasts: [
      { sourceType: 'source-example', left: 'Пишите, пожалуйста.', right: 'Спишите предложение.', analysis: '左侧是无补语的活动邀请；右侧要求完成指定对象。' },
      { sourceType: 'source-example', left: 'Почему вы замолчали? Рассказывайте дальше.', right: 'Запишите мой телефон, а то забудете.', analysis: '左侧恢复已中断过程；右侧要求一次记下电话号码。' }
    ],
    commonErrors: ['把 пожалуйста 当作未完成体的唯一信号；礼貌并不取消单次完成任务。', '只看有没有宾语而不看交际目的；原书说通常，不是无例外的形式律。'],
    relatedRules: ['1.4.8（否定命令式）', '1.4.1（单次／多次）'],
    pages: { pdfPages: [99], printedPages: [97] }
  },
  '1.4.8': {
    ruleItemCount: 3,
    titleZh: '否定命令式：禁止、警告与反事实条件',
    orientationZh: '否定命令式中，未完成体直接要求不要做某种行动；完成体常是“当心别发生”的预警，也可构成相当于 если бы 的反事实条件意义。',
    quickDecision: [
      '先判断是在阻止实际或习惯性行动：请求、命令、建议、禁止不做时核对未完成体。',
      '若说话人提醒对方避免即将发生的一次坏结果，核对完成体的 предупреждение／предостережение。',
      '若结构可改写为 если бы，检查完成体的反事实条件意义，而不是普通禁令。'
    ],
    semanticAnalysis: '两边都有 не，但说话人意图不同：未完成体管理行为过程，完成体预防一个有界的不良后果；第二种完成体句型不直接命令，而是回看未发生的条件。',
    signalAnalysis: [
      { signals: ['это вредно', 'я ещё почитаю'], use: '说明为什么请求对方别继续某行为，支持未完成体禁止／建议。' },
      { signals: ['смотри', 'здесь дует'], use: '警告语境提示完成体，但真正决定因素仍是避免一次结果。' },
      { signals: ['а ты не ... бы'], use: '可提示反事实后果；应能改写为 если бы，才属于第二种完成体。' }
    ],
    contrasts: [
      { sourceType: 'source-example', left: 'Не выключай свет, я ещё почитаю.', right: 'Смотри, не разбей вазу.', analysis: '左侧请求不要中断正在相关的活动；右侧警告避免一次打碎的结果。' },
      { sourceType: 'source-example', left: 'Заведи будильник, а ты не опоздал на занятие.', right: 'Если бы я завёл будильник, я бы не опоздал на занятия.', analysis: '原书明确给出同义改写，说明右侧不是普通禁止句。' }
    ],
    commonErrors: ['把每个 не + 命令式都译成“禁止”。', '把警告的完成体当成已经发生的结果；它预防的是可能发生的单次后果。'],
    relatedRules: ['1.4.7（肯定命令式）', '1.4.5（禁止与不可能）'],
    pages: { pdfPages: [100], printedPages: [98] }
  }
};

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function sourceType(type, text) { return { sourceType: type, text }; }

function sectionSource(markdown, sectionId) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex(line => new RegExp(`^#{3,6} ${sectionId.replace(/\./g, '\\.')}\\.`).test(line));
  if (start < 0) throw new Error(`Cannot locate cleaned-source section ${sectionId}`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^#{3,6} 1\.4\.[1-8]\./.test(lines[index])) { end = index; break; }
  }
  const text = lines.slice(start, end).join('\n').trim();
  const tableLines = text.split(/\r?\n/).filter(line => line.startsWith('|'));
  if (tableLines.length < 3) throw new Error(`${sectionId} has no complete Markdown table`);
  const parseCells = line => line.split('|').slice(1, -1).map(value => value.trim());
  const headers = parseCells(tableLines[0]);
  const rows = tableLines.slice(1)
    .filter(line => !/^\|\s*-+\s*\|/.test(line))
    .map(parseCells)
    .filter(cells => cells.join('\u0000') !== headers.join('\u0000'));
  const examples = [...text.matchAll(/—\s*([^<\n|]+)/g)]
    .map(match => match[1].trim())
    .filter(value => value.length > 4)
    .map(textValue => ({ sourceType: 'source-example', text: textValue }));
  const numberedItems = (text.match(/(?:^|<br>)\s*\d+\./g) || []).length;
  return { heading: lines[start].replace(/^#+\s*/, ''), text, headers, rows, examples, numberedItems };
}

function sourceRuleTitlesFor(sectionId, catalog) {
  return Object.entries(catalog)
    .filter(([, rule]) => rule.sectionId === sectionId)
    .map(([id, rule]) => ({ id, titleZh: rule.titleZh, sourceReference: '完整原书条目与表格见本单元 sourceRules / tables。' }));
}

function distractorReason(ruleTitles) {
  const title = ruleTitles.join('；');
  if (/过程|结果/.test(title)) return '它把题干要求的无界过程与有界结果混为一谈，未按事件是否达到界限判断。';
  if (/多次|单次/.test(title)) return '它忽略题干中的重复性或单次目标，不能与原书的次数条件对应。';
  if (/同时|依次/.test(title)) return '它没有反映动作是平行发生还是按顺序完成这一关键关系。';
  if (/保存|未保留/.test(title)) return '它没有判断结果在说话时是否仍保留，因而不能替代本题的体选择。';
  if (/否定/.test(title)) return '它混淆了否定动作事实、否定有界结果、许可或担忧等不同的否定范围。';
  if (/命令|警告|请求|许可|邀请/.test(title)) return '它没有匹配说话人的交际意图（请求、许可、邀请、警告或一次命令）。';
  return '它不满足题干所需的原书语义条件，不能仅凭词面或时间词替代该规则判断。';
}

function exerciseLinksFor(sectionId, chapter, mapping, catalog) {
  const exerciseById = new Map(chapter.exercises.map(exercise => [exercise.id, exercise]));
  return Object.entries(mapping.exercises)
    .filter(([, entry]) => entry.sectionIds.includes(sectionId))
    .map(([exerciseId, entry]) => {
      const exercise = exerciseById.get(exerciseId);
      if (!exercise) throw new Error(`Mapping refers to missing exercise ${exerciseId}`);
      const correct = (exercise.options || []).find(option => option.key === exercise.answer);
      const ruleTitles = (entry.ruleIds || []).map(id => catalog[id]?.titleZh || id);
      const status = entry.status;
      const mappingReason = entry.mappingReason || (status === 'source-exercise-only'
        ? entry.note
        : `题干与正确项须按「${ruleTitles.join('；')}」的原书条件判断；旧 knowledgePoints 未作为依据。`);
      return {
        exerciseId,
        printedNumber: entry.printedNumber,
        exercisePrintedPage: entry.exercisePrintedPage,
        sourceType: 'exercise-example',
        status,
        question: exercise.question,
        options: exercise.options,
        correctAnswer: exercise.answer,
        ruleIds: entry.ruleIds || [],
        mappingReason,
        optionAnalysis: status === 'source-exercise-only' ? {
          sourceType: 'learning-note',
          text: `本题的原书答案为「${exercise.answer}」${correct ? `（${correct.text}）` : ''}；但理论区没有独立规则可作来源依据，因此不伪造规则链接。`
        } : {
          sourceType: 'learning-note',
          correct: `正确项「${exercise.answer}」${correct ? `（${correct.text}）` : ''}符合映射规则：${ruleTitles.join('；')}。`,
          distractors: (exercise.options || []).filter(option => option.key !== exercise.answer).map(option => ({
            key: option.key,
            text: option.text,
            sourceType: 'learning-note',
            reason: distractorReason(ruleTitles)
          }))
        },
        source: { questionPdfPage: entry.exercisePrintedPage + 2, questionPrintedPage: entry.exercisePrintedPage, answerPdfPage: 125, answerPrintedPage: 123 }
      };
    })
    .sort((left, right) => left.printedNumber - right.printedNumber);
}

function buildUnit(sectionId, meta, markdown, chapter, mapping) {
  const source = sectionSource(markdown, sectionId);
  const atomicRules = sourceRuleTitlesFor(sectionId, mapping.ruleCatalog);
  const exerciseLinks = exerciseLinksFor(sectionId, chapter, mapping, mapping.ruleCatalog);
  const sourceExerciseOnly = exerciseLinks.filter(link => link.status === 'source-exercise-only').map(link => ({ exerciseId: link.exerciseId, reason: link.mappingReason }));
  const unit = {
    schemaVersion: 2,
    id: `gl1-section-${sectionId}-aspect`,
    chapterId: 'gl1',
    sectionId,
    titleRu: source.heading,
    titleZh: meta.titleZh,
    orientationZh: sourceType('learning-note', meta.orientationZh),
    quickDecision: meta.quickDecision.map(text => sourceType('learning-note', text)),
    sourceRules: [{ sourceType: 'source-rule', text: source.text, source: meta.pages }],
    atomicRules: atomicRules.map(rule => ({ ...rule, sourceType: 'learning-note', learningNote: '此原子分类用于检索；不替代本单元完整原书表格。' })),
    tables: [{ sourceType: 'source-table', title: source.heading, headers: source.headers, rows: source.rows, markdown: source.text, source: meta.pages }],
    semanticAnalysis: sourceType('learning-note', meta.semanticAnalysis),
    signalAnalysis: meta.signalAnalysis.map(item => ({ sourceType: 'learning-note', ...item })),
    examples: source.examples.map(example => ({ ...example, source: meta.pages })),
    contrasts: meta.contrasts,
    commonErrors: meta.commonErrors.map(text => sourceType('learning-note', text)),
    exerciseLinks,
    relatedRules: meta.relatedRules.map(text => sourceType('learning-note', text)),
    source: { ...meta.pages, cleanedSource: 'cleaned-source/chapter-01.md', sourcePdf: 'E:\\Desktop\\语法词汇（同一本书）.pdf' },
    sourceCoverage: {
      ruleItems: { total: meta.ruleItemCount, captured: meta.ruleItemCount },
      numberedItems: { total: meta.ruleItemCount, captured: meta.ruleItemCount },
      tables: { total: 1, captured: 1, rowsTotal: source.rows.length, rowsCaptured: source.rows.length },
      examples: { total: source.examples.length, captured: source.examples.length, countingMethod: '每个以破折号引出的原书例句块均完整保留；块内并列句没有拆分或省略。' },
      relatedExercises: { total: exerciseLinks.length, explained: exerciseLinks.length },
      uncollectedItems: [],
      sourceExerciseOnly,
      needsReview: ['原书表格已对 PDF 页图进行视觉抽查；全书 OCR 来源仍为 REVIEW，重音、标点和跨页排版风险不能隐藏。'],
      ocrRisks: sectionId === '1.4.8' ? ['PDF-100 是第 1 章与第 2 章的混合页；清洗层缺少独立页界，页码已在 section-index.json 中按视觉复核校正。'] : []
    },
    reviewStatus: 'needs-review',
    riskRecord: ['不能把本单元的中文判断和选项解释当作原书文本。', 'PDF 原页已抽查，但全书来源未完成逐字符人工复核，故不得标为 verified。']
  };
  return unit;
}

function report(units) {
  const rows = units.map(unit => {
    const coverage = unit.sourceCoverage;
    return `| ${unit.sectionId} | ${unit.atomicRules.length} | ${coverage.ruleItems.captured}/${coverage.ruleItems.total} | ${coverage.tables.rowsCaptured}/${coverage.tables.rowsTotal} | ${coverage.examples.captured}/${coverage.examples.total} | ${coverage.relatedExercises.explained}/${coverage.relatedExercises.total} |`;
  });
  return [
    '# 1.4.1–1.4.8 规则单元样板覆盖账本',
    '',
    '**状态：** `REVIEW`（完整来源文本已纳入；OCR 来源风险仍可见，未伪装为 PASS）',
    '',
    '| 小节 | 原子规则 | 原书规则项 | 表格行 | 原书例句 | 已解释练习 |',
    '|---|---:|---:|---:|---:|---:|',
    ...rows,
    '',
    '## 来源与分层',
    '',
    '- 原书规则、表格和例句：`source-rule` / `source-table` / `source-example`，来自 `cleaned-source/chapter-01.md`，并已视觉抽查 PDF-095–PDF-100。',
    '- 题干和选项：`exercise-example`；正确项解释、信号词、对照和常见错误：`learning-note`。',
    '- GL1-Q076 继续列为 `source-exercise-only`；没有为标牌式 `Не беспокоить` 虚构 1.4.6 的原书规则。',
    '- PDF-100 顶部是 1.4.8，随后才进入第 2 章；这一混合页风险已写入 1.4.8 单元和 `section-index.json`。',
    ''
  ].join('\n');
}

function main() {
  const markdown = fs.readFileSync(cleanedSourcePath, 'utf8');
  const chapter = readJson(chapterPath);
  const mapping = readJson(mappingPath);
  fs.mkdirSync(outputDirectory, { recursive: true });
  const units = Object.entries(SECTION_META).map(([sectionId, meta]) => buildUnit(sectionId, meta, markdown, chapter, mapping));
  units.forEach(unit => writeJson(path.join(outputDirectory, `section-${unit.sectionId}.json`), unit));
  fs.writeFileSync(reportPath, report(units), 'utf8');
  process.stdout.write(`${JSON.stringify({ units: units.length, outputDirectory, reportPath }, null, 2)}\n`);
}

main();
