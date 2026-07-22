// scripts/convert-listening-speaking.js
/**
 * Merge listening_speaking_segments.json with whisper timestamps
 * to produce reader chapter JSON files.
 *
 * Usage: node scripts/convert-listening-speaking.js
 *
 * Inputs:
 *   data/listening_speaking_segments.json — hand-curated segment metadata
 *   data/listening_speaking_transcripts/XX.json — whisper timestamps
 *
 * Outputs:
 *   data/textbook/listening_speaking/chXXXX.json — chapter files
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SEGMENTS_PATH = path.join(ROOT, 'data', 'listening_speaking_segments.json');
const TRANSCRIPTS_DIR = path.join(ROOT, 'data', 'listening_speaking_transcripts');
const OUTPUT_DIR = path.join(ROOT, 'data', 'textbook', 'listening_speaking');

// Ensure output directory exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const segments = JSON.parse(fs.readFileSync(SEGMENTS_PATH, 'utf-8'));
console.log('Loaded ' + segments.length + ' segments');

// Map speaker labels from dialog cues
function parseSpeakerLabel(text) {
  if (/женский голос/i.test(text)) return { speaker: 'A', displayLabel: 'Ж' };
  if (/мужской голос/i.test(text)) return { speaker: 'B', displayLabel: 'М' };
  if (/диктор/i.test(text)) return { speaker: 'A', displayLabel: 'Д' };
  if (/ведущий/i.test(text)) return { speaker: 'A', displayLabel: 'В' };
  // Default for monologues and news — use narrator
  return { speaker: 'A', displayLabel: 'Д' };
}

// Align audio transcript lines with whisper segments using loose word matching
function alignTranscript(audioTranscript, whisperSegments) {
  if (!audioTranscript || !whisperSegments || whisperSegments.length === 0) {
    // Fallback: split by speaker cues without timestamps
    var lines = (audioTranscript || '').split(/\n+/).filter(function(l) { return l.trim(); });
    if (!lines.length) return [];
    return lines.map(function(line) {
      var cueMatch = line.match(/^(.+?)：\s*(.+)/);
      var content = cueMatch ? cueMatch[2] : line.trim();
      var speakerInfo = parseSpeakerLabel(line);
      return {
        speaker: speakerInfo.speaker,
        displayLabel: speakerInfo.displayLabel,
        text: content,
        startTime: 0,
        endTime: 0
      };
    });
  }

  // Split transcript by speaker cues
  var lines = audioTranscript.split(/\n+/).filter(function(l) { return l.trim(); });
  var result = [];

  // Build combined whisper text
  var fullWhisper = whisperSegments.map(function(s) { return s.text; }).join(' ');

  var whisperOffset = 0;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    var cueMatch = line.match(/^(.+?)：\s*(.+)/);
    var content = cueMatch ? cueMatch[2] : line;
    var speakerInfo = parseSpeakerLabel(line);

    // Find best matching whisper segment range using word overlap
    var contentWords = content.toLowerCase().replace(/[^а-яёa-z\s]/gi, '').split(/\s+/).filter(Boolean);
    if (contentWords.length === 0) {
      result.push({
        speaker: speakerInfo.speaker,
        displayLabel: speakerInfo.displayLabel,
        text: content,
        startTime: 0,
        endTime: 0
      });
      continue;
    }

    var bestStart = whisperOffset;
    var bestEnd = whisperSegments.length - 1;
    var bestScore = 0;

    // Search within a sliding window starting from whisperOffset
    var windowStart = whisperOffset;
    var windowEnd = Math.min(whisperOffset + 20, whisperSegments.length);

    for (var j = windowStart; j < windowEnd; j++) {
      var segWords = whisperSegments[j].text.toLowerCase().replace(/[^а-яёa-z\s]/gi, '').split(/\s+/).filter(Boolean);
      var matchCount = 0;
      for (var k = 0; k < Math.min(contentWords.length, segWords.length); k++) {
        if (contentWords[k] === segWords[k]) matchCount++;
      }
      if (matchCount > bestScore) {
        bestScore = matchCount;
        bestStart = j;
        // Estimate end based on word count ratio
        var estimatedLen = Math.max(1, Math.ceil(contentWords.length / Math.max(1, segWords.length)));
        bestEnd = Math.min(j + estimatedLen, whisperSegments.length - 1);
      }
    }

    var startTime = whisperSegments[bestStart] ? whisperSegments[bestStart].startTime : 0;
    var endTime = whisperSegments[bestEnd] ? whisperSegments[bestEnd].endTime : 0;

    result.push({
      speaker: speakerInfo.speaker,
      displayLabel: speakerInfo.displayLabel,
      text: content,
      startTime: round3(startTime),
      endTime: round3(endTime)
    });

    // Advance whisper offset for next line
    whisperOffset = Math.max(whisperOffset, bestEnd);
  }

  return result;
}

function round3(n) { return Math.round(n * 1000) / 1000; }

// Convert a segment entry to chapter JSON
function convertSegment(segment, index) {
  var mp3Num = segment.mp3;
  var whisperPath = path.join(TRANSCRIPTS_DIR, mp3Num + '.json');
  var whisperSegments = [];

  if (fs.existsSync(whisperPath)) {
    try {
      whisperSegments = JSON.parse(fs.readFileSync(whisperPath, 'utf-8'));
    } catch (e) {
      console.warn('  WARN: Failed to parse whisper JSON for mp3 ' + mp3Num);
    }
  }

  var transcriptSegments = alignTranscript(segment.audioTranscript, whisperSegments);

  var chapter = {
    id: segment.id,
    format: 'listening-practice',
    title: segment.title,
    section: segment.section,
    sourcePages: segment.sourcePages || [],
    media: {
      provenance: 'teacher-provided',
      file: segment.mediaFile
    },
    questions: (segment.questions || []).map(function(q, qi) {
      return {
        id: 'LS-' + segment.id.replace(/[^A-Za-z0-9]/g, '-').toUpperCase() + '-Q' + String(qi + 1).padStart(2, '0'),
        printedNumber: q.printedNumber,
        prompt: q.prompt,
        options: q.options,
        answer: q.answer
      };
    }),
    transcriptSegments: transcriptSegments
  };

  // Preserve notes for human review
  if (segment._note) chapter._note = segment._note;

  return chapter;
}

// Main
var generated = 0;
segments.forEach(function(segment, index) {
  try {
    var chapter = convertSegment(segment, index);
    var paddedIdx = String(index).padStart(4, '0');
    var outPath = path.join(OUTPUT_DIR, 'ch' + paddedIdx + '.json');
    fs.writeFileSync(outPath, JSON.stringify(chapter, null, 2), 'utf-8');
    var hasTranscripts = chapter.transcriptSegments.length > 0;
    var hasTimestamps = hasTranscripts && chapter.transcriptSegments.some(function(s) { return s.endTime > 0; });
    console.log('[' + (hasTimestamps ? '✓' : '○') + '] ch' + paddedIdx + '.json — ' + segment.title +
      ' (' + chapter.questions.length + 'Q, ' + chapter.transcriptSegments.length + ' segments' +
      (hasTimestamps ? ', with timestamps' : ', no timestamps yet') + ')');
    generated++;
  } catch (e) {
    console.error('ERROR converting mp3 ' + segment.mp3 + ': ' + e.message);
  }
});

console.log('\nDone! Generated ' + generated + ' chapter files in ' + OUTPUT_DIR);
console.log('Run whisper batch to get timestamps: python scripts/batch_transcribe.py');
