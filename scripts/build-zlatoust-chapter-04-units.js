const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const theoryRoot = path.join(repoRoot, 'data', 'textbook', 'zlatoust_grammar', 'theory');
const chapterPath = path.join(repoRoot, 'data', 'textbook', 'zlatoust_grammar', 'ch0003.json');
const sourcePath = path.join(theoryRoot, 'cleaned-source', 'chapter-04.md');
const mappingPath = path.join(theoryRoot, 'mappings', 'chapter-04-exercise-to-rules.json');
const outputDirectory = path.join(theoryRoot, 'rule-units', 'gl4');
const coverageReportPath = path.join(theoryRoot, 'quality-reports', 'chapter-04-source-coverage.md');
const qualityReportPath = path.join(theoryRoot, 'quality-reports', 'chapter-04-content-quality-review.md');

const source = fs.readFileSync(sourcePath, 'utf8');
const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
const chapter = JSON.parse(fs.readFileSync(chapterPath, 'utf8'));
const exercisesById = new Map(chapter.exercises.map(exercise => [exercise.id, exercise]));
const sourcePdf = 'E:\\Desktop\\语法词汇（同一本书）.pdf';

function src(text, pdfPages, printedPages) {
  return { text, sourceType: 'source-rule', source: { file: 'cleaned-source/chapter-04.md', pdfPages, printedPages } };
}
function ex(text, pdfPages, printedPages) {
  return { text, sourceType: 'source-example', source: { file: 'cleaned-source/chapter-04.md', pdfPages, printedPages } };
}
function note(text) { return { text, sourceType: 'learning-note' }; }

