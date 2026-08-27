const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const vocabPage = fs.readFileSync(path.join(root, 'vocabulary.html'), 'utf8');
const readerRuntime = fs.readFileSync(path.join(root, 'js', 'reader-runtime.js'), 'utf8');
const novelDir = path.join(root, '俄语笔记库', '小说词汇');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(fs.existsSync(novelDir), '小说词汇目录不存在');
const novelFiles = fs.readdirSync(novelDir).filter((name) => name.endsWith('.md'));
assert(novelFiles.length > 0, '测试需要至少一个已保存的小说词');

assert(
  /readerRuntime\.loadVocabularyExtras\(\)/.test(vocabPage) && readerRuntime.includes("fetchJson('/api/novel-vocab-list')"),
  'Reader vocabulary must load saved novel vocabulary through reader-runtime.js'
);

assert(
  /source:\s*'novel'|source:\s*"novel"/.test(vocabPage),
  'loaded novel vocabulary must be normalized with source: novel'
);

console.log(`novel vocab loader wiring ok (${novelFiles.length} saved words)`);
