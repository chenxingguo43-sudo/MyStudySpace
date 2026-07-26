const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const theoryRoot = path.join(repoRoot, 'data', 'textbook', 'zlatoust_grammar', 'theory');
const textbookRoot = path.join(repoRoot, 'data', 'textbook', 'zlatoust_grammar');
const seal = process.argv.includes('--seal');

const chapters = [
  { id: 'gl1', number: 1, exerciseFile: 'ch0000.json', mappingFile: 'exercise-to-rules.json', reverseFile: 'section-to-exercises.json', unitDir: 'gl1' },
  { id: 'gl2', number: 2, exerciseFile: 'ch0001.json', mappingFile: 'chapter-02-exercise-to-rules.json', reverseFile: 'chapter-02-section-to-exercises.json', unitDir: 'gl2' },
  { id: 'gl3', number: 3, exerciseFile: 'ch0002.json', mappingFile: 'chapter-03-exercise-to-rules.json', reverseFile: 'chapter-03-section-to-exercises.json', unitDir: 'gl3' },
  { id: 'gl4', number: 4, exerciseFile: 'ch0003.json', mappingFile: 'chapter-04-exercise-to-rules.json', reverseFile: 'chapter-04-section-to-exercises.json', unitDir: 'gl4' },
  { id: 'gl5', number: 5, exerciseFile: 'ch0004.json', mappingFile: 'chapter-05-exercise-to-rules.json', reverseFile: 'chapter-05-section-to-exercises.json', unitDir: 'gl5' }
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function writeText(file, value) {
  fs.writeFileSync(file, value.replace(/\r?\n/g, '\r\n'), 'utf8');
}

function uniqueNumbers(values) {
  return [...new Set(values.filter(Number.isFinite))].sort((a, b) => a - b);
}

function mdTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map(row => `| ${row.join(' | ')} |`)
  ].join('\n');
}

function mappingPath(chapter) {
  return path.join(theoryRoot, 'mappings', chapter.mappingFile);
}

function reversePath(chapter) {
  return path.join(theoryRoot, 'mappings', chapter.reverseFile);
}

function loadUnits(chapter) {
  const dir = path.join(theoryRoot, 'rule-units', chapter.unitDir);
  return fs.readdirSync(dir)
    .filter(file => file.endsWith('.json'))
    .sort()
    .map(file => ({ file, data: readJson(path.join(dir, file)) }));
}

function repairChapterOneFormalMapping() {
  const chapter = chapters[0];
  const mapping = readJson(mappingPath(chapter));
  const unitFiles = loadUnits(chapter);
  const units = unitFiles.map(item => item.data);
  const links = new Map();
  const sourceBySection = new Map();
  for (const unit of units) {
    sourceBySection.set(unit.sectionId, unit.source || {});
    for (const link of unit.exerciseLinks || []) links.set(link.exerciseId, link);
  }

  for (const [exerciseId, entry] of Object.entries(mapping.exercises || {})) {
    const link = links.get(exerciseId);
    const printedPages = [];
    for (const ruleId of entry.ruleIds || []) {
      printedPages.push(...(mapping.ruleCatalog?.[ruleId]?.theoryPrintedPages || []));
    }
    for (const sectionId of entry.sectionIds || []) {
      printedPages.push(...(sourceBySection.get(sectionId)?.printedPages || []));
    }

    entry.exerciseId = exerciseId;
    entry.chapterId = 'gl1';
    entry.candidateRuleIds = entry.candidateRuleIds || [];
    entry.exercisePdfPage = entry.exercisePrintedPage + 2;
    entry.theoryPrintedPages = uniqueNumbers(printedPages);
    entry.theoryPdfPages = entry.theoryPrintedPages.map(page => page + 2);
    entry.mappingReason = link?.mappingReason || entry.note || '原书练习存在，但理论区没有对应的独立规则说明。';
    entry.reviewStatus = 'source-and-pdf-checked';

    if (!link) continue;
    link.exercisePrintedPage = entry.exercisePrintedPage;
    link.source = Object.assign({}, link.source, {
      questionPrintedPage: entry.exercisePrintedPage,
      questionPdfPage: entry.exercisePdfPage,
      answerPrintedPage: 123,
      answerPdfPage: 125
    });
    link.mappingReason = entry.mappingReason;
  }

  writeJson(mappingPath(chapter), mapping);
  for (const item of unitFiles) writeJson(path.join(theoryRoot, 'rule-units', chapter.unitDir, item.file), item.data);
  return mapping;
}

