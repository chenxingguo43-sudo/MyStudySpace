(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ZlatoustProgressSnapshot = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var STATUS_LABELS = Object.freeze({
    unstarted: '未开始',
    learning: '学习中',
    learned: '已学习',
    mastered: '已掌握',
    weak: '薄弱'
  });
  var STATUS_ORDER = ['unstarted', 'learning', 'learned', 'mastered', 'weak'];
  var CHAPTER_LABELS = Object.freeze({
    gl1: '第一章：一致与动词体',
    gl2: '第二章：支配、定语与语义关系',
    gl3: '第三章：动名副词',
    gl4: '第四章：复句与关系词',
    gl5: '第五章：语体与词汇'
  });
  var KNOWLEDGE_BASE_ROOT = '语法/В мире людей·语法词汇知识库';

  function object(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function unique(values) {
    return Array.from(new Set((values || []).filter(Boolean)));
  }

  function submitted(record) {
    return !!(record && record.submitted);
  }

  function currentWrong(record) {
    return submitted(record) && (record.correct === false || record.lastResult === 'wrong' || record.wrong === true);
  }

  function currentlyCorrect(record) {
    return submitted(record) && (record.correct === true || record.lastResult === 'correct' || record.wrong === false);
  }

  function everWrong(record) {
    return !!(record && (record.everWrong || currentWrong(record)));
  }

  function officialRecordsFor(page, officialProgress) {
    var chapter = object(object(officialProgress)['zlatoust_grammar:' + page.chapterId]);
    var ids = unique((page.stages || []).reduce(function (all, stage) {
      return all.concat(stage.exerciseIds || []);
    }, []));
    return ids.map(function (id) { return { id: id, record: chapter[id] }; });
  }

  function stageSnapshot(stage, record, officialById) {
    var checks = (stage.checks || []).map(function (check) {
      return { id: check.id, record: object(record.checks)[check.id] };
    });
    var official = unique(stage.exerciseIds || []).map(function (id) {
      return { id: id, record: officialById[id] };
    });
    var manualReview = !!object(record.reviewStages)[stage.id];
    var hasCurrentWrong = checks.some(function (item) { return currentWrong(item.record); }) ||
      official.some(function (item) { return currentWrong(item.record); });
    var hasHistory = checks.some(function (item) { return everWrong(item.record); }) ||
      official.some(function (item) { return everWrong(item.record); });
    var allChecksCorrect = checks.length > 0 && checks.every(function (item) { return currentlyCorrect(item.record); });
    var hasActivity = checks.some(function (item) { return submitted(item.record); }) ||
      official.some(function (item) { return submitted(item.record); }) || record.lastStage === stage.id;
    var status = manualReview || hasCurrentWrong ? 'weak' : allChecksCorrect ? 'completed' : hasActivity ? 'learning' : 'unstarted';
    return {
      id: stage.id,
      number: stage.number,
      title: stage.title || stage.id,
      status: status,
      manualReview: manualReview,
      hasCurrentWrong: hasCurrentWrong,
      hasHistory: hasHistory,
      checks: {
        total: checks.length,
        submitted: checks.filter(function (item) { return submitted(item.record); }).length,
        correct: checks.filter(function (item) { return currentlyCorrect(item.record); }).length
      },
      official: {
        total: official.length,
        submitted: official.filter(function (item) { return submitted(item.record); }).length,
        currentWrong: official.filter(function (item) { return currentWrong(item.record); }).length,
        everWrong: official.filter(function (item) { return everWrong(item.record); }).length
      }
    };
  }

  function cardSnapshot(page, learningProgress, officialProgress) {
    var record = object(object(learningProgress).units)[page.sectionId] || {};
    var officialItems = officialRecordsFor(page, officialProgress);
    var officialById = Object.fromEntries(officialItems.map(function (item) { return [item.id, item.record]; }));
    var stages = (page.stages || []).map(function (stage) { return stageSnapshot(stage, record, officialById); });
    var stageCheckIds = unique((page.stages || []).reduce(function (all, stage) {
      return all.concat((stage.checks || []).map(function (check) { return check.id; }));
    }, []));
    var checkRecords = stageCheckIds.map(function (id) { return object(record.checks)[id]; });
    var finalRecord = page.finalCheck && object(record.checks)[page.finalCheck.id];
    var transferTasks = page.transferTasks || [];
    var transferComplete = !transferTasks.length || transferTasks.every(function (task) {
      return submitted(object(record.transfer)[task.id]);
    });
    var weakStages = stages.filter(function (stage) { return stage.status === 'weak'; });
    var manualReviewStages = stages.filter(function (stage) { return stage.manualReview; });
    var historyStages = stages.filter(function (stage) { return stage.hasHistory; });
    var finalWrong = currentWrong(finalRecord);
    var activeWeak = weakStages.length > 0 || finalWrong;
    var allStageChecksSubmitted = stageCheckIds.length > 0 && checkRecords.every(submitted);
    var allStageChecksCorrect = stageCheckIds.length > 0 && checkRecords.every(currentlyCorrect);
    var allOfficialCorrect = officialItems.length > 0 && officialItems.every(function (item) { return currentlyCorrect(item.record); });
    var hasActivity = !!record.openedAt || !!record.lastStage || checkRecords.some(submitted) || submitted(finalRecord) ||
      Object.keys(object(record.transfer)).some(function (id) { return submitted(object(record.transfer)[id]); }) ||
      officialItems.some(function (item) { return submitted(item.record); });
    var status = activeWeak ? 'weak' :
      (allStageChecksCorrect && transferComplete) || allOfficialCorrect ? 'mastered' :
      allStageChecksSubmitted ? 'learned' : hasActivity ? 'learning' : 'unstarted';
    var chapterNumber = Number(String(page.chapterId || '').replace('gl', '')) || 0;
    var title = page.titleZh || page.sectionId;
    return {
      sectionId: page.sectionId,
      chapterId: page.chapterId,
      chapterLabel: CHAPTER_LABELS[page.chapterId] || page.chapterId,
      title: title,
      status: status,
      statusLabel: STATUS_LABELS[status],
      link: '[[' + KNOWLEDGE_BASE_ROOT + '/知识点/第' + chapterNumber + '章/' + page.sectionId + '|' + page.sectionId + ' ' + String(title).replace(/\|/g, '／') + ']]',
      stageCount: stages.length,
      completedStageCount: stages.filter(function (stage) { return stage.status === 'completed'; }).length,
      stages: stages,
      weakStages: weakStages,
      manualReviewStages: manualReviewStages,
      historyStages: historyStages,
      finalWrong: finalWrong,
      checks: {
        total: stageCheckIds.length,
        submitted: checkRecords.filter(submitted).length,
        correct: checkRecords.filter(currentlyCorrect).length,
        everWrong: checkRecords.filter(everWrong).length
      },
      official: {
        total: officialItems.length,
        submitted: officialItems.filter(function (item) { return submitted(item.record); }).length,
        currentWrong: officialItems.filter(function (item) { return currentWrong(item.record); }).length,
        everWrong: officialItems.filter(function (item) { return everWrong(item.record); }).length
      },
      transfer: {
        total: transferTasks.length,
        submitted: transferTasks.filter(function (task) { return submitted(object(record.transfer)[task.id]); }).length
      }
    };
  }

  function buildSnapshot(options) {
    var settings = options || {};
    var pages = (settings.pages || []).filter(function (page) { return page && page.sectionId; });
    var cards = pages.map(function (page) {
      return cardSnapshot(page, settings.learningProgress, settings.officialProgress);
    });
    var counts = Object.fromEntries(STATUS_ORDER.map(function (status) {
      return [status, cards.filter(function (card) { return card.status === status; }).length];
    }));
    return {
      schemaVersion: 1,
      generatedAt: (settings.generatedAt || new Date()).toISOString(),
      cardCount: cards.length,
      counts: counts,
      completedStageCount: cards.reduce(function (total, card) { return total + card.completedStageCount; }, 0),
      stageCount: cards.reduce(function (total, card) { return total + card.stageCount; }, 0),
      cards: cards
    };
  }

  function yamlString(value) {
    return JSON.stringify(String(value == null ? '' : value));
  }

  function tableText(value) {
    return String(value == null ? '' : value).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
  }

  function stageNames(stages) {
    return (stages || []).map(function (stage) { return stage.number + '. ' + stage.title; }).join('；') || '无';
  }

  function renderMarkdown(snapshot) {
    var date = snapshot.generatedAt.slice(0, 10);
    var counts = snapshot.counts;
    var lines = [
      '---',
      'date: ' + date,
      'updated: ' + yamlString(snapshot.generatedAt),
      'type: world-people-grammar-progress-snapshot',
      'book: "В мире людей - 语法词汇"',
      'snapshot_status: exported',
      'source_of_truth: Reader',
      'card_count: ' + snapshot.cardCount,
      'ai-first: true',
      'tags:',
      '  - 俄语/语法词汇',
      '  - В-мире-людей',
      '  - 学习进度快照',
      '---',
      '',
      '%% READER PROGRESS SNAPSHOT. This file is read-only and never writes progress back to Reader. %%',
      '',
      '# 学习进度快照',
      '',
      '## For future Claude',
      '',
      '这是 Reader 在 ' + snapshot.generatedAt + ' 生成的《В мире людей - 语法词汇》学习进度只读快照。Reader 仍是答题与复习记录的唯一权威来源；这份文件只用于在 Obsidian 中查看和检索，不能反向修改 Reader。',
      '',
      '> [!info]+ 数据范围',
      '> 只汇总 32 张知识点卡的随堂判断、迁移任务、正式题结果和手动复习标记。快照不包含录音、密钥、缓存或其他学习模块数据。',
      '',
      '## 总体进度',
      '',
      '| 状态 | 卡片数 |',
      '| --- | ---: |',
      '| 未开始 | ' + counts.unstarted + ' |',
      '| 学习中 | ' + counts.learning + ' |',
      '| 已学习 | ' + counts.learned + ' |',
      '| 已掌握 | ' + counts.mastered + ' |',
      '| 薄弱 | ' + counts.weak + ' |',
      '',
      '- **阶段完成：** ' + snapshot.completedStageCount + ' / ' + snapshot.stageCount,
      '- **快照时间：** ' + snapshot.generatedAt,
      ''
    ];
    var weakCards = snapshot.cards.filter(function (card) { return card.status === 'weak'; });
    lines.push('## 优先复习', '');
    if (!weakCards.length) lines.push('- 当前没有处于“薄弱”状态的卡片。');
    weakCards.forEach(function (card) {
      var reasons = [];
      if (card.manualReviewStages.length) reasons.push('手动标记：' + stageNames(card.manualReviewStages));
      if (card.weakStages.some(function (stage) { return stage.hasCurrentWrong; })) {
        reasons.push('当前误判：' + stageNames(card.weakStages.filter(function (stage) { return stage.hasCurrentWrong; })));
      }
      if (card.finalWrong) reasons.push('综合判断当前错误');
      lines.push('- ' + card.link + '：' + reasons.join('；'));
    });
    lines.push('');

    var chapters = unique(snapshot.cards.map(function (card) { return card.chapterId; }));
    chapters.forEach(function (chapterId) {
      var chapterCards = snapshot.cards.filter(function (card) { return card.chapterId === chapterId; });
      lines.push('## ' + chapterCards[0].chapterLabel, '');
      lines.push('| 知识点 | 状态 | 阶段完成 | 随堂判断 | 正式题 | 当前薄弱或手动复习 | 历史误判阶段 |');
      lines.push('| --- | --- | ---: | ---: | ---: | --- | --- |');
      chapterCards.forEach(function (card) {
        var current = [];
        if (card.manualReviewStages.length) current.push('手动：' + stageNames(card.manualReviewStages));
        var wrongStages = card.weakStages.filter(function (stage) { return stage.hasCurrentWrong; });
        if (wrongStages.length) current.push('当前错：' + stageNames(wrongStages));
        if (card.finalWrong) current.push('综合判断当前错');
        lines.push('| ' + card.link + ' | ' + card.statusLabel + ' | ' + card.completedStageCount + '/' + card.stageCount +
          ' | ' + card.checks.submitted + '/' + card.checks.total + '（正确 ' + card.checks.correct + '）' +
          ' | ' + card.official.submitted + '/' + card.official.total + '（当前错 ' + card.official.currentWrong + '）' +
          ' | ' + tableText(current.join('；') || '无') + ' | ' + tableText(stageNames(card.historyStages)) + ' |');
      });
      lines.push('');
    });

    lines.push(
      '## 状态口径',
      '',
      '- **未开始：** 卡片内和关联正式题都没有学习记录。',
      '- **学习中：** 已打开、已作答一部分，或只完成了部分阶段。',
      '- **已学习：** 所有阶段随堂判断都已提交，但迁移任务尚未全部完成。',
      '- **已掌握：** 所有阶段随堂判断正确且迁移任务完成，或该卡关联正式题全部答对。',
      '- **薄弱：** 存在当前错误、综合判断错误，或你手动标记了需要复习的阶段。',
      '',
      '> [!warning]- 使用边界',
      '> 这是一张生成时刻的快照，不会自动变化。继续在 Reader 学习后，请重新导出并覆盖旧快照。',
      ''
    );
    return lines.join('\n');
  }

  function isCancelled(error) {
    var name = String(error && error.name || '');
    var message = String(error && error.message || error || '');
    return name === 'AbortError' || /cancel|canceled|cancelled|用户取消/i.test(message);
  }

  function downloadMarkdown(settings) {
    var documentRef = settings.document;
    var urlApi = settings.urlApi;
    var BlobCtor = settings.Blob || Blob;
    var blob = new BlobCtor([settings.markdown], { type: 'text/markdown;charset=utf-8' });
    var url = urlApi.createObjectURL(blob);
    var link = documentRef.createElement('a');
    link.href = url;
    link.download = settings.fileName;
    link.click();
    urlApi.revokeObjectURL(url);
    return { cancelled: false, method: 'download', fileName: settings.fileName };
  }

  async function saveMarkdown(options) {
    var settings = Object.assign({ fileName: '学习进度快照.md' }, options || {});
    if (!settings.markdown) throw new Error('学习进度快照内容为空');
    var picker = settings.showSaveFilePicker;
    if (typeof picker === 'function') {
      try {
        var handle = await picker({
          suggestedName: settings.fileName,
          types: [{ description: 'Obsidian Markdown', accept: { 'text/markdown': ['.md'] } }]
        });
        var writable = await handle.createWritable();
        await writable.write(settings.markdown);
        await writable.close();
        return { cancelled: false, method: 'picker', fileName: settings.fileName };
      } catch (error) {
        if (isCancelled(error)) return { cancelled: true, method: 'picker', fileName: settings.fileName };
      }
    }
    return downloadMarkdown(settings);
  }

  return {
    CHAPTER_LABELS: CHAPTER_LABELS,
    KNOWLEDGE_BASE_ROOT: KNOWLEDGE_BASE_ROOT,
    STATUS_LABELS: STATUS_LABELS,
    buildSnapshot: buildSnapshot,
    cardSnapshot: cardSnapshot,
    renderMarkdown: renderMarkdown,
    saveMarkdown: saveMarkdown
  };
});
