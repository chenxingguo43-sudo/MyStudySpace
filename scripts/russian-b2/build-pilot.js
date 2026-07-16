const path = require('node:path');
const { buildBook } = require('./build-book');

function buildPilot({ root }) { return buildBook({ root }); }

if (require.main === module) console.log(buildPilot({ root: path.resolve(__dirname, '..', '..') }));

module.exports = { buildPilot };