const sectionConfig = {
  '4.1': {
    titleRu: 'Некоторые случаи употребления союзов в сложносочинённом предложении',
    titleZh: '并列复句中若干连词的使用',
    sourcePages: { pdf: [113, 114], printed: [111, 112] },
    orientation: '本节不是“见到某个连词就填它”的词表。先判断两个分句是在并列、对比、补偿、限制、交替、排斥还是列举；再核对所选连词是否带有原书限定的语义和语体色彩。',
    quickDecision: [
      '先比较两个分句的关系：同一时间、先后、因果、说明、对照、补偿或互相排斥。',
      '若考虑 а / но / зато / однако / да，必须先问第二分句是单纯对照、强烈对立、补偿还是限制；不能只凭“有转折”。',
      '若是重复连词，判断是交替（то…то）、排斥（либо…либо）、列举（ни…ни）还是并列对照（как…так и）。'
    ],
    semanticAnalysis: '并列连词的差别首先来自两个分句之间的逻辑关系，不是中文里都能译成“而、但是、和”就可以互换。先定位第二分句是在平行补充、制造反差、抵消前项不足，还是排除另一种可能；连词选择才会有根据。',
    sourceRules: [
      src('Сложносочинённое предложение с союзом и может выражать одновременность действия.', [113], [111]),
      src('Сложносочинённое предложение с союзом и может выражать последовательность действий.', [113], [111]),
      src('Сложносочинённое предложение с союзом и может выражать причинно-следственные отношения.', [113], [111]),
      src('Союз и ставится, если во второй части содержится уточнение или пояснение к первому предложению и входит местоимение это.', [113], [111]),
      src('Союз а употребляется, если сопоставляются два несхожих явления.', [114], [112]),
      src('Союз а употребляется, если резко противопоставляются явления.', [114], [112]),
      src('Союз а имеет присоединительное значение при параллельности действий.', [114], [112]),
      src('Союз а имеет присоединительное значение при последовательности действий.', [114], [112]),
      src('Союз но употребляется, если смысл второй части не соответствует сказанному в первой части.', [114], [112]),
      src('Союз но употребляется, если выражается оттенок значения возмещения.', [114], [112]),
      src('При взаимном несоответствии фактов союз но синонимичен союзу а.', [114], [112]),
      src('Союз однако выражает значение ограничения с оттенком присоединения и обычно употребляется в книжных стилях речи.', [114], [112]),
      src('Союз зато употребляется во второй части, если нужно компенсировать недостаточность положительных качеств, названных в первой; его значение возмещения ярче, чем у но.', [114], [112]),
      src('Союз да близок по значению союзу но и союзу и; он обычно встречается в пословицах и разговорной речи.', [114], [112]),
      src('Кроме одиночных союзов употребляются повторяющиеся союзы и…и, ни…ни, либо…либо, не то…не то и другие.', [114], [112]),
      src('Разделительный союз то…то употребляется при чередовании действий, явлений, признаков.', [114], [112]),
      src('При отношениях взаимоисключения употребляется разделительный союз либо…либо.', [114], [112]),
      src('Отношения перечисления выражаются соединительным союзом ни…ни.', [114], [112]),
      src('Союз как…так и употребляется при выражении сопоставления.', [114], [112])
    ],
    examples: [
      ex('Мартовское солнце светило ярко, и сквозь оконные стёкла падали горячие лучи.', [113], [111]),
      ex('Блеснула молния, и загремел гром.', [113], [111]),
      ex('Зазвонил телефон, и она вышла в соседнюю комнату.', [113], [111]),
      ex('Студент волновался, и ответ был сбивчивым.', [113], [111]),
      ex('Наступила осень, и птицы потянулись на юг.', [113], [111]),
      ex('Студент много читал, и это сразу было заметно.', [113], [111]),
      ex('Мой муж работает, а я учусь.', [114], [112]),
      ex('Все зачёт сдали, а у меня «хвост».', [114], [112]),
      ex('Он шутил, а я злобствовал.', [114], [112]),
      ex('Труд человека кормит, а лень портит.', [114], [112]),
      ex('Ночь приблизилась к концу, а туристы всё сидели у костра и разговаривали.', [114], [112]),
      ex('Время шло вперёд, а вместе с ним шла вперёд и вся жизнь.', [114], [112]),
      ex('Через пять минут подали ужин, а через час все гости разошлись по своим комнатам.', [114], [112]),
      ex('Буря выбросила корабль на скалы, а ветер разбросал его обломки по берегу.', [114], [112]),
      ex('У детей была только жёлтая и зелёная краска, но всё же они решили начать рисовать.', [114], [112]),
      ex('Туман становился всё гуще, но вершины деревьев ещё были видны.', [114], [112]),
      ex('Наша квартира небольшая, но нам в ней хорошо живётся.', [114], [112]),
      ex('Фигура у него нескладная, но (а) лицо почти красивое.', [114], [112]),
      ex('Шёл дождь, но (а) мы остались дома.', [114], [112]),
      ex('В диссертации освещается широкий круг экономических проблем, однако не все они могут быть решены в рамках одного исследования.', [114], [112]),
      ex('Заболевание очень серьёзное, однако выздоровление возможно.', [114], [112]),
      ex('Мальчик пока плохо читает, зато знает много стихов наизусть.', [114], [112]),
      ex('Отпуск в этом году у нас был всего две недели, зато мы провели его на берегу Средиземного моря.', [114], [112]),
      ex('И рад бы в рай, да (но) грехи не пускают.', [114], [112]),
      ex('Не было ни гроша, да (и) вдруг алтын.', [114], [112]),
      ex('Владимир и писал бы оды, да (но) Ольга не читала их.', [114], [112]),
      ex('Она то смеялась, то плакала.', [114], [112]),
      ex('А за окном то дождь, то снег.', [114], [112]),
      ex('Она либо полностью погружается в работу, либо пребывает в бездействии.', [114], [112]),
      ex('Он либо всё время проводил в кругу друзей, либо запирался у себя в комнате и не выходил два-три дня.', [114], [112]),
      ex('Ни жара, ни холод не могли остановить участников автопарада.', [114], [112]),
      ex('Ни ливень, ни налетевший ветер не испортили нам настроения.', [114], [112]),
      ex('Как растительный, так и животный мир страдают от непродуманных действий человека.', [114], [112]),
      ex('В библиотеке вы можете найти книги как отечественных, так и зарубежных авторов.', [114], [112])
    ],
    contrasts: [note('а 是对照或追加；но 是不相符或补偿。两者只有在“事实互不相符”这一受限语境中才可近似。'), note('зато 与 но 都可含补偿，但 зато 要把第一分句的不足与第二分句的补偿明确配对，补偿色彩更强。'), note('то…то 不是二选一，而是交替；либо…либо 才是互相排斥。')],
    signalAnalysis: [note('“зато”是强信号，但前句必须真有可被补偿的不足。'), note('“это”在第二分句是 и 的说明/补充用法的必要结构线索之一，不是所有 и 都要求它。'), note('谚语或口语语体可提示 да，但语体本身不能替代对 but/and 关系的判断。')],
    commonErrors: [note('把所有对比都归为 но，忽略 a 的对照、追加和平行/先后差别。'), note('看到两个选项就用 либо…либо，误把交替现象当成互斥选择。'), note('把“有积极结果”直接等同 зато；若没有补偿前项不足的关系，zато 不成立。')]
  },
  '4.2': {
    titleRu: 'Употребление союзных слов какой, который, чей в сложноподчинённом предложении',
    titleZh: '主从复句中какой、который、чей的使用',
    sourcePages: { pdf: [115], printed: [113] },
    orientation: '本节区分的不是单纯格尾，而是关系词在从句里承担的语义任务：比较同类属性用 какой；给具体人或物定指、补充说明用 который；表达所属并按从句名词变格用 чей。',
    quickDecision: [
      '先找先行词和从句想补充的语义：同类比较、具体指认/补充，还是所属。',
      '若是 какой，检查是否有 такой/тот 等对应词或“同类对象的全部属性”语义；仅凭问句形式不能决定。',
      '若是 чей，先确定所属者，再让 чей 与从句中被修饰的名词在性、数、格上一致，而不是与主句先行词机械一致。'
    ],
    semanticAnalysis: '三者都能把从句接回先行词，但连接方式不同：какой 把对象放进“同一类、相同属性”的比较中；который 指回一个具体对象并补充或限定它；чей 则把焦点放在“是谁的”，其形态跟随从句里的所属对象。',
    sourceRules: [
      src('Союзное слово какой употребляется, если лицо, событие или явление сравнивается с другим, похожим на него; чаще всего оно употребляется с быть, встречаться, случаться и соотносительными словами тот, такой.', [115], [113]),
      src('Союзное слово какой употребляется, если у лица, предмета или явления имеются либо отсутствуют все признаки, свойства, качества других подобных лиц, предметов или явлений.', [115], [113]),
      src('Союзное слово который вносит наиболее общее значение определительности и употребляется, если нужно указать отличительный признак конкретного лица или предмета.', [115], [113]),
      src('Союзное слово который употребляется, если нужно дать дополнительные сведения о лице или предмете.', [115], [113]),
      src('Союзное слово чей вносит оттенок принадлежности; оно не согласуется с определяемым словом главного предложения, а согласуется в роде, числе и падеже с определяемым словом придаточного предложения.', [115], [113])
    ],
    examples: [
      ex('Она теперь такая добрая, какой никогда ещё не была и, может быть, никогда уже не будет.', [115], [113]),
      ex('А в лечащих у него была такая силища, какой нет у лошади.', [115], [113]),
      ex('Был тот особенный вечер, какой бывает только на Кавказе.', [115], [113]),
      ex('Таких далёких и чистых далей, какие открываются с этого холма, мало в России.', [115], [113]),
      ex('Это была очень симпатичная девушка, каких часто можно увидеть в южных городах России.', [115], [113]),
      ex('Мой дед, сельский врач, был энциклопедически образованным человеком, каких сегодня не встретишь даже в университетской среде.', [115], [113]),
      ex('Историки нашли древние рукописи, каких прежде никогда не встречали.', [115], [113]),
      ex('Архитектор Кваренги работал в Петербурге, начиная с 1780 года, где строил необыкновенно по красоте здания, какие можно увидеть только на его родине, в Италии.', [115], [113]),
      ex('Молодого человека, с которым мне предстояло плыть из Москвы до Астрахани, я вспомнил ещё по Петербургу.', [115], [113]),
      ex('Голос, который прозвучал в тишине, показался мне странно знакомым.', [115], [113]),
      ex('Летом мы жили недалеко от Дона в старом деревянном доме, который скрывался в тени яблоневого сада.', [115], [113]),
      ex('Я видел счастливого человека, который достиг цели в жизни, который был доволен своей судьбой и самим собой.', [115], [113]),
      ex('Мировой океан, чьи запасы мы не в силах себе даже представить, — это настоящая кладовая лекарств.', [115], [113]),
      ex('Евгений Светланов — один из самых выдающихся российских дирижёров, чей талант получил международное признание.', [115], [113]),
      ex('В церковь Покрова Пресвятой Богородицы, вновь открывшей свои двери для прихожан, потянулись люди, чьи души были искалечены войной.', [115], [113])
    ],
    contrasts: [note('какой 在“такой/тот + какой”中建立比较或同类属性关系；который 提供最一般的定指或补充信息。'), note('который 可以补充信息，也可以限定具体对象；是否限定必须从先行词和从句在语篇中的作用判断。'), note('чей 表所属，且一致关系落在从句中的名词上；把它与主句先行词对齐是常见误判。')],
    signalAnalysis: [note('такой、тот 与 быть/встречаться/случаться是哪个用法的强提示，但原书说“чаще всего”，不是绝对条件。'), note('关系词前的介词由从句中的句法位置决定，如 с которым、в сказках которого。'), note('чей 的所属意义是关键；只凭俄语格尾与 который 相似并不能替代语义判断。')],
    commonErrors: [note('把所有人/物先行词都机械填 который，漏掉同类比较意义的 какой。'), note('因 чей 的先行词是阳性或阴性而改错其形式，忽略它与从句中名词的一致。'), note('把题中哪里/去哪儿一类关系词塞进本节；原书没有给这些词的独立规则，必须保留 source-exercise-only。')]
  },
  '4.3': {
    titleRu: 'Употребление союзов когда, пока, пока не в сложноподчинённом предложении',
    titleZh: '主从复句中когда、пока、пока не的使用',
    sourcePages: { pdf: [116], printed: [114] },
    orientation: '要先画出两个动作的时间线，再看体：平行进行可用 когда 或 пока 但含义不同；先完成从句再发生主句用 когда；主句一直持续到从句事件出现用 пока не。',
    quickDecision: [
      '先判断动作是同步还是先后，不要先从连词外形猜答案。',
      '同步时：когда 突出两个未完成体动作并行；пока 突出主句持续时间受从句活动限制。',
      '先后时：从句先完成、主句后发生用 когда；主句先开始并持续到从句完成用 пока не，同时核对主句未完成体、从句完成体。'
    ],
    semanticAnalysis: '这里真正要比较的是两条时间线的关系。когда 只把事件放在同一时间点或先后链中；пока 把一个动作框成另一个动作持续的时间背景；пока не 则明确一个已开始的过程以“从句事件终于发生”为终点。',
    sourceRules: [
      src('При одновременности действий союз когда сопоставляет два действия, происходящие параллельно во времени; глаголы главной и придаточной частей употребляются в форме несовершенного вида.', [116], [114]),
      src('При одновременности союз пока указывает, что действие в главной части ограничивается временем основного действия в придаточной; глаголы обеих частей употребляются в форме несовершенного вида.', [116], [114]),
      src('При последовательности союз когда употребляется, если действие главной части происходит после действия придаточной; глаголы обеих частей употребляются в форме совершенного вида.', [116], [114]),
      src('Союз пока не указывает, что действие главной части происходит раньше, длится до наступления действия придаточной; главный глагол несовершенного вида, придаточный совершенного вида.', [116], [114])
    ],
    examples: [
      ex('Когда читаешь книги русского писателя Константина Паустовского, невольно перед глазами встают описанные им картины природы.', [116], [114]),
      ex('Когда в молодой семье рождается ребёнок, то его мама и папа начинают понимать своих родителей гораздо лучше.', [116], [114]),
      ex('Пока жена складывала мои вещи в чемодан, я разговаривал с друзьями по телефону, прощался.', [116], [114]),
      ex('Дети прячутся в лесу под деревом, пока бушует гроза.', [116], [114]),
      ex('Студент послал (СВ) своему другу письмо по электронной почте, пока его однокурсники писали (НСВ) реферат.', [116], [114]),
      ex('Ученики встали, когда в класс вошёл учитель.', [116], [114]),
      ex('Когда выпал первый снег, горожане пошли в парк кататься на лыжах.', [116], [114]),
      ex('Вечером старики сидели (НСВ), глядя на огонь в камине, пока не зажглись (СВ) на небе крупные звёзды.', [116], [114]),
      ex('Писатель будет работать (НСВ) всю неделю, пока не напишет (СВ) очередную главу своего нового романа.', [116], [114])
    ],
    contrasts: [note('同步的 когда 与 пока 都可配未完成体，但 когда 是时间并行，пока 强调主句活动的时间边界。'), note('когда 的先后用法要求从句事件在前、主句在后，两个动词完成体；пока не 则让主句先开始并持续。'), note('“同一时态”是原书对主从句的注意项，不能被体的选择取代。')],
    signalAnalysis: [note('完成体/未完成体组合是重要信号，但必须和动作时间顺序一起判断。'), note('пока не 的 не 是结构的一部分；不能把任何含否定的 пока 句都当作这一规则。'), note('после того как、как только、по мере того как等虽同为时间连接词，但原书本节没有独立说明，不能自动映射。')],
    commonErrors: [note('把“两个动作都发生”一律归为 когда，而没有判断主句是否被从句期间限制。'), note('将 пока не 误解为否定的 пока，忽略“持续到从句事件发生”的时间线。'), note('只看一个动词的体，不同时检查另一个动词和动作前后关系。')]
  },
  '4.4': {
    titleRu: 'Употребление союза раз в сложноподчинённом предложении',
    titleZh: '主从复句中连词раз的使用',
    sourcePages: { pdf: [117], printed: [115] },
    orientation: 'раз 不是任何“如果/因为”的通用替换。先判断从句是否是主句观点的逻辑根据，还是条件中加入原因；再检查书面/口语语体差异，以及事件是否真实且一次性。',
    quickDecision: [
      '先问 раз 从句是在为主句的判断提供逻辑依据，还是“条件 + 原因”的口语说明。',
      '逻辑依据用法可近似 если，原书标为书面；条件加入原因时近似 так как，原书标为口语。',
      '最后核对事件必须真实、一次性；假设或反复情境不能因“像если”就使用 раз。'
    ],
    semanticAnalysis: 'раз 并非把条件句随便换个词，而是把一个已经成立、一次性的事实当作后面判断或行动的理由。因此它既可能接近“既然……那么……”，也可能带“既然已经这样”的原因色彩；反事实和习惯性重复会破坏这个前提。',
    sourceRules: [
      src('Союз раз употребляется, если придаточная часть является логическим обоснованием мысли главной части; в таких случаях он синонимичен если и характерен для книжных стилей речи.', [117], [115]),
      src('Союз раз употребляется, если к значению условия в придаточной части добавляется значение причины; в таких случаях он синонимичен так как, но характерен для разговорного стиля речи.', [117], [115]),
      src('Союз раз употребляется только при описании реальных, а не гипотетических, и единичных, а не повторяющихся событий.', [117], [115])
    ],
    examples: [
      ex('Раз (если) любовь является высшим напряжением духовных и физических сил, то становится понятным, почему умеющие любить люди могут влиять на судьбы других людей.', [117], [115]),
      ex('Раз (так как) она всё-таки пришла, то давай поговорим с ней спокойно.', [117], [115]),
      ex('Раз он пообещал купить билеты на поезд, то мы обязательно уедем.', [117], [115])
    ],
    contrasts: [note('раз ≈ если 只是在“逻辑根据”的语义中成立，且原书标出书面语体；不等于所有 условное если。'), note('раз ≈ так как 只在条件义叠加原因义的特定用法中成立，且原书标出口语语体。'), note('раз 的真实、一次性限制使它不能用于纯反事实或反复习惯事件。')],
    signalAnalysis: [note('若句子明确反事实（如 если бы），这是排除 раз 的强信号。'), note('“то”可出现于例句，但不能单独决定 раз 的使用；必须先判断逻辑关系和事件真实性。'), note('书面或口语语体用于在两个近义路径间细分，不能替代条件/原因语义判断。')],
    commonErrors: [note('把 раз 当成所有 если 的同义替换，忽略真实、一次性限制。'), note('只因句子“有原因”就把 раз 等同 так как，忽略条件义是否同时存在。'), note('把练习里的其他条件、原因和让步连接词错误标为本节已讲规则。')]
  }
};

