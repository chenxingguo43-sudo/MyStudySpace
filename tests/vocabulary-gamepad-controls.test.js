const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'vocabulary.html'), 'utf8');
const gamepadBlock = html.slice(
  html.indexOf('(function initGamepad()'),
  html.indexOf('// ─── 筛选事件绑定')
);
const yCase = gamepadBlock.slice(
  gamepadBlock.indexOf('case 3:'),
  gamepadBlock.indexOf('case 2:')
);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  html.includes('function openSourceExamplesFold'),
  'Y should have a helper that opens the source examples fold'
);

assert(
  html.includes('function showBrushBackWithoutRating'),
  'Y should be able to reveal the brush card back without rating the word'
);

assert(
  !html.slice(html.indexOf('function openSourceExamplesFold'), html.indexOf('function toggleControlPanel')).includes('revealBrushAnswer()'),
  'Y source-example opening should not record an unknown answer'
);

assert(
  gamepadBlock.includes('openSourceExamplesFold'),
  'gamepad Y should open source examples'
);

assert(
  !yCase.includes('rate(5)'),
  'gamepad Y should not mark the card known'
);

assert(
  html.includes('function scrollCardBackByGamepad'),
  'gamepad sticks should use one shared card-back scrolling helper'
);

assert(
  gamepadBlock.includes('gp.axes[1]') && gamepadBlock.includes('gp.axes[3]'),
  'both left and right vertical sticks should scroll the card back'
);

console.log('vocabulary gamepad control assertions passed');
