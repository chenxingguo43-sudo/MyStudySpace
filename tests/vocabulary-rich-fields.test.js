const fs = require('fs');
const path = require('path');

const buildScript = fs.readFileSync(path.join(__dirname, '..', 'build-vocabulary.js'), 'utf8');
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
  buildScript.includes('function extractRichVocabFields'),
  'build-vocabulary.js should parse rich Markdown body fields'
);

assert(
  buildScript.includes('entry.detailZh = rich.detailZh'),
  'vocab entries should include parsed detailed Chinese meanings'
);

assert(
  buildScript.includes('entry.collocations = rich.collocations'),
  'vocab entries should include parsed collocations'
);

assert(
  brushRender.includes('w.detailZh'),
  'brush card back should render detailed Chinese meaning'
);

assert(
  brushRender.includes('w.collocations'),
  'brush card back should render collocations'
);

console.log('vocabulary rich field assertions passed');
