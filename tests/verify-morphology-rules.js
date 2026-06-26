// Load the morphology rules module
var m = require('../data/russian-morphology.js');
var morphologyRules = m.morphologyRules;
var morphologyGuess = m.morphologyGuess;

// 1. Verify rules are sorted by suffix length descending
var lengths = morphologyRules.map(function(r) { return r.suffix.length; });
var sortOk = true;
for (var i = 1; i < lengths.length; i++) {
  if (lengths[i] > lengths[i-1]) {
    console.log('FAIL: Rules NOT sorted by suffix length descending');
    console.log('  Rule ' + (i-1) + ': "' + morphologyRules[i-1].suffix + '" (' + lengths[i-1] + ')');
    console.log('  Rule ' + i + ': "' + morphologyRules[i].suffix + '" (' + lengths[i] + ')');
    sortOk = false;
  }
}
if (sortOk) {
  console.log('OK: Rules sorted by suffix length (' + morphologyRules.length + ' rules)');
}

// 2. Golden sample tests
var tests = [
  { input: 'читающий',    expectContains: 'читать' },
  { input: 'видит',       expectContains: 'видеть' },
  { input: 'хорошего',    expectContains: 'хороший' },
  { input: 'красивее',    expectContains: 'красивый' },
  { input: 'книгами',     expectContains: 'книга' },
  { input: 'книгах',      expectContains: 'книга' },
  { input: 'видел',       expectContains: 'видеть' },
  { input: 'читал',       expectContains: 'читать' },
  { input: 'столами',     expectContains: 'стол' },
  { input: 'работает',    expectContains: 'работать' },
  { input: 'нового',      expectContains: 'новый' },
];

var allOk = true;
tests.forEach(function(t) {
  var guesses = morphologyGuess(t.input);
  var ok = guesses.indexOf(t.expectContains) >= 0;
  if (!ok) allOk = false;
  console.log((ok ? 'OK' : 'FAIL') + '  ' + t.input + ' -> ' + JSON.stringify(guesses.slice(0, 3)) + '  (expect contains: ' + t.expectContains + ')');
});

if (!sortOk) {
  console.log('\nFAIL: Rules are not sorted by suffix length');
  process.exit(1);
}

if (!allOk) {
  console.log('\nFAIL: Some golden samples not found in candidates');
  process.exit(1);
}

console.log('\nAll rule engine checks passed.');
