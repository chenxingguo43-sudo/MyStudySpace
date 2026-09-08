(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ReaderMindMap = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var COLORS = ['#5b7fc1', '#4d9e7b', '#d4850a', '#c05050'];
  var LEAF_DEFINITIONS = [
    { key: 'recognize', label: '识别要点' },
    { key: 'rule', label: '核心规则' },
    { key: 'example', label: '例句' },
    { key: 'trap', label: '易错陷阱' }
  ];

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function characterUnits(character) {
    if (/\s/.test(character)) return 0.35;
    if (/[\u3400-\u9fff\u3000-\u303f\uff00-\uffef]/.test(character)) return 1;
    if (/[A-Za-z0-9]/.test(character)) return 0.68;
    return 0.78;
  }

  function textUnits(value) {
    return Array.from(String(value || '')).reduce(function (total, character) {
      return total + characterUnits(character);
    }, 0);
  }

  function wrapText(value, maxUnits) {
    var tokens = String(value || '').replace(/\s+/g, ' ').trim().match(/[\u3400-\u9fff]|[^\u3400-\u9fff\s]+|\s+/g) || [];
    var lines = [], line = '', lineUnits = 0;
    function pushLine() {
      if (line.trim()) lines.push(line.trim());
      line = '';
      lineUnits = 0;
    }
    function appendToken(token) {
      var tokenUnits = textUnits(token);
      if (line && lineUnits + tokenUnits > maxUnits) pushLine();
      if (tokenUnits > maxUnits) {
        Array.from(token).forEach(function (character) {
          var units = characterUnits(character);
          if (line && lineUnits + units > maxUnits) pushLine();
          line += character;
          lineUnits += units;
        });
        return;
      }
      line += token;
      lineUnits += tokenUnits;
    }
    tokens.forEach(function (token) {
      if (/^\s+$/.test(token)) {
        if (line && !/\s$/.test(line)) {
          line += ' ';
          lineUnits += characterUnits(' ');
        }
        return;
      }
      appendToken(token);
    });
    pushLine();
    return lines.length ? lines : [''];
  }

  function svgText(lines, x, firstBaseline, lineHeight, attributes) {
    return '<text x="' + x + '" y="' + firstBaseline + '" ' + attributes + '>' + lines.map(function (line, index) {
      return '<tspan x="' + x + '" dy="' + (index ? lineHeight : 0) + '">' + escapeHtml(line) + '</tspan>';
    }).join('') + '</text>';
  }

  function attributesHtml(attributes) {
    return Object.keys(attributes || {}).filter(function (name) {
      return /^[A-Za-z_:][A-Za-z0-9_:.-]*$/.test(name) && !/^on/i.test(name) && attributes[name] != null;
    }).map(function (name) {
      return ' ' + name + '="' + escapeHtml(attributes[name]) + '"';
    }).join('');
  }

  function renderRetrievalMap(options) {
    options = options || {};
    var nodes = Array.isArray(options.nodes) ? options.nodes : [];
    var topPadding = 24, bottomPadding = 22, rootX = 52, rootRadius = 24;
    var branchX = 230, branchRadius = 11, controlX = 141;
    var leafX1 = branchX + branchRadius + 9, leafX2 = 1086;
    var kindX = leafX1 + 2, textX = kindX + 80;
    var leafLineHeight = 18, branchLineHeight = 19, leafPaddingY = 7;
    var leafMinimumHeight = 30, leafGap = 7, branchGap = 28, svgWidth = 1100;
    var targetForNode = typeof options.targetForNode === 'function' ? options.targetForNode : function (node) { return node.id || ''; };
    var linkAttributesForNode = typeof options.linkAttributesForNode === 'function' ? options.linkAttributesForNode : function () { return {}; };

    var branches = nodes.map(function (node, index) {
      var leaves = LEAF_DEFINITIONS.map(function (definition) {
        var value = node[definition.key] || (definition.key === 'rule' ? node.question : '');
        if (!value) return null;
        var lines = wrapText(value, 48);
        return {
          label: definition.label,
          lines: lines,
          height: Math.max(leafMinimumHeight, lines.length * leafLineHeight + leafPaddingY * 2)
        };
      }).filter(Boolean);
      var labelLines = wrapText(node.title || node.label || '', 16);
      return {
        node: node,
        color: COLORS[index % COLORS.length],
        leaves: leaves,
        labelLines: labelLines,
        labelHeight: labelLines.length * branchLineHeight
      };
    });

    var currentY = topPadding;
    var layout = branches.map(function (branch) {
      var centerY = currentY + branch.labelHeight / 2;
      var nextLeafTop = currentY + branch.labelHeight + 8;
      var leaves = branch.leaves.map(function (leaf) {
        var placed = { leaf: leaf, top: nextLeafTop };
        nextLeafTop += leaf.height + leafGap;
        return placed;
      });
      currentY = (leaves.length ? nextLeafTop - leafGap : currentY + branch.labelHeight) + branchGap;
      return { branch: branch, centerY: centerY, leaves: leaves };
    });
    var svgHeight = Math.max(80, currentY - branchGap + bottomPadding);
    var naturalRootY = layout.length ? (layout[0].centerY + layout[layout.length - 1].centerY) / 2 : svgHeight / 2;
    var rootY = Number.isFinite(options.rootMaxY) ? Math.min(naturalRootY, options.rootMaxY) : naturalRootY;
    var parts = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + svgWidth + ' ' + svgHeight + '" class="zlatoust-mindmap-svg reader-mind-map-svg" role="img" aria-label="' + escapeHtml(options.ariaLabel || '思维导图') + '">'];

    layout.forEach(function (placed) {
      parts.push('<path class="reader-mind-map-curve" d="M' + rootX + ',' + rootY + ' C' + controlX + ',' + rootY + ' ' + controlX + ',' + placed.centerY + ' ' + branchX + ',' + placed.centerY + '" fill="none" stroke="' + placed.branch.color + '" stroke-width="3" stroke-linecap="round"/>');
    });
    parts.push('<circle cx="' + rootX + '" cy="' + rootY + '" r="' + rootRadius + '" fill="var(--surface-solid,#fff)" stroke="#9ca3af" stroke-width="2"/>');
    var rootLines = Array.isArray(options.rootLines) ? options.rootLines : ['空格', '做什么'];
    parts.push('<text x="' + rootX + '" y="' + (rootY - 3) + '" text-anchor="middle" font-size="12" fill="#6b7280" font-family="inherit">' + escapeHtml(rootLines[0] || '') + '</text>');
    parts.push('<text x="' + rootX + '" y="' + (rootY + 12) + '" text-anchor="middle" font-size="12" fill="#6b7280" font-family="inherit">' + escapeHtml(rootLines[1] || '') + '</text>');

    layout.forEach(function (placed) {
      var branch = placed.branch;
      var targetId = targetForNode(branch.node);
      var linkAttributes = linkAttributesForNode(branch.node, targetId) || {};
      linkAttributes.class = [linkAttributes.class, 'reader-mind-map-link'].filter(Boolean).join(' ');
      parts.push('<a' + attributesHtml(linkAttributes) + '>');
      parts.push('<circle cx="' + branchX + '" cy="' + placed.centerY + '" r="' + branchRadius + '" fill="var(--surface-solid,#fff)" stroke="' + branch.color + '" stroke-width="2.5"/>');
      parts.push(svgText(branch.labelLines, branchX + branchRadius + 7, placed.centerY - branch.labelHeight / 2 + 15, branchLineHeight, 'font-size="17" font-weight="700" fill="' + branch.color + '" font-family="inherit"'));
      placed.leaves.forEach(function (placement) {
        var leaf = placement.leaf;
        parts.push('<rect x="' + leafX1 + '" y="' + placement.top + '" width="' + (leafX2 - leafX1) + '" height="' + leaf.height + '" fill="transparent"/>');
        parts.push('<line x1="' + leafX1 + '" y1="' + placement.top + '" x2="' + leafX2 + '" y2="' + placement.top + '" stroke="' + branch.color + '" stroke-width="1" stroke-opacity="0.45"/>');
        parts.push('<text x="' + kindX + '" y="' + (placement.top + 16) + '" font-size="13" font-weight="700" fill="' + branch.color + '" font-family="inherit">' + escapeHtml(leaf.label) + '</text>');
        parts.push(svgText(leaf.lines, textX, placement.top + 16, leafLineHeight, 'font-size="13" fill="var(--text-secondary,#555)" font-family="inherit"'));
      });
      parts.push('</a>');
    });
    parts.push('</svg>');
    return parts.join('');
  }

  return {
    COLORS: COLORS.slice(),
    LEAF_DEFINITIONS: LEAF_DEFINITIONS.map(function (item) { return Object.assign({}, item); }),
    escapeHtml: escapeHtml,
    wrapText: wrapText,
    renderRetrievalMap: renderRetrievalMap
  };
});
