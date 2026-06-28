const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'vocabulary.html'), 'utf8');
const brushRender = html.slice(
  html.indexOf('function renderBrushCard'),
  html.indexOf('function updateBrushStats')
);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  html.includes('function revealBrushAnswer()'),
  'brush mode should have a revealBrushAnswer() state transition'
);

assert(
  html.includes('function advanceBrushCard()'),
  'brush mode should have an explicit advanceBrushCard() transition'
);

assert(
  html.includes('function toggleBrushAnswer()'),
  'brush mode should let Space/X toggle between front and answer'
);

assert(
  html.includes('function previewBrushKnownAnswer()'),
  'brush mode should let A preview the answer before confirming known'
);

assert(
  html.includes('function confirmBrushKnown()'),
  'brush mode should require a second A press to confirm known'
);

assert(
  html.includes('function handleBrushUnknownOrNext()'),
  'brush mode should centralize B as unknown-or-next'
);

assert(
  html.includes('onclick="handleBrushUnknownOrNext()"'),
  'brush "not known" button should use the B unknown-or-next flow'
);

assert(
  brushRender.includes('onclick="previewBrushKnownAnswer()"'),
  'brush front known button should preview the answer instead of immediately advancing'
);

assert(
  brushRender.includes('onclick="confirmBrushKnown()"'),
  'brush answer side should let A confirm known and advance'
);

assert(
  !brushRender.includes('onclick="rate(5)"'),
  'brush mode should not mark known directly from the front side'
);

assert(
  !html.includes("if (currentMode === 'brush') {\n                        rate(5);"),
  'brush gamepad controls should not mark known directly'
);

assert(
  brushRender.includes('<kbd>X / Space</kbd> 翻卡'),
  'brush mode should show X / Space as the flip-card action'
);

assert(
  brushRender.includes('<kbd>A</kbd> 认识'),
  'brush mode should show A as the known action'
);

assert(
  brushRender.includes('<kbd>B</kbd> 不认识 / 下一张'),
  'brush mode should show B as the not-known and next-card action'
);

assert(
  !brushRender.includes('btn-fuzzy" onclick="rate(3)"'),
  'brush mode should not show the fuzzy button in the fast card flow'
);

assert(
  !brushRender.includes('↓ 5张后回炉'),
  'brush mode should not advertise fuzzy return-queue behavior'
);

console.log('vocabulary brush flow assertions passed');