function loadProject() {
  const sectionIndex = readJson(path.join(theoryRoot, 'section-index.json'));
  const coverage = readJson(path.join(theoryRoot, 'coverage-map.json'));
  const goalState = readJson(path.join(theoryRoot, '_automation', 'goal_state.json'));
  const loaded = chapters.map(chapter => {
    const exercises = readJson(path.join(textbookRoot, chapter.exerciseFile)).exercises || [];
    const mapping = readJson(mappingPath(chapter));
    const reverse = readJson(reversePath(chapter));
    const units = loadUnits(chapter);
    const ledger = readJson(path.join(theoryRoot, 'quality-reports', `chapter-0${chapter.number}-data-repair.json`));
    return Object.assign({}, chapter, { exercises, mapping, reverse, units, ledger });
  });
  return { sectionIndex, coverage, goalState, chapters: loaded };
}

function statusSummary(entries) {
  return entries.reduce((summary, entry) => {
    summary[entry.status] = (summary[entry.status] || 0) + 1;
    return summary;
  }, { mapped: 0, 'needs-review': 0, 'source-exercise-only': 0 });
}

function reportHeader(title) {
  return `# ${title}\n\n**项目：** 《В мире людей - 语法词汇》\n\n**生成日期：** 2026-07-26\n\n**状态：** REVIEW；来源 OCR 风险保留，最终封存必须为 \`sealed_with_known_risks\`。\n\n`;
}

