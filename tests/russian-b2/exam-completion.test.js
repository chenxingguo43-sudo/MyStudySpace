/* B2 真题模拟阶段一契约测试：
 * - 六章结构（考试说明/语法/阅读/写作/听力/会话）与 book.json、index.json 一致；
 * - 语法 150 题：题面、译文、选项、答案、解析、原书 PDF 页码齐全，答案在选项内；
 * - 听力 25 题：题面齐全、答案在选项内、音频与字幕文件真实存在、文字稿分段有归属；
 * - 会话材料：三部分、参考答案含考官/考生角色、页码标注；
 * - 考试说明：等级、科目分值、时间表、合格与补考规则齐全。 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const examDir = path.join(root, 'data', 'textbook', 'russian_b2', 'modules', 'exam');
const readJson = (...parts) => JSON.parse(fs.readFileSync(path.join(...parts), 'utf8'));

const CYRILLIC_OPTION_KEYS = ['А', 'Б', 'В', 'Г'];

test('exam module ships six chapters in learner order', () => {
  const book = readJson(root, 'data', 'textbook', 'russian_b2', 'book.json');
  const exam = book.modules.find(module => module.id === 'exam');
  const index = readJson(examDir, 'index.json');
  const expected = ['考试说明', '语法和词汇', '阅读', '写作', '听力', '会话'];
  assert.equal(exam.chapters, 6);
  assert.deepEqual(exam.chapterTitles, expected);
  assert.equal(index.chapters, 6);
  assert.deepEqual(index.chapterTitles, expected);
  for (let chapter = 0; chapter < 6; chapter += 1) {
    const file = path.join(examDir, `ch${String(chapter).padStart(4, '0')}.json`);
    assert.ok(fs.existsSync(file), `missing chapter file ch${String(chapter).padStart(4, '0')}.json`);
  }
});

test('exam grammar chapter carries 150 verified questions with sources and explanations', () => {
  const chapter = readJson(examDir, 'ch0001.json');
  assert.equal(chapter.id, 'grammar-lexicon');
  assert.equal(chapter.importStatus, 'source-verified');
  assert.equal(chapter.questions.length, 150);
  assert.equal(chapter.parts.length, 6);
  const seen = new Set();
  chapter.questions.forEach((question, position) => {
    assert.ok(!seen.has(question.printedNumber), `duplicate printed number ${question.printedNumber}`);
    seen.add(question.printedNumber);
    assert.equal(question.printedNumber, position + 1);
    // 133–140 题为申请书填空行，原书题干本来就短
    const minPrompt = question.printedNumber >= 133 && question.printedNumber <= 140 ? 4 : 10;
    assert.ok(question.prompt.length > minPrompt, `q${question.printedNumber} prompt too short`);
    assert.ok(question.promptZh && question.promptZh.length > 4, `q${question.printedNumber} missing promptZh`);
    assert.ok(Array.isArray(question.options) && question.options.length >= 2, `q${question.printedNumber} options`);
    question.options.forEach(option => {
      assert.ok(CYRILLIC_OPTION_KEYS.includes(option.label), `q${question.printedNumber} bad option key ${option.key}`);
      assert.ok(option.text && option.text.length > 0, `q${question.printedNumber} empty option text`);
    });
    assert.ok(
      question.options.some(option => option.label === question.answer),
      `q${question.printedNumber} answer ${question.answer} not among options`
    );
    assert.ok(question.sourceExplanation && question.sourceExplanation.length > 4, `q${question.printedNumber} explanation`);
    assert.ok(Array.isArray(question.answerSource.pdfPages) && question.answerSource.pdfPages.every(page => page >= 118 && page <= 149),
      `q${question.printedNumber} ledger pages out of grammar block`);
  });
  const partCounts = chapter.parts.map(part => chapter.questions.filter(q => q.part === part.part).length);
  assert.deepEqual(partCounts, [25, 25, 25, 25, 25, 25]);
});

test('exam listening chapter carries 25 questions, five audio pieces and matching media files', () => {
  const chapter = readJson(examDir, 'ch0004.json');
  assert.equal(chapter.id, 'listening');
  assert.equal(chapter.importStatus, 'source-verified');
  assert.equal(chapter.questions.length, 25);
  assert.equal(chapter.parts.length, 4);
  assert.equal(chapter.audio.pieces.length, 5);
  assert.equal(chapter.audio.provenance, 'reconstructed-tts');

  const seen = new Set();
  chapter.questions.forEach(question => {
    assert.ok(!seen.has(question.printedNumber), `duplicate listening q ${question.printedNumber}`);
    seen.add(question.printedNumber);
    assert.ok(question.prompt && question.promptZh);
    assert.ok(question.options.length === 3, `listening q${question.printedNumber} should have 3 options`);
    assert.ok(question.options.some(option => option.label === question.answer), `listening q${question.printedNumber} answer`);
    assert.ok(question.answerSource.pdfPage >= 175 && question.answerSource.pdfPage <= 180);
    assert.ok(['exam-dialogue', 'exam-announcement', 'exam-film', 'exam-news', 'exam-interview'].includes(question.audioPiece));
  });

  const segmentPieces = new Set(chapter.transcriptSegments.map(segment => segment.pieceId));
  chapter.audio.pieces.forEach(piece => {
    assert.ok(segmentPieces.has(piece.id), `no transcript segments for ${piece.id}`);
    const mp3 = path.join(root, 'data', 'textbook', 'russian_b2', piece.file);
    const vtt = path.join(root, 'data', 'textbook', 'russian_b2', piece.captions);
    assert.ok(fs.existsSync(mp3) && fs.statSync(mp3).size > 10000, `missing audio ${piece.file}`);
    assert.ok(fs.existsSync(vtt) && fs.statSync(vtt).size > 100, `missing captions ${piece.captions}`);
    const captions = fs.readFileSync(vtt, 'utf8');
    assert.match(captions, /^WEBVTT/);
  });
  const dialogue = chapter.transcriptSegments.filter(segment => segment.pieceId === 'exam-film');
  assert.equal(dialogue.length, 26);
  const speakers = new Set(dialogue.map(segment => segment.speaker));
  assert.ok(speakers.has('Женя') && speakers.has('Надя'));
});

test('exam speaking chapter is a read-only material with reference dialogues', () => {
  const chapter = readJson(examDir, 'ch0005.json');
  assert.equal(chapter.id, 'speaking');
  assert.equal(chapter.importStatus, 'source-verified');
  assert.equal(chapter.materialsMode, true);
  assert.equal(chapter.readOnly, true);
  assert.equal(chapter.sections.length, 3);
  const taskGroups = chapter.sections.flatMap(section => section.tasks);
  assert.deepEqual(taskGroups.map(task => task.printedNumber), ['1–4', '5–8', '9–12', '13', '14', '15']);
  taskGroups.forEach(task => {
    assert.ok(task.instructionRu && task.instructionZh);
    assert.ok(Array.isArray(task.referenceAnswer) && task.referenceAnswer.length >= 1, `task ${task.printedNumber} reference`);
    // 9–12 语调朗读题参考答案以语调标注（note）呈现；13 视频描述为单段范文；其余为考官/考生对话
    if (task.printedNumber === '9–12' || task.printedNumber === '13') {
      assert.ok(task.referenceAnswer.some(line => line.role === 'note'), `task ${task.printedNumber} note line`);
    } else {
      assert.ok(task.referenceAnswer.some(line => line.role === 'student'), `task ${task.printedNumber} student line`);
    }
    assert.ok(task.answerNoteZh, `task ${task.printedNumber} answer note`);
  });
  const discussion = taskGroups.find(task => task.printedNumber === '15');
  assert.ok(discussion.referenceAnswer.some(line => (line.text || '').includes('Чернобыльской АЭС')));
});

test('exam intro chapter documents levels, subjects, schedule and passing rules', () => {
  const chapter = readJson(examDir, 'ch0000.json');
  assert.equal(chapter.id, 'exam-intro');
  assert.equal(chapter.importStatus, 'source-verified');
  assert.equal(chapter.introMode, true);
  assert.equal(chapter.readOnly, true);
  const intro = chapter.intro;
  assert.equal(intro.levels.length, 5);
  assert.equal(intro.subjects.length, 5);
  const totalMax = intro.subjects.reduce((sum, subject) => sum + subject.maxScore, 0);
  assert.equal(totalMax, 660);
  const grammar = intro.subjects.find(subject => subject.subjectZh.includes('语法和词汇'));
  assert.equal(grammar.questions, 150);
  assert.equal(grammar.passingScore, 99);
  const dayOneMinutes = intro.schedule.dayOne.reduce((sum, item) => sum + item.minutes, 0);
  const dayTwoMinutes = intro.schedule.dayTwo.reduce((sum, item) => sum + item.minutes, 0);
  assert.equal(dayOneMinutes, 205);
  assert.equal(dayTwoMinutes, 80);
  assert.match(intro.passingRuleZh, /66%/);
  assert.match(intro.retakeRuleZh, /补考|重考/);
});
