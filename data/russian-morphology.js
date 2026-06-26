/**
 * 俄语词态轻量还原引擎 — 降级兜底
 * 仅覆盖 15-20 条最高频后缀规则，不构建完整语法树。
 * 规则按后缀长度降序排列（长后缀优先，防截断误伤）。
 */
var morphologyRules = [
  // ─── 5字符后缀 ───
  { suffix: 'ешься', replacement: 'еть',   posHint: 'v' },
  { suffix: 'ишься', replacement: 'ить',   posHint: 'v' },

  // ─── 4字符后缀：现在主动形动词 ───
  { suffix: 'ющий', replacement: 'ть',     posHint: 'v' },
  { suffix: 'ущий', replacement: 'ть',     posHint: 'v' },
  { suffix: 'ящий', replacement: 'ить',    posHint: 'v' },
  { suffix: 'ащий', replacement: 'ать',    posHint: 'v' },
  { suffix: 'вший', replacement: 'ть',     posHint: 'v' },

  // ─── 4字符后缀：现在被动形动词 ───
  { suffix: 'емый', replacement: 'ать',    posHint: 'v' },
  { suffix: 'имый', replacement: 'ить',    posHint: 'v' },

  // ─── 4字符后缀：形容词比较级 ───
  { suffix: 'ивее', replacement: 'ивый',   posHint: 'adj' },

  // ─── 4字符后缀：反身后缀剥离 ───
  { suffix: 'ется', replacement: 'ть',     posHint: 'v' },
  { suffix: 'ются', replacement: 'ть',     posHint: 'v' },
  { suffix: 'ться', replacement: 'ть',     posHint: 'v' },

  // ─── 4字符后缀：过去被动形动词 ───
  { suffix: 'нный', replacement: 'ать',    posHint: 'v' },

  // ─── 3字符后缀：形动词 ───
  { suffix: 'ший', replacement: 'ть',      posHint: 'v' },
  { suffix: 'тый',  replacement: 'ть',     posHint: 'v' },

  // ─── 3字符后缀：人称形式 ───
  { suffix: 'ешь', replacement: 'еть',     posHint: 'v' },
  { suffix: 'ёшь', replacement: 'еть',     posHint: 'v' },
  { suffix: 'ишь', replacement: 'ить',     posHint: 'v' },
  { suffix: 'ете', replacement: 'еть',     posHint: 'v' },
  { suffix: 'ёте', replacement: 'еть',     posHint: 'v' },
  { suffix: 'ите', replacement: 'ить',     posHint: 'v' },
  { suffix: 'ают', replacement: 'ать',     posHint: 'v' },
  { suffix: 'яют', replacement: 'ять',     posHint: 'v' },
  { suffix: 'уют', replacement: 'овать',   posHint: 'v' },

  // ─── 3字符后缀：过去时复数 ───
  { suffix: 'али', replacement: 'ать',     posHint: 'v' },
  { suffix: 'яли', replacement: 'ять',     posHint: 'v' },
  { suffix: 'или', replacement: 'ить',     posHint: 'v' },
  { suffix: 'ели', replacement: 'еть',     posHint: 'v' },

  // ─── 3字符后缀：形容词格尾 ───
  { suffix: 'ого', replacement: 'ый',      posHint: 'adj' },
  { suffix: 'его', replacement: 'ий',      posHint: 'adj' },
  { suffix: 'ому', replacement: 'ий',      posHint: 'adj' },
  { suffix: 'ему', replacement: 'ий',      posHint: 'adj' },
  { suffix: 'ыми', replacement: 'ий',      posHint: 'adj' },
  { suffix: 'ими', replacement: 'ий',      posHint: 'adj' },

  // ─── 3字符后缀：名词格尾 ───
  { suffix: 'ами', replacement: '',        posHint: 'n' },
  { suffix: 'ями', replacement: 'я',       posHint: 'n' },

  // ─── 2字符后缀：形容词格尾 ───
  { suffix: 'ая',  replacement: 'ий',      posHint: 'adj' },
  { suffix: 'яя',  replacement: 'ий',      posHint: 'adj' },
  { suffix: 'ую',  replacement: 'ий',      posHint: 'adj' },
  { suffix: 'юю',  replacement: 'ий',      posHint: 'adj' },
  { suffix: 'ые',  replacement: 'ий',      posHint: 'adj' },
  { suffix: 'ие',  replacement: 'ий',      posHint: 'adj' },
  { suffix: 'ое',  replacement: 'ий',      posHint: 'adj' },
  { suffix: 'ее',  replacement: 'ий',      posHint: 'adj' },

  // ─── 2字符后缀：过去时阳性单数 ───
  { suffix: 'ал',  replacement: 'ать',     posHint: 'v' },
  { suffix: 'ял',  replacement: 'ять',     posHint: 'v' },
  { suffix: 'ил',  replacement: 'ить',     posHint: 'v' },
  { suffix: 'ел',  replacement: 'еть',     posHint: 'v' },

  // ─── 2字符后缀：现在时第三人称单数 ───
  { suffix: 'ит',  replacement: 'еть',     posHint: 'v' },
  { suffix: 'ет',  replacement: 'еть',     posHint: 'v' },

  // ─── 2字符后缀：名词格尾 ───
  { suffix: 'ях',  replacement: 'я',       posHint: 'n' },
  { suffix: 'ах',  replacement: '',        posHint: 'n' },
];

/**
 * 尝试将变形词还原为候选原形
 * @param {string} word - 已去重音的变形词
 * @return {string[]} 候选原形数组，按置信度降序
 */
function morphologyGuess(word) {
  var candidates = [];

  for (var i = 0; i < morphologyRules.length; i++) {
    var rule = morphologyRules[i];
    if (word.endsWith(rule.suffix)) {
      var stem = word.slice(0, -rule.suffix.length);
      if (stem.length < 2) continue;

      var guess = stem + rule.replacement;

      candidates.push(guess);

      // 对于动词，同时尝试 -ть 结尾
      if (rule.posHint === 'v' && guess.slice(-2) !== 'ть') {
        candidates.push(stem + 'ть');
      }

      // 对于名词空替换（硬辅音结尾），同时尝试加回 -а
      if (rule.posHint === 'n' && rule.replacement === '') {
        candidates.push(stem + 'а');
      }
    }
  }

  // 去重，保持顺序
  var seen = {};
  var unique = [];
  for (var j = 0; j < candidates.length; j++) {
    var c = candidates[j];
    if (!c || c.length < 2) continue;
    if (seen[c]) continue;
    seen[c] = true;
    unique.push(c);
  }
  return unique;
}
