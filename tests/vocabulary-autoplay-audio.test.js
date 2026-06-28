const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'vocabulary.html'), 'utf8');
const maybeAutoPlayBlock = html.slice(
  html.indexOf('function maybeAutoPlay'),
  html.indexOf('// ─── 查看原文来源')
);
const flipCardBlock = html.slice(
  html.indexOf('function flipCard'),
  html.indexOf('function renderActionBtnsOnly')
);
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
  html.includes('function shouldAutoPlayAudio'),
  'autoplay should have an explicit default-on settings helper'
);

assert(
  maybeAutoPlayBlock.includes('shouldAutoPlayAudio()'),
  'maybeAutoPlay should use the default-on helper'
);

assert(
  !maybeAutoPlayBlock.includes('s.autoPlayAudio)'),
  'missing autoPlayAudio setting should not disable pronunciation'
);

assert(
  flipCardBlock.includes('maybeAutoPlay(_currentWord.id)'),
  'flipping to the answer should pronounce the Russian word'
);

assert(
  brushRender.includes('maybeAutoPlay(w.id)'),
  'new brush cards should pronounce the Russian word'
);

console.log('vocabulary autoplay audio assertions passed');