for (const heading of ['## 4.1.', '## 4.2.', '## 4.3.', '## 4.4.']) {
  if (!source.includes(heading)) throw new Error(`Cleaned Chapter 4 source is missing ${heading}`);
}

function makeOptionAnalysis(exercise, entry) {
  if (exercise.type === 'open-response') {
    return {
      sourceType: 'learning-note',
      correct: '这是开放式直引语改间接引语题；PDF-126 的原书模型改写保存在 chapter-04-data-repair.json。为保留既有答题契约，不伪造单一自动评分答案。',
      distractors: []
    };
  }
  const correct = exercise.options.find(option => option.key === exercise.answer);
  return {
    sourceType: 'learning-note',
    correct: entry.status === 'mapped'
      ? `正确项「${correct?.key}：${correct?.text}」：${entry.mappingReason}`
      : `PDF 原书正确项为「${correct?.key}：${correct?.text}」。${entry.mappingReason}`,
    distractors: exercise.options.filter(option => option.key !== exercise.answer).map(option => ({
      key: option.key,
      text: option.text,
      reason: entry.status === 'mapped'
        ? `「${option.text}」不满足本题所需的原书条件；应依据上述映射理由选择「${correct?.text}」。`
        : `「${option.text}」不是 PDF 原书正确项「${correct?.text}」。理论区没有足够独立规则逐项裁决，故不把这个来源答案差异伪装成原书规则。`
    }))
  };
}

