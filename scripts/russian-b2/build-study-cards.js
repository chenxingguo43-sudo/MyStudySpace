const path = require('node:path');
const { buildStudyCards } = require('./lib/study-cards');

const check = process.argv.includes('--check');
console.log(buildStudyCards({ root: path.resolve(__dirname, '..', '..'), write: !check }));