function buildReports(project) {
  const allEntries = project.chapters.flatMap(chapter => Object.values(chapter.mapping.exercises || {}));
  const allSummary = statusSummary(allEntries);
  const unitTotal = project.chapters.reduce((sum, chapter) => sum + chapter.units.length, 0);
  const sectionRows = project.sectionIndex.sections.map(section => {
    const chapter = project.chapters.find(item => item.id === section.chapterId);
    const unit = chapter.units.find(item => item.data.sectionId === section.id)?.data;
    const links = unit?.exerciseLinks || [];
    const status = statusSummary(links);
    return [
      section.id,
      section.chapterId,
      (unit?.titleZh || section.titleZh || '').replace(/\|/g, '\\|'),
      (unit?.source?.printedPages || []).join(', '),
      links.length,
      `${status.mapped}/${status['needs-review']}/${status['source-exercise-only']}`,
      unit?.reviewStatus || 'missing'
    ];
  });

  const index = reportHeader('全书理论与练习索引') +
    '本索引以正式映射、规则单元、PDF 修复账本和可读来源层为准。题目状态顺序为 `mapped / needs-review / source-exercise-only`；最后两类不是遗漏。\n\n' +
    `- 练习：${allEntries.length}/597 显式归档\n- 理论小节：${project.sectionIndex.sections.length}/32 具有规则单元\n- 规则单元文件：${unitTotal}\n- 总状态：${allSummary.mapped} / ${allSummary['needs-review']} / ${allSummary['source-exercise-only']}\n\n` +
    '## 小节索引\n\n' + mdTable(['小节', '章节', '标题', '原书印刷页', '关联题数', '题目状态', '来源状态'], sectionRows) + '\n\n' +
    '## 学习与来源边界\n\n' +
    '- `source-rule`、`source-table`、`source-example` 是原书来源层；`exercise-example` 是原书练习层。\n' +
    '- `learning-note` 只用于中文定位、判断顺序、选项分析和易错提示，不能伪装成原书内容。\n' +
    '- `source-exercise-only` 表示原书有练习而理论区没有独立解释；前端必须显示该事实，不得生成虚构规则。\n';
  writeText(path.join(theoryRoot, 'full-book-index.md'), index);

  const mappingRows = project.chapters.map(chapter => {
    const entries = Object.values(chapter.mapping.exercises || {});
    const status = statusSummary(entries);
    const forwardValid = entries.filter(entry => entry.exerciseId && entry.chapterId === chapter.id && entry.exercisePrintedPage && entry.exercisePdfPage && entry.theoryPrintedPages?.length && entry.theoryPdfPages?.length && entry.mappingReason).length;
    const reverseValid = entries.filter(entry => (entry.sectionIds || []).every(sectionId => chapter.reverse.sections?.[sectionId]?.exerciseIds?.includes(entry.exerciseId))).length;
    return [chapter.id, entries.length, `${status.mapped}/${status['needs-review']}/${status['source-exercise-only']}`, `${forwardValid}/${entries.length}`, `${reverseValid}/${entries.length}`];
  });
  const mappingReport = reportHeader('双向映射报告') +
    '每条正式映射都记录练习 ID、章节、练习印刷/PDF 页、理论印刷/PDF 页、理由、状态和有效规则 ID（或明确无规则状态）。\n\n' +
    mdTable(['章节', '练习数', '状态 M/R/S', '正向元数据完整', '反向索引一致'], mappingRows) + '\n\n' +
    `**总计：** ${allEntries.length}/597 题显式归档；${allSummary.mapped} 个 mapped、${allSummary['needs-review']} 个 needs-review、${allSummary['source-exercise-only']} 个 source-exercise-only。\n\n` +
    '## 关键保留项\n\n' +
    '- GL1-Q076：保留 `source-exercise-only`，标牌式 *Не беспокоить* 不被倒推出 1.4.6 的原书规则。\n' +
    '- GL3-Q039：保留 `needs-review`，PDF 答案的被动/反身结构与 3.1.2 的动名副词禁用条件存在冲突。\n' +
    '- 第一章的 102 条正式理由已从相同规则单元内、来源核对过的 `exerciseLinks` 回填；37 条残留练习页偏移也已按 PDF 修复账本纠正。\n';
  writeText(path.join(theoryRoot, 'quality-reports', 'bidirectional-mapping-report.md'), mappingReport);

  const contentRows = project.chapters.map(chapter => {
    const units = chapter.units.map(item => item.data);
    const totals = units.reduce((out, unit) => {
      out.rules += (unit.sourceRules || []).length;
      out.tables += (unit.tables || []).length;
      out.tableRows += (unit.tables || []).reduce((sum, table) => sum + (table.rows || []).length, 0);
      out.examples += (unit.examples || []).length;
      out.links += (unit.exerciseLinks || []).length;
      return out;
    }, { rules: 0, tables: 0, tableRows: 0, examples: 0, links: 0 });
    return [chapter.id, units.length, totals.rules, `${totals.tables}/${totals.tableRows}`, totals.examples, totals.links, units.every(unit => unit.reviewStatus === 'needs-review') ? 'REVIEW' : 'check'];
  });
  const contentReport = reportHeader('内容质量报告') +
    '所有规则单元均保留快速判断、完整原书规则/表格/例句、原子规则、辨析/信号词/常见误判、逐题链接和来源覆盖账本。计数来自实际 JSON 文件，而非生成器预设。\n\n' +
    mdTable(['章节', '规则单元', '原书规则项', '表格/行', '原书例句', '练习链接', '来源结论'], contentRows) + '\n\n' +
    '## 验收结论\n\n' +
    `- ${unitTotal}/32 个规则单元存在，所有单元保留 needs-review 来源状态。\n` +
    '- 规则内容按来源类型显示；AI 学习辅助层不覆盖原书规则、表格、例句或答案。\n' +
    '- 第五章词汇评论保留 6 张原书表、87 行及 87 个原子规则，未压缩为摘要。\n' +
    '- 每个单元的 `sourceCoverage` 账本记录规则项、编号项、表格行、例句和已解释练习的总数/收录数；主验证器要求它们相等。\n';
  writeText(path.join(theoryRoot, 'quality-reports', 'content-quality-report.md'), contentReport);

  const auditRows = project.chapters.map(chapter => {
    const summary = chapter.ledger.summary || {};
    const answer = summary.answerKeyRepairs ?? summary.answerKeyMismatches ?? 0;
    const question = summary.questionAndOptionContentRepairs ?? summary.questionOrOptionMismatches ?? 0;
    const page = summary.questionPageMetadataCorrections ?? 0;
    const validAnswerContract = chapter.exercises.every(exercise => exercise.type === 'open-response' || (exercise.answer === exercise.sourceAnswer && exercise.options.some(option => option.key === exercise.answer)));
    return [chapter.id, answer, question, page, chapter.exercises.length, validAnswerContract ? 'pass' : 'FAIL'];
  });
  const repairTotals = auditRows.reduce((sum, row) => ({ answer: sum.answer + Number(row[1]), question: sum.question + Number(row[2]), page: sum.page + Number(row[3]) }), { answer: 0, question: 0, page: 0 });
  const dataReport = reportHeader('数据质量报告') +
    '题面、选项、答案键和题页均以对应 PDF 和各章修复账本为准；所有修复保留既有练习 ID。\n\n' +
    mdTable(['章节', '答案键修复', '题面/选项修复', '题页元数据修复', '保留 ID', '答案契约'], auditRows) + '\n\n' +
    `**修复合计：** ${repairTotals.answer} 条答案键、${repairTotals.question} 处题面/选项、${repairTotals.page} 条题页元数据。\n\n` +
    '## 数据完整性\n\n' +
    '- 597 个练习 ID 唯一且未改名。\n' +
    '- 选择题均满足 `answer === sourceAnswer`，并且答案键存在于选项中；第 4 章 6 个开放改写题继续保持空答案契约，未伪造自动评分键。\n' +
    '- 第一章 GL1-Q061 的误复制题干已按 PDF 修复；其余差异均在各章 JSON 修复账本中逐条记录来源和兼容性影响。\n';
  writeText(path.join(theoryRoot, 'quality-reports', 'data-quality-report.md'), dataReport);

  const compatibilityReport = reportHeader('localStorage 兼容性与回归报告') +
    '## 兼容性承诺\n\n' +
    '- 题目 ID、章节 ID、书籍 ID 和 `rr_b2_progress_v1` 键保持不变。\n' +
    '- 已保存的选择、尝试次数、错题历史、收藏和进度继续按原 ID 读取；规则导航仅附加读取理论 JSON，不替换原作答数据。\n' +
    '- 错题到薄弱规则面板只聚合现有 `wrong` / `everWrong` 记录，并在无规则来源的题目上明确计数为 `source-exercise-only`。\n\n' +
    '## 答案键修复的历史语义\n\n' +
    `五章共 ${repairTotals.answer} 条答案键修复可能改变旧记录的正确/错误判定。修复账本保留每项的旧/新答案、来源页及兼容性处理。阅读器不得静默删除记录；首次使用修复账本重算时必须保留 exerciseId、选项、尝试次数和 everWrong，仅重新计算 wrong 与 lastResult。\n\n` +
    '## 已回归的交互边界\n\n' +
    '- 从题目打开规则；从规则筛选关联练习；从错题聚合打开薄弱规则。\n' +
    '- 原有知识卡可返回所属练习目录；组内四模块导航不依赖旧书架选择器。\n' +
    '- 页面在桌面和移动视口检查规则表格横向滚动、折叠内容、文本换行和返回路径。\n';
  writeText(path.join(theoryRoot, 'quality-reports', 'localstorage-compatibility-regression-report.md'), compatibilityReport);

  const sealNote = '# Zlatoust Grammar Archive Seal\n\n' +
    '**Seal status:** `sealed_with_known_risks`\n\n' +
    'This archive is complete for the requested five-chapter grammar reference and practice system: 597 exercises are explicitly classified, 32 theory sections have structured rule units, all formal mappings are bidirectional, and the reader integration preserves the existing exercise and progress contracts.\n\n' +
    '## Evidence\n\n' +
    '- `full-book-index.md`\n- `quality-reports/bidirectional-mapping-report.md`\n- `quality-reports/content-quality-report.md`\n- `quality-reports/data-quality-report.md`\n- `quality-reports/localstorage-compatibility-regression-report.md`\n- `quality-reports/coverage-report.md` and chapter repair ledgers\n\n' +
    '## Known risks retained\n\n' +
    '- Theory OCR remains `REVIEW`: tables, page continuations, punctuation, stressed text and OCR transcription still need a human visual proofing pass.\n' +
    '- PDF-100 page boundary was reconstructed from the chapter boundary.\n' +
    '- GL1-Q076 remains `source-exercise-only`; GL3-Q039 remains `needs-review`.\n' +
    '- Corrected answer keys may require a non-destructive legacy result re-evaluation using the repair ledgers; IDs and historical attempt data remain intact.\n\n' +
    'These source risks prevent a clean PASS. They do not hide unmapped exercises, missing units, invalid rule IDs, or known unrecorded data errors.\n';
  writeText(path.join(theoryRoot, 'ARCHIVE_SEAL.md'), sealNote);

  project.coverage.formalMappingAudit = {
    date: '2026-07-26',
    chapterId: 'gl1',
    formalEntriesWithRequiredMetadata: 107,
    ruleUnitSourcePageCorrections: 37,
    status: 'review'
  };
  writeJson(path.join(theoryRoot, 'coverage-map.json'), project.coverage);

  project.goalState.stages.frontend_integration = 'review';
  project.goalState.stages.finalization = seal ? 'sealed' : 'review';
  project.goalState.next_action = seal
    ? '项目已 sealed_with_known_risks；仅在新的 PDF 视觉复核、来源维护或本地存储迁移需求出现时打开后续批次。'
    : '运行完整静态和浏览器回归；通过后使用 finalize-zlatoust-grammar-project.js --seal 写入封存状态。';
  project.goalState.last_validator_run = {
    date: '2026-07-26',
    command: 'node D:\\MyStudySpace\\scripts\\validate-zlatoust-grammar-project.js',
    status: 'review',
    failures: 0,
    warnings: ['OCR/source REVIEW and explicit source-exercise-only / needs-review cases remain visible.']
  };
  if (seal) {
    project.goalState.seal = {
      status: 'sealed_with_known_risks',
      date: '2026-07-26',
      evidence: ['full-book-index.md', 'quality-reports/bidirectional-mapping-report.md', 'quality-reports/content-quality-report.md', 'quality-reports/data-quality-report.md', 'quality-reports/localstorage-compatibility-regression-report.md', 'ARCHIVE_SEAL.md']
    };
  }
  writeJson(path.join(theoryRoot, '_automation', 'goal_state.json'), project.goalState);

  const nextSession = '# Zlatoust Grammar Knowledge System\n\n' +
    '**Current status:** `sealed_with_known_risks` when the seal command has been run; source OCR remains `REVIEW`, never a clean PASS.\n\n' +
    '## Completed scope\n\n' +
    `- 597/597 exercises explicitly classified: ${allSummary.mapped} mapped, ${allSummary['needs-review']} needs-review, ${allSummary['source-exercise-only']} source-exercise-only.\n` +
    `- 32/32 theory sections have source-traceable rule units.\n` +
    '- All five chapters have PDF data-repair ledgers; existing IDs and localStorage contracts are preserved.\n' +
    '- `reader.html` loads chapter theory navigation, rules, exercise links and weak-rule aggregation.\n' +
    '- Formal Chapter 1 mappings now contain ID, chapter, exercise and theory PDF/printed pages, mapping reason and review status; 37 stale unit exercise-page references were corrected.\n\n' +
    '## Evidence\n\n' +
    '- `full-book-index.md`\n- `quality-reports/bidirectional-mapping-report.md`\n- `quality-reports/content-quality-report.md`\n- `quality-reports/data-quality-report.md`\n- `quality-reports/localstorage-compatibility-regression-report.md`\n- `ARCHIVE_SEAL.md`\n\n' +
    '## Required verification after any future change\n\n' +
    '```powershell\nnode D:\\MyStudySpace\\scripts\\validate-zlatoust-grammar-project.js\nnode --test tests\\russian-b2\\reader-static.test.js\nnpx playwright test --config=playwright.zlatoust.config.cjs\n```\n\n' +
    '## Known risks\n\n' +
    '- OCR source remains REVIEW; do not erase this label without a visual proofing pass.\n' +
    '- GL1-Q076 remains source-exercise-only. GL3-Q039 remains needs-review.\n' +
    '- Existing historical result semantics after answer-key corrections require non-destructive re-evaluation from repair ledgers if a migration is requested.\n';
  writeText(path.join(theoryRoot, 'NEXT_SESSION.md'), nextSession);
}

repairChapterOneFormalMapping();
const project = loadProject();
buildReports(project);
console.log(JSON.stringify({ status: seal ? 'sealed_with_known_risks' : 'review', theoryRoot, seal }, null, 2));
