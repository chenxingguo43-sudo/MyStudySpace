var fs = require('fs');
var path = require('path');

var readerPage = fs.readFileSync(path.join(__dirname, '..', 'reader.html'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error('FAIL: ' + message);
  console.log('  OK: ' + message);
}

console.log('=== Morphology Engine Integration Tests ===\n');

// 1. Script loading
assert(
  readerPage.includes('data/russian-morphology.js'),
  'reader.html loads russian-morphology.js'
);

// 2. State variables
assert(
  /var morphologyDict\s*=/.test(readerPage),
  'morphologyDict state variable exists'
);
assert(
  /var morphologyReady\s*=/.test(readerPage),
  'morphologyReady state variable exists'
);

// 3. IndexedDB wrapper
assert(
  /function idbGet\(/.test(readerPage),
  'idbGet function exists'
);
assert(
  /function idbSet\(/.test(readerPage),
  'idbSet function exists'
);

// 4. Init functions
assert(
  /function initMorphology\(/.test(readerPage),
  'initMorphology function exists'
);
assert(
  /function buildDict\(/.test(readerPage),
  'buildDict function exists'
);
assert(
  readerPage.includes('initMorphology()'),
  'initMorphology called on page load'
);

// 5. Three-tier lookup chain
var autoLookupSrc = matchFunction(readerPage, 'autoLookup');
assert(
  autoLookupSrc && autoLookupSrc.includes('morphologyReady'),
  'autoLookup checks morphologyReady (tier 1)'
);
assert(
  autoLookupSrc && autoLookupSrc.includes('morphologyGuess'),
  'autoLookup calls morphologyGuess (tier 2)'
);
assert(
  autoLookupSrc && autoLookupSrc.includes('_alternatives'),
  'autoLookup records _alternatives for homographs'
);

// 6. Expanded dictionary loading
var loadFn = matchFunction(readerPage, 'loadLocalLookupData');
assert(
  loadFn && loadFn.includes('allowedTypes'),
  'loadLocalLookupData uses allowedTypes filter'
);
assert(
  loadFn && (loadFn.includes('adjective') || loadFn.includes('adverb')),
  'loadLocalLookupData includes adjective/adverb aliases'
);
assert(
  loadFn && !loadFn.includes("w.source !== 'vocab'"),
  'loadLocalLookupData no longer filters by source'
);

// 7. Version management
assert(
  readerPage.includes('morphology-version.json'),
  'version checking uses morphology-version.json'
);
assert(
  /sessionStorage\.getItem\('morph_retry'\)/.test(readerPage),
  'morph_retry sessionStorage guard exists'
);

// 8. CSS for alternatives
assert(
  readerPage.includes('dict-alternatives'),
  'CSS for alternatives display exists'
);
assert(
  readerPage.includes('backdrop-filter: blur(8px)'),
  'CSS backdrop-filter blur for alternatives exists'
);

// 9. renderLocalLookup updated
var renderFn = matchFunction(readerPage, 'renderLocalLookup');
assert(
  renderFn && renderFn.includes('_alternatives'),
  'renderLocalLookup handles _alternatives'
);
assert(
  renderFn && renderFn.includes('_guessed'),
  'renderLocalLookup handles _guessed annotation'
);

// 10. Existing tests still pass
assert(
  !readerPage.includes('wiktionary.org/api/rest_v1/page/definition'),
  'reader lookup does not call Wiktionary definitions'
);
assert(
  /sourceSentenceRu:\s*selContext/.test(readerPage),
  'saved vocabulary includes source sentence context'
);

console.log('\n=== v2 Split Panel Integration Tests ===\n');

// 1. 分屏布局结构
assert(
  readerPage.includes('reader-layout'),
  'reader.html has .reader-layout container'
);
assert(
  readerPage.includes('reader-pane'),
  'reader.html has .reader-pane reading area'
);
assert(
  readerPage.includes('detail-panel'),
  'reader.html has .detail-panel for word cards'
);
assert(
  readerPage.includes('detail-panel-inner'),
  'reader.html has .detail-panel-inner for card content'
);

// 2. 面板开关函数
assert(
  /function openDetailPanel\(/.test(readerPage),
  'openDetailPanel function exists'
);
assert(
  /function closeDetailPanel\(/.test(readerPage),
  'closeDetailPanel function exists'
);
assert(
  /function toggleDetailPanel\(/.test(readerPage),
  'toggleDetailPanel function exists'
);

// 3. 拖拽分界线
assert(
  readerPage.includes('resize-handle'),
  'resize-handle CSS class exists'
);
assert(
  readerPage.includes('resizeHandle'),
  'resizeHandle id referenced in JS'
);

// 4. 富卡片渲染
assert(
  /function renderDetailPanel\(/.test(readerPage),
  'renderDetailPanel function exists'
);
assert(
  readerPage.includes('dp-head'),
  'dp-head CSS class for card header'
);
assert(
  readerPage.includes('dp-word'),
  'dp-word class for card title'
);

// 5. _raw 字段
assert(
  /_raw:\s*w/.test(readerPage),
  '_raw field stored in localVocabLookup entry'
);

// 6. 响应式
assert(
  readerPage.includes('@media (max-width: 767px)'),
  '@media query for portrait/tablet mode exists'
);

// 7. autoLookup 填充 detailInner
assert(
  readerPage.includes('detailInner'),
  'autoLookup fills detailInner'
);
assert(
  /renderDetailPanel\(clean,\s*result\)/.test(readerPage),
  'autoLookup calls renderDetailPanel'
);

// 8. selPopup 保留但不再用于查词
assert(
  readerPage.includes('selPopup'),
  'selPopup HTML preserved (non-reading views)'
);

console.log('\n=== All integration tests passed ===');

// Helper: extract a function body from the source
function matchFunction(source, funcName) {
  var re = new RegExp('function ' + funcName + '\\([^)]*\\)[\\s\\S]*?\\nfunction |function ' + funcName + '\\([^)]*\\)[\\s\\S]*?$', 'm');
  var m = source.match(re);
  return m ? m[0] : null;
}
