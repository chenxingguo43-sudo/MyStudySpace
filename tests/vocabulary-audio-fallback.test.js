const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'vocabulary.html'), 'utf8');
const audioBlock = html.slice(
  html.indexOf('function playWordAudio'),
  html.indexOf('function shouldAutoPlayAudio')
);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  html.includes('function speakRussianText'),
  'audio should fall back to browser Russian speech synthesis'
);

assert(
  html.includes('function showAudioStatus'),
  'audio failures should show visible status instead of failing silently'
);

assert(
  audioBlock.includes('speakRussianText(word.word || wordId)'),
  'missing word audio hash should fall back to Russian text pronunciation'
);

assert(
  audioBlock.includes('onFallback') && audioBlock.includes('playPromise.catch'),
  'mp3 playback failures should trigger fallback handling'
);

assert(
  !audioBlock.includes('catch(function() {})'),
  'audio playback errors should not be silently swallowed'
);

console.log('vocabulary audio fallback assertions passed');