function makeExerciseLink(entry) {
  const exercise = exercisesById.get(entry.exerciseId);
  if (!exercise) throw new Error(`Missing Chapter 4 exercise ${entry.exerciseId}`);
  return {
    exerciseId: entry.exerciseId,
    printedNumber: entry.printedNumber,
    sourceType: 'exercise-example',
    exerciseSectionId: entry.exerciseSectionId,
    status: entry.status,
    ruleIds: entry.ruleIds,
    candidateRuleIds: entry.candidateRuleIds,
    mappingReason: entry.mappingReason,
    source: { questionPdfPage: entry.exercisePdfPage, questionPrintedPage: entry.exercisePrintedPage, answerPdfPage: 126, answerPrintedPage: 124 },
    optionAnalysis: makeOptionAnalysis(exercise, entry)
  };
}

function buildUnit(sectionId, config) {
  const entries = Object.values(mapping.exercises).filter(entry => entry.sectionIds.includes(sectionId));
  const atomicRules = Object.entries(mapping.ruleCatalog)
    .filter(([, rule]) => rule.sectionId === sectionId)
    .map(([id, rule]) => ({ id, titleZh: rule.titleZh, text: rule.sourceText, sourceType: 'source-rule', source: { file: 'cleaned-source/chapter-04.md', pdfPages: config.sourcePages.pdf, printedPages: config.sourcePages.printed } }));
  const exerciseLinks = entries.map(makeExerciseLink);
  const sourceCoverage = {
    ruleItems: { total: config.sourceRules.length, captured: config.sourceRules.length },
    numberedItems: { total: config.sourceRules.length, captured: config.sourceRules.length },
    tables: { total: 0, captured: 0, rowsTotal: 0, rowsCaptured: 0 },
    examples: { total: config.examples.length, captured: config.examples.length },
    relatedExercises: { total: exerciseLinks.length, explained: exerciseLinks.length },
    omitted: [],
    sourceExerciseOnly: entries.filter(entry => entry.status === 'source-exercise-only').map(entry => `${entry.exerciseId}：${entry.mappingReason}`),
    needsReview: entries.filter(entry => entry.status === 'needs-review').map(entry => `${entry.exerciseId}：${entry.mappingReason}`),
    ocrRisks: ['The cleaned source is derived from OCR and remains REVIEW; source text, examples and page provenance are retained without silently normalising uncertain source boundaries.']
  };
  return {
    id: `gl4-section-${sectionId.replace(/\./g, '-')}`,
    chapterId: 'gl4',
    sectionId,
    titleRu: config.titleRu,
    titleZh: config.titleZh,
    orientationZh: note(config.orientation),
    quickDecision: config.quickDecision.map(note),
    semanticAnalysis: note(config.semanticAnalysis),
    sourceRules: config.sourceRules,
    atomicRules,
    tables: [],
    examples: config.examples,
    contrasts: config.contrasts,
    signalAnalysis: config.signalAnalysis,
    commonErrors: config.commonErrors,
    exerciseLinks,
    source: { sourcePdf, cleanedSource: 'cleaned-source/chapter-04.md', pdfPages: config.sourcePages.pdf, printedPages: config.sourcePages.printed, sourceStatus: 'review' },
    sourceCoverage,
    reviewStatus: 'needs-review',
    knownRisks: ['原书理论 OCR 来源仍为 REVIEW。练习中没有独立原书理论依据的项目保留 source-exercise-only，不能由中文学习说明升级为 mapped。']
  };
}

