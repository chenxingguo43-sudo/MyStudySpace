const SPEAKER_VOICES = { A: 'ru-RU-DmitryNeural', 'А': 'ru-RU-DmitryNeural', B: 'ru-RU-SvetlanaNeural', 'Б': 'ru-RU-SvetlanaNeural' };

function parseDialogueSegments(transcript) {
  const source = String(transcript || '').trim();
  const marker = /(?:^|\s)([AАBБ])\s*[:：]\s*/g;
  const matches = [...source.matchAll(marker)];
  return matches.map((match, index) => {
    const rawSpeaker = match[1];
    const speaker = rawSpeaker === 'A' || rawSpeaker === 'А' ? 'A' : 'B';
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : source.length;
    const text = source.slice(start, end).trim();
    return {
      id: `segment-${String(index + 1).padStart(2, '0')}`,
      speaker,
      displayLabel: speaker === 'A' ? 'А' : 'Б',
      text,
      speechText: text,
      voice: SPEAKER_VOICES[speaker],
      pauseAfterMs: index + 1 < matches.length ? 450 : 0
    };
  });
}

module.exports = { SPEAKER_VOICES, parseDialogueSegments };
