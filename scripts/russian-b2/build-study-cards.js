const path = require('node:path');
const { buildStudyCards } = require('./lib/study-cards');

console.log(buildStudyCards({ root: path.resolve(__dirname, '..', '..'), write: true }));