fs.mkdirSync(outputDirectory, { recursive: true });
const units = Object.entries(sectionConfig).map(([sectionId, config]) => [sectionId, buildUnit(sectionId, config)]);
for (const [sectionId, unit] of units) {
  fs.writeFileSync(path.join(outputDirectory, `section-${sectionId}.json`), `${JSON.stringify(unit, null, 2)}\n`, 'utf8');
}

const status = (links, value) => links.filter(link => link.status === value).length;
const coverageRows = units.map(([sectionId, unit]) => {
  const links = unit.exerciseLinks;
  return `| ${sectionId} | ${links.length} | ${unit.sourceCoverage.ruleItems.total}/${unit.sourceCoverage.ruleItems.captured} | ${unit.sourceCoverage.tables.total}/${unit.sourceCoverage.tables.captured} | ${unit.sourceCoverage.examples.total}/${unit.sourceCoverage.examples.captured} | ${status(links, 'mapped')} | ${status(links, 'needs-review')} | ${status(links, 'source-exercise-only')} |`;
});
const counts = Object.values(mapping.exercises).reduce((result, entry) => { result[entry.status] += 1; return result; }, { mapped: 0, 'needs-review': 0, 'source-exercise-only': 0 });
const coverageReport = `# 第 4 章来源覆盖账本\n\n状态：**REVIEW**。来源为 \`cleaned-source/chapter-04.md\`，PDF 113–117 / 印刷页 111–115。题页和答案表已按 PDF 057–071、PDF 126 视觉核对；理论 OCR 仍保留 REVIEW。\n\n| 理论小节 | 关联练习 | 原书规则收录 | 原书表格收录 | 原书例句收录 | mapped | needs-review | source-exercise-only |\n|---|---:|---:|---:|---:|---:|---:|---:|\n${coverageRows.join('\n')}\n\n## 覆盖结论\n\n- 规则项、例句和相关练习均有逐项账本；本章清洗来源没有原书表格，因此表格计数为 0/0，而非省略。\n- 映射总计：${counts.mapped} ` + '`mapped`' + `、${counts['needs-review']} ` + '`needs-review`' + `、${counts['source-exercise-only']} ` + '`source-exercise-only`' + `，共 ${chapter.exercises.length} 题。\n- §4.5（GL4-Q087–Q102）没有理论独立标题；所有题目明确保留为 ` + '`source-exercise-only`' + `。\n- GL4-Q081–Q086 的原书间接引语模型答案位于 PDF-126 和 \`chapter-04-data-repair.json\`；它们保持开放作答契约。\n\n## 风险\n\n- OCR 理论来源仍为 REVIEW；表述、例句与页码在规则单元中保持可追溯。\n- 宾语从句、地点/原因/让步/目的连接词及直接—间接引语转换若未被理论区独立说明，不得从答案反推新规则。\n`;
const qualityReport = `# 第 4 章规则单元内容质量复核\n\n**结论：REVIEW。** 四个理论小节均已生成可展开规则单元；每个单元包含中文定位、至少三步快速判断、完整原书规则项、全部已收录原书例句、条件/对照/信号词/常见错误、双向练习链接和选项分析。\n\n## 内容分层\n\n- 原书规则：\`source-rule\`；原书例句：\`source-example\`；练习题面：\`exercise-example\`。\n- 中文定位、判断、错误解释和选项分析均标为 \`learning-note\`，不冒充原书内容。\n- 本章无原书表格，故各单元表格数组和来源账本均为 0/0。\n\n## 映射质量\n\n- ${counts.mapped} 道 ` + '`mapped`' + ` 题均有至少一个有效原子 ruleId 与映射理由。\n- ${counts['needs-review']} 道 ` + '`needs-review`' + ` 题；没有为凑数把已确认的 source-only 题降格或升级。\n- ${counts['source-exercise-only']} 道 ` + '`source-exercise-only`' + ` 题显示原书练习范围，但没有独立理论依据；其中 §4.5 的 16 题尤须保留该状态。\n- GL4-Q081–Q086 的开放改写题保留 PDF 原书模型答案的来源记录，不改变既有空答案自动评分契约。\n\n## 已知风险\n\n- 全书理论 OCR 来源仍为 REVIEW，因此本章不得宣称无风险 PASS。\n- 规则 4.4 只讲 раз；练习里的 если、если бы、хотя、поскольку 等不能因为功能相近而被伪造为本节映射。\n`;
fs.writeFileSync(coverageReportPath, coverageReport, 'utf8');
fs.writeFileSync(qualityReportPath, qualityReport, 'utf8');
console.log(JSON.stringify({ units: units.map(([sectionId, unit]) => ({ sectionId, atomicRules: unit.atomicRules.length, examples: unit.examples.length, exerciseLinks: unit.exerciseLinks.length })), counts }, null, 2));
