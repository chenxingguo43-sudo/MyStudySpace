const fs = require('fs');

let content = fs.readFileSync('docs/муром_разбор.json', 'utf8');

// Fix unescaped quotes inside JSON string values
// Strategy: find "detailed_explanation": " and fix internal quotes
let result = '';
let i = 0;

while (i < content.length) {
  // Find "detailed_explanation": "
  const searchFrom = i;
  const marker = '"detailed_explanation":';
  const markerIdx = content.indexOf(marker, searchFrom);

  if (markerIdx === -1) {
    result += content.substring(i);
    break;
  }

  // Add everything before the marker
  result += content.substring(i, markerIdx);

  // Find the opening quote of the value
  let valStart = content.indexOf('"', markerIdx + marker.length);
  if (valStart === -1) { result += content.substring(markerIdx); break; }
  valStart++; // skip the quote

  // Now find the closing quote (unescaped)
  let j = valStart;
  let fixed = '';
  while (j < content.length) {
    const c = content[j];
    if (c === '\\' && j + 1 < content.length) {
      // Escaped character - keep as is
      fixed += content[j] + content[j + 1];
      j += 2;
      continue;
    }
    if (c === '"') {
      // Check if this ends the string
      const afterQuote = content.substring(j + 1).trimStart();
      if (afterQuote.length > 0 && (afterQuote[0] === ',' || afterQuote[0] === '}' || afterQuote[0] === ']')) {
        // End of string
        break;
      } else {
        // Unescaped quote inside string - escape it
        fixed += '\\"';
        j++;
        continue;
      }
    }
    fixed += c;
    j++;
  }

  result += '"' + fixed + '"';
  i = j + 1;
}

try {
  const data = JSON.parse(result);
  console.log('SUCCESS: Parsed', data.length, 'entries');
  fs.writeFileSync('docs/муром_разбор_fixed.json', JSON.stringify(data, null, 2), 'utf8');
  console.log('Saved to docs/муром_разбор_fixed.json');
} catch (e) {
  console.log('Error:', e.message.substring(0, 200));
}
