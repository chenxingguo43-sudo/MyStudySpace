const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ReaderMindMap = require('../js/reader-mind-map');

function count(value, pattern) {
  return (value.match(pattern) || []).length;
}

test('retrieval map renders one curved, linked branch with four teaching summaries per node', () => {
  const nodes = [
    { id: 'one', label: '第一分支', recognize: '看见这个信号', rule: '使用这条规则', example: 'Это пример.', trap: '不要混淆' },
    { id: 'two', label: '第二分支', recognize: '另一个信号', rule: '另一条规则', example: 'Другой пример.', trap: '另一个误区' }
  ];
  const html = ReaderMindMap.renderRetrievalMap({
    nodes,
    rootLines: ['先判断', '再选择'],
    ariaLabel: '测试导图',
    targetForNode: node => `stage-${node.id}`,
    linkAttributesForNode: (node, targetId) => ({ href: `#${targetId}`, 'data-jump': node.id })
  });

  assert.match(html, /<svg[^>]+reader-mind-map-svg[^>]+aria-label="测试导图"/);
  assert.equal(count(html, /class="reader-mind-map-curve"/g), 2);
  assert.equal(count(html, /class="reader-mind-map-link"/g), 2);
  assert.equal(count(html, />识别要点</g), 2);
  assert.equal(count(html, />核心规则</g), 2);
  assert.equal(count(html, />例句</g), 2);
  assert.equal(count(html, />易错陷阱</g), 2);
  assert.match(html, /href="#stage-one" data-jump="one"/);
  assert.doesNotMatch(html, /onclick=/i);
});

test('retrieval map escapes content and rejects inline event attributes', () => {
  const html = ReaderMindMap.renderRetrievalMap({
    nodes: [{ id: 'unsafe', label: '<script>', recognize: 'A & B', rule: 'R', example: 'E', trap: 'T' }],
    linkAttributesForNode: () => ({ href: '#safe', onclick: 'bad()', 'data-note': '"quoted"' })
  });

  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /A &amp; B/);
  assert.match(html, /data-note="&quot;quoted&quot;"/);
  assert.doesNotMatch(html, /bad\(\)|onclick=/);
});

test('rootMaxY keeps the starting circle near the first screen for long maps', () => {
  const nodes = Array.from({ length: 9 }, (_, index) => ({
    id: String(index), label: `分支${index}`, recognize: '识别', rule: '规则', example: '例句', trap: '陷阱'
  }));
  const html = ReaderMindMap.renderRetrievalMap({ nodes, rootMaxY: 390 });
  assert.match(html, /<circle cx="52" cy="390" r="24"/);
});

test('B2 and Zlatoust use the same renderer without book-specific SVG copies', () => {
  const reader = fs.readFileSync('reader.html', 'utf8');
  const b2 = fs.readFileSync('js/russian-b2/study-teaching.js', 'utf8');

  assert.match(reader, /ReaderMindMap\.renderRetrievalMap/);
  assert.match(b2, /ReaderMindMap\.renderRetrievalMap/);
  assert.doesNotMatch(reader, /function\s+mmWrapText|var\s+mmWrapText/);
  assert.doesNotMatch(b2, /function\s+mindMapWrapText|function\s+mindMapSvgText/);
  assert.match(reader, /js\/reader-mind-map\.js[\s\S]*js\/russian-b2\/study-teaching\.js/);
});
