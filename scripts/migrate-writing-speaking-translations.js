/**
 * Adds the stable task-ID translation contract to legacy writing-speaking
 * translation caches. Existing array-index translations stay on disk for
 * audit, but the Reader must only consume taskTranslationsById.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'textbook', 'writing_speaking');

const TYPE_HINTS = {
  'сообщение': [/通知|消息|信息|通报|书面.{0,4}(通知|消息)/],
  'эссе': [/议论文|随笔|以《|写一篇.{0,8}(文章|短文|随笔)|主题.{0,10}(文章|短文)/],
  'жалоба': [/投诉/],
  'благодарность': [/感谢/],
  'рекомендация': [/推荐/],
  'письмо': [/书信|写信|一封信|个人信|友好.{0,4}信/],
  'аргументация': [/赞同|反驳|论据|对比.{0,12}(生活|条件)|说明.{0,8}原因/],
  'перефразирование': [/改写|转述|换.{0,4}说法/],
  'резюме': [/简历/],
  'аннотация': [/摘要/],
  'заявление': [/申请/],
  'объявление': [/广告|启事/]
};

function scoreLegacyPrompt(task, candidate) {
  const text = String(candidate && candidate.prompt || '');
  const hints = TYPE_HINTS[String(task.type || '').toLowerCase()] || [];
  return hints.reduce((score, hint) => score + (hint.test(text) ? 10 : 0), 0);
}

function findLegacyWritingTranslation(task, candidates, used, afterIndex) {
  const ranked = candidates.map((candidate, index) => ({ candidate, index, score: scoreLegacyPrompt(task, candidate) }))
    .filter(entry => !used.has(entry.index) && entry.score > 0)
    .sort((a, b) => b.score - a.score || (a.index >= afterIndex ? 0 : 1) - (b.index >= afterIndex ? 0 : 1) || a.index - b.index);
  return ranked[0] || null;
}

function migrateWritingSpeakingTranslations(dataDir) {
  const directory = dataDir || DATA_DIR;
  const results = [];
  for (const chapterName of fs.readdirSync(directory).filter(name => /^ch\d{4}\.json$/.test(name))) {
    const chapter = JSON.parse(fs.readFileSync(path.join(directory, chapterName), 'utf8'));
    const translationName = `${chapter.id}_zh.json`;
    const translationPath = path.join(directory, translationName);
    if (!fs.existsSync(translationPath)) continue;

    const translation = JSON.parse(fs.readFileSync(translationPath, 'utf8'));
    translation.taskTranslationsById = translation.taskTranslationsById || {};
    translation.speakingTranslationsById = translation.speakingTranslationsById || {};
    const validWritingIds = new Set((chapter.writingTasks || []).map(task => task.taskId));
    const validSpeakingIds = new Set((chapter.speakingTasks || []).map(task => task.speakingId));
    Object.keys(translation.taskTranslationsById).forEach(taskId => {
      if (!validWritingIds.has(taskId)) delete translation.taskTranslationsById[taskId];
    });
    Object.keys(translation.speakingTranslationsById).forEach(speakingId => {
      if (!validSpeakingIds.has(speakingId)) delete translation.speakingTranslationsById[speakingId];
    });

    const legacyWriting = Array.isArray(translation.writingTasks) ? translation.writingTasks : [];
    const usedLegacyWriting = new Set();
    let afterIndex = 0;
    for (const task of chapter.writingTasks || []) {
      if (translation.taskTranslationsById[task.taskId]) continue;
      const match = findLegacyWritingTranslation(task, legacyWriting, usedLegacyWriting, afterIndex);
      if (!match) continue;
      usedLegacyWriting.add(match.index);
      afterIndex = match.index + 1;
      translation.taskTranslationsById[task.taskId] = {
        prompt: match.candidate.prompt,
        source: 'legacy-array-alignment',
        legacyIndex: match.index,
        reviewStatus: 'needs_review'
      };
    }

    const legacySpeaking = Array.isArray(translation.speakingTasks) ? translation.speakingTasks : [];
    (chapter.speakingTasks || []).forEach((task, index) => {
      const speakingId = task.speakingId;
      const candidate = legacySpeaking[index];
      if (!speakingId || !candidate || !candidate.prompt || translation.speakingTranslationsById[speakingId]) return;
      translation.speakingTranslationsById[speakingId] = {
        prompt: candidate.prompt,
        source: 'legacy-array-alignment',
        legacyIndex: index,
        reviewStatus: 'needs_review'
      };
    });
    translation.taskTranslationStatus = 'needs_review';
    translation.speakingTranslationStatus = 'needs_review';
    translation.taskTranslationContract = 'taskId-v1';
    fs.writeFileSync(translationPath, JSON.stringify(translation, null, 2) + '\n', 'utf8');
    results.push(translationName);
  }
  return results;
}

if (require.main === module) {
  const migrated = migrateWritingSpeakingTranslations();
  process.stdout.write(`Prepared ${migrated.length} writing-speaking translation caches for taskId-v1 review.\n`);
}

module.exports = { migrateWritingSpeakingTranslations };
