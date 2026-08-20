(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ReaderAnswerEvidence = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function text(value) {
    return value == null ? '' : String(value);
  }

  function strings(values) {
    var seen = {};
    return (Array.isArray(values) ? values : []).map(text).map(function (value) {
      return value.trim();
    }).filter(function (value) {
      if (!value || seen[value]) return false;
      seen[value] = true;
      return true;
    });
  }

  function options(values) {
    return (Array.isArray(values) ? values : []).map(function (option, index) {
      if (option && typeof option === 'object') {
        return {
          key: text(option.key || option.label || index + 1),
          text: text(option.text || option.value || option.label || '')
        };
      }
      return { key: text(index + 1), text: text(option) };
    });
  }

  function resultFor(selected, correct, explicitResult) {
    if (explicitResult) return text(explicitResult);
    if (!selected) return 'unanswered';
    if (!correct) return 'recorded';
    return text(selected) === text(correct) ? 'correct' : 'wrong';
  }

  function createSubmission(input) {
    input = input && typeof input === 'object' ? input : {};
    var selected = text(input.selectedAnswer || input.selected || input.response);
    var correct = text(input.correctAnswer || input.correct || input.answer);
    return {
      schema: 'belye-nochi-answer-evidence/v1',
      schemaVersion: 1,
      questionId: text(input.questionId || input.id),
      printedNumber: text(input.printedNumber),
      prompt: text(input.prompt || input.question),
      options: options(input.options),
      selectedAnswer: selected,
      correctAnswer: correct,
      result: resultFor(selected, correct, input.result),
      answeredAt: text(input.answeredAt || input.lastAnsweredAt || input.submittedAt),
      initialErrorCategory: text(input.initialErrorCategory || input.errorCategory),
      finalErrorCategory: text(input.finalErrorCategory || input.errorCategory),
      ruleIds: strings(input.ruleIds),
      ruleEvidence: text(input.ruleEvidence || input.mappingReason)
    };
  }

  function latestSubmissions(records, limit) {
    var latest = {};
    (Array.isArray(records) ? records : []).forEach(function (record) {
      (record && record.content && Array.isArray(record.content.submissions) ? record.content.submissions : []).forEach(function (submission) {
        var normalized = createSubmission(submission);
        if (!normalized.questionId) return;
        var time = normalized.answeredAt || record.createdAt || record.startedAt || '';
        var previous = latest[normalized.questionId];
        if (!previous || time >= previous._sortTime) latest[normalized.questionId] = Object.assign(normalized, {
          _sortTime: time,
          submodule: text(record.submodule),
          unitId: text(record.content && record.content.unitId)
        });
      });
    });
    return Object.keys(latest).map(function (key) { return latest[key]; })
      .sort(function (left, right) { return right._sortTime.localeCompare(left._sortTime); })
      .slice(0, Math.max(1, Number(limit) || 10))
      .map(function (item) { var copy = Object.assign({}, item); delete copy._sortTime; return copy; });
  }

  function optionLine(option) {
    return text(option.key) + (option.text ? ' ' + text(option.text) : '');
  }

  function buildTutorPrompt(submissions) {
    var items = Array.isArray(submissions) ? submissions : [];
    var wrong = items.filter(function (item) { return item.result === 'wrong'; });
    var lines = [
      '你是白夜俄语 Reader 的复盘导师。下面是学习者最近 ' + items.length + ' 道题的客观作答记录，其中错题 ' + wrong.length + ' 道。',
      '',
      '请严格依据记录完成复盘：',
      '1. 先找跨题的共同错误模式，不要逐题重复答案。',
      '2. 对推测的错因明确标注“待确认”。',
      '3. 只提出 2 个苏格拉底式追问，等待学习者回答。',
      '4. 最后给 1 道新的迁移题，暂不公布答案。',
      '5. 使用简体中文；俄语例句保留俄文；不要调用外部工具。',
      ''
    ];
    items.forEach(function (item, index) {
      lines.push((index + 1) + ') ' + (item.questionId || '未编号') + (item.printedNumber ? '（第 ' + item.printedNumber + ' 题）' : ''));
      lines.push('模块：' + (item.submodule || '未标注') + (item.unitId ? ' / ' + item.unitId : ''));
      lines.push('题目：' + (item.prompt || '未保存题干'));
      if (item.options && item.options.length) lines.push('选项：' + item.options.map(optionLine).join('；'));
      lines.push('学习者答案：' + (item.selectedAnswer || '未作答'));
      lines.push('正确答案：' + (item.correctAnswer || '无客观答案'));
      lines.push('结果：' + ({ correct: '正确', wrong: '错误', unanswered: '未作答', recorded: '已记录，未自动判分' }[item.result] || item.result || '未知'));
      if (item.finalErrorCategory) lines.push('学习者确认的错因：' + item.finalErrorCategory);
      if (item.ruleIds && item.ruleIds.length) lines.push('Reader 规则 ID：' + item.ruleIds.join('、'));
      if (item.ruleEvidence) lines.push('Reader 规则依据：' + item.ruleEvidence);
      lines.push('');
    });
    return lines.join('\n').trim();
  }

  return { createSubmission: createSubmission, latestSubmissions: latestSubmissions, buildTutorPrompt: buildTutorPrompt };
});
