function validateListeningQuestion(question) {
  const errors = [];
  const label = question?.id || 'listening-question';
  if (!/[А-Яа-яЁё]/.test(String(question?.promptRu || ''))) errors.push(`${label}: complete Russian prompt required`);
  if (!Array.isArray(question?.options) || question.options.length !== 3) errors.push(`${label}: exactly three original choices required`);
  if (Array.isArray(question?.options) && !question.options.some(option => option?.key === question?.answer)) errors.push(`${label}: answer must match an original choice`);
  if (!Array.isArray(question?.evidence?.pages) || !question.evidence.pages.length) errors.push(`${label}: evidence pages required`);
  return errors;
}

function validateListeningSegments(unit) {
  const errors = [];
  const segments = Array.isArray(unit?.transcriptSegments) ? unit.transcriptSegments : [];
  if (!segments.length) return [`${unit?.id || 'listening-unit'}: transcript segments required`];
  segments.forEach(segment => {
    if (!String(segment?.speechText || '').trim()) errors.push(`${segment?.id || unit.id}: speechText required`);
    if (/^[АAБB]\s*[:：]/.test(String(segment?.speechText || ''))) errors.push(`${segment?.id || unit.id}: speaker label must not enter speechText`);
  });
  if (unit?.id === 'dialogues' && new Set(segments.map(segment => segment?.voice).filter(Boolean)).size < 2) errors.push('dialogues: distinct speaker voices required');
  return errors;
}

function validateWritingTask(unit) {
  const errors = [];
  const label = unit?.id || 'writing-task';
  if (!String(unit?.task?.instructionsRu || '').trim()) errors.push(`${label}: complete Russian instructions required`);
  if (!Array.isArray(unit?.materials)) errors.push(`${label}: structured materials required`);
  if (!Array.isArray(unit?.rubric) || !unit.rubric.length) errors.push(`${label}: rubric required`);
  if (!Array.isArray(unit?.source?.pdfPages) || !unit.source.pdfPages.length) errors.push(`${label}: PDF pages required`);
  if (!Array.isArray(unit?.source?.printedPages) || !unit.source.printedPages.length) errors.push(`${label}: printed pages required`);
  if (!String(unit?.model?.text || '').trim() || unit?.model?.source?.kind !== 'b2-original') errors.push(`${label}: complete original model required`);
  return errors;
}

function validateB2Dashboard(book, catalogue) {
  const errors = [];
  const expected = ['grammar', 'reading', 'writing', 'listening', 'speaking', 'exam', 'review'];
  const modules = Array.isArray(book?.modules) ? book.modules.map(module => module?.id) : [];
  if (JSON.stringify(modules) !== JSON.stringify(expected)) errors.push('B2 dashboard modules must remain in learning order');
  const books = Array.isArray(catalogue?.books) ? catalogue.books.filter(item => item?.id === 'russian_b2' || String(item?.id || '').startsWith('russian_b2_')) : [];
  if (books.length !== 1 || books[0]?.id !== 'russian_b2' || books[0]?.format !== 'b2-full') errors.push('catalogue must expose exactly one b2-full Russian B2 book');
  return errors;
}

module.exports = { validateListeningQuestion, validateListeningSegments, validateWritingTask, validateB2Dashboard };
