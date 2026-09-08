(function (root) {
  'use strict';
  var active = null;

  function escape(value) { return escapeHtml(String(value == null ? '' : value)); }
  function ru(value) {
    return renderRuText(String(value || ''), lookupContextWithSentence('grammar', active && active.card.id, 'study-teaching', value));
  }
  function paragraph(value, className) { return value ? '<p' + (className ? ' class="' + className + '"' : '') + '>' + ru(value) + '</p>' : ''; }
  function target(id) { return 'study-teaching-' + id; }
  function progressKey() {
    return active && active.card.teachingNarrative.progressKey || 'teachingV1';
  }
  function record() {
    var all = loadStudyCardProgress();
    var card = active && all[active.card.id];
    return card && card[progressKey()] || { answers: {}, retries: {}, transfers: {} };
  }
  function saveProgress(update) {
    var all = loadStudyCardProgress();
    var cardRecord = all[active.card.id] || {};
    var key = progressKey();
    var teaching = cardRecord[key] || { answers: {}, retries: {}, transfers: {} };
    teaching.answers = teaching.answers || {};
    teaching.retries = teaching.retries || {};
    teaching.transfers = teaching.transfers || {};
    update(teaching);
    cardRecord[key] = teaching;
    all[active.card.id] = cardRecord;
    saveStudyCardProgress(all);
  }
  function optionButtons(options, attribute, id, answer, correctIndex) {
    return '<div class="b2-teaching-options zlatoust-learning-check-options">' + (options || []).map(function (option, index) {
      var state = answer && index === correctIndex ? ' is-correct' : answer && index === answer.selected && !answer.correct ? ' is-wrong' : '';
      return '<button type="button" class="zlatoust-learning-check-option' + state + '" ' + attribute + '="' + index + '" data-check="' + escape(id) + '" aria-pressed="' + !!(answer && answer.selected === index) + '"><strong>' + (index + 1) + '</strong><span>' + ru(option) + '</span></button>';
    }).join('') + '</div>';
  }
  function checkFeedback(check, answer) {
    if (!answer) return '';
    if (!check.feedback) return (answer.correct ? '正确。' : '再看看动作人。') + (check.rationale || '');
    if (answer.correct) return check.feedback.correct || check.rationale || '判断正确。';
    return [
      check.feedback.misconception,
      check.feedback.review ? '回看：' + check.feedback.review : '',
      check.feedback.contrast ? '对比：' + check.feedback.contrast : ''
    ].filter(Boolean).join(' ');
  }
  function retryFeedback(check, answer) {
    if (!answer || !check.retry) return '';
    return (answer.correct ? '这次判断正确。' : '这次还没有接对。') + (check.retry.rationale || '');
  }
  function feedbackHtml(text, correct) {
    if (!text) return '';
    return '<p><strong>' + (correct ? '判断正确：' : '这次误判在这里：') + '</strong>' + escape(text) + '</p>';
  }
  function checkHtml(check) {
    if (!check) return '';
    var progress = record();
    var answer = (progress.answers || {})[check.id];
    var retry = (progress.retries || {})[check.id];
    var html = '<section class="b2-teaching-check zlatoust-narrative-inline-check" data-teaching-check="' + escape(check.id) + '"><h3>马上练一下</h3><p>先用刚才的方法判断，再查看定向反馈。</p><div class="zlatoust-learning-check"><h4>教学补充练习</h4>' +
      paragraph(check.prompt, 'zlatoust-learning-check-prompt') + optionButtons(check.options, 'data-teaching-answer', check.id, answer, check.answer) +
      '<div class="b2-teaching-feedback zlatoust-learning-feedback' + (answer && !answer.correct ? ' is-wrong' : '') + '" aria-live="polite"' + (answer ? '' : ' hidden') + '>' + feedbackHtml(checkFeedback(check, answer), answer && answer.correct) + '</div>';
    if (check.retry) {
      html += '<div class="b2-teaching-retry zlatoust-retry" data-teaching-retry="' + escape(check.id) + '"' + (answer ? '' : ' hidden') + '><h4>换一句再练</h4>' +
        paragraph(check.retry.prompt, 'zlatoust-learning-check-prompt') + optionButtons(check.retry.options, 'data-teaching-retry-answer', check.id, retry, check.retry.answer) +
        '<div class="b2-teaching-retry-feedback zlatoust-learning-feedback' + (retry && !retry.correct ? ' is-wrong' : '') + '" aria-live="polite"' + (retry ? '' : ' hidden') + '>' + feedbackHtml(retryFeedback(check, retry), retry && retry.correct) + '</div></div>';
    }
    return html + '</div></section>';
  }
  function exampleHtml(example) {
    var source = /教材|原书/.test(example.label || '') ? 'source-example' : 'learning-note';
    var sourceLabel = source === 'source-example' ? '原书例句' : '学习辅助';
    return '<article class="b2-teaching-example zlatoust-narrative-example"><div class="zlatoust-narrative-example-label"><span class="zlatoust-source-badge ' + source + '">' + sourceLabel + '</span><strong>' + escape(example.label || '教学例句') + '</strong></div>' + paragraph(example.ru, 'ru') + paragraph(example.zh, 'zh') + (example.note ? paragraph(example.note, 'zlatoust-narrative-explanation') : '') + '</article>';
  }
  function contrastHtml(contrast) {
    if (contrast.leftRu || contrast.rightRu) {
      return '<section class="b2-teaching-contrast zlatoust-narrative-contrast"><h3>只改变一个条件</h3><article class="zlatoust-contrast-card"><div class="zlatoust-contrast-sides"><div class="zlatoust-contrast-side"><strong>' + escape(contrast.leftLabel || '这一边') + '</strong>' + paragraph(contrast.leftRu, 'ru') + paragraph(contrast.leftZh, 'zh') + '</div>' +
        '<div class="zlatoust-contrast-side"><strong>' + escape(contrast.rightLabel || '另一边') + '</strong>' + paragraph(contrast.rightRu, 'ru') + paragraph(contrast.rightZh, 'zh') + '</div></div>' +
        '<p class="b2-teaching-contrast-reason"><strong>判断差别：</strong>' + ru(contrast.reason) + '</p></article></section>';
    }
    return '<article class="b2-teaching-contrast zlatoust-narrative-example">' + paragraph(contrast.ru, 'ru') + paragraph(contrast.zh, 'zh') + paragraph(contrast.reason, 'zlatoust-narrative-explanation') + '</article>';
  }
  function worksheetHtml(section) {
    var prompts = Array.isArray(section.worksheet) ? section.worksheet : section.worksheet && section.worksheet.prompts;
    var answer = section.explanation || section.worksheet && section.worksheet.answer;
    if (!prompts || !prompts.length) return '';
    return '<div class="b2-teaching-worksheet zlatoust-narrative-worksheet"><strong>分别填两行</strong>' + prompts.map(function (question) {
      return '<p><span>' + escape(question) + '</span><i aria-hidden="true"></i></p>';
    }).join('') + '<small>先自己填，再核对答案。</small></div><details class="b2-teaching-answer"><summary>核对两个动作人</summary>' + paragraph(answer) + '</details>';
  }
  function mindMapHtml(narrative) {
    if (!narrative.mindMap || !narrative.mindMap.length) return '';
    var sections = {};
    (narrative.sections || []).forEach(function (section) { sections[section.id] = section; });
    var nodes = narrative.mindMap.map(function (item) {
      var section = sections[item.sectionId] || {};
      var examples = section.examples || (section.example ? [section.example] : []);
      var feedback = section.check && section.check.feedback || {};
      return {
        id: item.sectionId,
        label: item.title || item.label,
        recognize: item.recognize || section.lede || item.label,
        rule: item.rule || item.result,
        example: item.example || (examples[0] && examples[0].ru) || '',
        trap: item.trap || feedback.misconception || feedback.contrast || ''
      };
    });
    var map = root.ReaderMindMap.renderRetrievalMap({
      nodes: nodes,
      rootLines: narrative.mindMapRootLines || ['先问两次', '谁做'],
      rootMaxY: narrative.mindMapRootMaxY || 390,
      ariaLabel: narrative.mindMapAriaLabel || '知识点思维导图',
      targetForNode: function (node) { return target(node.id); },
      linkAttributesForNode: function (node, targetId) {
        return {
          href: '#' + targetId,
          'data-teaching-jump': node.id,
          'aria-label': '查看' + node.label
        };
      }
    });
    return '<section class="b2-teaching-map zlatoust-unit-map zlatoust-unit-map-retrieval" data-knowledge-resume-section="study-teaching-map" data-knowledge-resume-label="本知识点思维导图"><h2>本知识点思维导图</h2><p>沿着彩色分支看：先认出句子属于哪种情况，再核对规则、例句和最容易掉进去的坑。</p><div class="zlatoust-mindmap-wrap">' + map + '</div></section>';
  }
  function decisionHtml(narrative) {
    if (!narrative.decisionSteps || !narrative.decisionSteps.length) return '';
    var title = narrative.decisionTitle || '做题和写句子时，按这个顺序判断';
    var criterion = narrative.decisionCriterion || '要能说出哪个事实决定了你的选择，而不只是说“看起来顺”。';
    return '<section class="b2-teaching-decision zlatoust-narrative-section" data-knowledge-resume-section="study-teaching-decision" data-knowledge-resume-label="判断步骤"><p class="zlatoust-narrative-eyebrow">最后整理</p><h2>' + escape(title) + '</h2><ol class="zlatoust-narrative-steps">' + narrative.decisionSteps.map(function (step, index) {
      return '<li><span>第 ' + (index + 1) + ' 步</span><p>' + ru(step) + '</p></li>';
    }).join('') + '</ol><aside class="zlatoust-narrative-rule"><span>合格的理由</span><p>' + ru(criterion) + '</p></aside></section>';
  }
  function transferFeedback(task, answer) {
    if (!answer) return '';
    if (answer.correct) return task.correct || task.rationale || '判断正确。';
    return task.misconception || task.rationale || '重新按四步判断法检查。';
  }
  function transferHtml(narrative) {
    if (!narrative.transferTasks || !narrative.transferTasks.length) return '';
    var progress = record();
    var transfers = progress.transfers || {};
    return '<section class="b2-teaching-transfer zlatoust-transfer zlatoust-narrative-practice" data-knowledge-resume-section="study-teaching-transfer" data-knowledge-resume-label="综合应用"><h2>最后综合应用</h2><p>这里要处理新语境。先判断，再查看反馈。</p>' + narrative.transferTasks.map(function (task, index) {
      var saved = transfers[task.id];
      var html = '<article class="zlatoust-transfer-task" data-teaching-transfer="' + escape(task.id) + '"><h3>任务 ' + (index + 1) + '：' + escape(task.title) + '</h3>' + paragraph(task.prompt, 'zlatoust-learning-check-prompt');
      if (task.options && task.options.length) {
        html += optionButtons(task.options, 'data-teaching-transfer-answer', task.id, saved, task.answer) + '<div class="b2-teaching-transfer-feedback zlatoust-learning-feedback' + (saved && !saved.correct ? ' is-wrong' : '') + '" aria-live="polite"' + (saved ? '' : ' hidden') + '>' + feedbackHtml(transferFeedback(task, saved), saved && saved.correct) + '</div>';
      } else {
        html += '<textarea data-teaching-transfer-text="' + escape(task.id) + '" rows="4" placeholder="先写下自己的句子和两行‘谁做’">' + escape(saved && saved.text || '') + '</textarea>' +
          '<p class="zlatoust-transfer-hint">先写下自己的判断，再打开检查标准。</p><details><summary>查看检查标准</summary>' + paragraph(task.guidance) + '</details>';
      }
      return html + '</article>';
    }).join('') + '</section>';
  }
  function neighboringHtml(narrative) {
    var scope = narrative.neighboringScope;
    if (!scope) return '';
    return '<details class="b2-teaching-extra zlatoust-narrative-errors"><summary>本卡与相邻知识怎样分工</summary><div class="b2-teaching-details-body">' + paragraph(scope.covered) +
      (scope.handOff && scope.handOff.length ? '<p>下列内容只说明与主体规则的关系，不在本卡全部展开：</p><ul>' + scope.handOff.map(function (item) { return '<li>' + escape(item) + '</li>'; }).join('') + '</ul>' : '') + '</div></details>';
  }
  function legacyHtml(card) {
    var narrative = card.teachingNarrative;
    var notes = narrative.legacyCheckNotes || {};
    var legacy = Object.assign({}, card, {
      checks: card.checks.map(correctedCheck),
      lessons: card.lessons.map(function (lesson) { return Object.assign({}, lesson, { instantChecks: lesson.instantChecks.map(correctedCheck) }); })
    });
    function correctedCheck(check) {
      return Object.assign({}, check, notes[check.id] ? { rationale: notes[check.id] } : {});
    }
    studyCardCheckRegistry[card.id] = legacy;
    return '<details class="b2-teaching-legacy zlatoust-stage-evidence"><summary><span>旧版练习与历史成绩</span><small>原编号和旧学习记录继续保留</small></summary><div class="zlatoust-stage-evidence-body">' + paragraph(narrative.legacyNotes) +
      legacy.lessons.map(function (lesson) {
        return (lesson.instantChecks || []).map(function (check, index) { return renderStudyCheck(Object.assign({ _cardId: card.id }, check), index); }).join('');
      }).join('') + renderStudyChecks(legacy) + '</div></details>';
  }
  function render(card, chapter, navigation) {
    active = { card: card, chapter: chapter, navigation: navigation || null };
    var narrative = card.teachingNarrative;
    var stats = getStudyCardProgress(card.partId, card.exerciseIds);
    var exerciseNumbers = card.exerciseIds.map(function (id) { return Number(id.slice(-3)); });
    var exerciseRange = exerciseNumbers.length ? exerciseNumbers[0] + (exerciseNumbers.length > 1 ? '–' + exerciseNumbers[exerciseNumbers.length - 1] : '') : '';
    var heroProblem = narrative.heroProblem || narrative.intro;
    var quickTitle = narrative.quickTitle || '先问两次“谁做”';
    var sourceNotice = narrative.sourceNotice || '原题、来源和历史记录均保留';
    var html = '<main class="main-container b2-study-card b2-teaching zlatoust-learning-page zlatoust-narrative reader-workbench reader-workbench--knowledge">' +
      '<header class="b2-quiz-header zlatoust-learning-hero"><p class="zlatoust-learning-kicker">' + escape(String(card.partId || '').toUpperCase()) + ' · 知识点 ' + escape(card.id) + '</p><h1>' + escape(card.title) + '</h1><p class="zlatoust-learning-problem">' + ru(heroProblem) + '</p><div class="zlatoust-learning-meta"><span data-teaching-stats>原题 ' + escape(exerciseRange) + ' · 已答 ' + stats.answered + ' · 待掌握 ' + stats.pending + '</span><span>' + narrative.sections.length + ' 节连续微课</span><span>' + card.exerciseIds.length + ' 道原书题</span><span>' + escape(sourceNotice) + '</span></div>' +
      '<div class="b2-teaching-return"' + (navigation ? '' : ' hidden') + '><button type="button" class="zlatoust-back-link" data-teaching-return>返回刚才那道题</button></div></header>' +
      '<section class="b2-teaching-quick zlatoust-narrative-section" id="study-teaching-quick" data-knowledge-resume-section="study-teaching-quick" data-knowledge-resume-label="30 秒先弄懂"><p class="zlatoust-narrative-eyebrow">30 秒先弄懂</p><h2>' + escape(quickTitle) + '</h2><p class="zlatoust-narrative-lede">' + ru(narrative.quickContrast) + '</p><aside class="zlatoust-narrative-quick"><span>先记这一句</span><p>' + ru(narrative.intro) + '</p></aside><small>' + escape(narrative.label) + '</small>' +
      (narrative.objectives && narrative.objectives.length ? '<div class="zlatoust-objectives"><h3>学完以后，你应该能做到</h3><ul>' + narrative.objectives.map(function (item) { return '<li>' + escape(item) + '</li>'; }).join('') + '</ul></div>' : '') + '</section>' +
      mindMapHtml(narrative) +
      '<nav class="b2-study-outline" aria-label="知识点目录">' + narrative.sections.map(function (section, index) {
        return '<a href="#' + target(section.id) + '">' + (index + 1) + '. ' + escape(section.title) + '</a>';
      }).join('') + '</nav>';
    html += narrative.sections.map(function (section, index) {
      var sectionHtml = '<section class="b2-teaching-section zlatoust-narrative-section" id="' + target(section.id) + '" tabindex="-1" data-knowledge-resume-section="' + target(section.id) + '" data-knowledge-resume-label="' + escape(section.title) + '"><p class="zlatoust-narrative-eyebrow">第 ' + (index + 1) + ' 部分</p><h2>' + escape(section.title) + '</h2>';
      if (section.lede) sectionHtml += '<p class="b2-teaching-lede zlatoust-narrative-lede">' + ru(section.lede) + '</p>';
      sectionHtml += (section.paragraphs || []).map(function (text) { return paragraph(text, 'zlatoust-narrative-paragraph'); }).join('');
      var examples = section.examples || (section.example ? [section.example] : []);
      sectionHtml += examples.map(exampleHtml).join('') + worksheetHtml(section);
      var contrasts = section.contrasts || (section.contrast ? [section.contrast] : []);
      sectionHtml += contrasts.map(contrastHtml).join('') + checkHtml(section.check);
      var exerciseIds = section.exerciseIds || [];
      if (exerciseIds.length) {
        sectionHtml += '<details class="b2-teaching-formal zlatoust-stage-practice"><summary>原书正式题 · ' + exerciseIds.map(function (id) { return Number(id.slice(-3)); }).join('、') + ' 题</summary><div class="zlatoust-original-practice">';
        sectionHtml += exerciseIds.map(function (id) {
          var exercise = chapter.exercises.find(function (item) { return item.id === id; });
          return exercise ? renderQuizItem(exercise, getQuizRecord(id)) : '';
        }).join('') + '</div></details>';
      }
      return sectionHtml + '</section>';
    }).join('');
    html += decisionHtml(narrative);
    html += '<details class="b2-teaching-extra zlatoust-narrative-errors"><summary>常见误区</summary><div class="b2-teaching-details-body"><ul>' + (narrative.pitfalls || []).map(function (item) { return '<li>' + ru(item) + '</li>'; }).join('') + '</ul></div></details>';
    html += transferHtml(narrative) + neighboringHtml(narrative);
    html += '<details class="b2-teaching-extra zlatoust-stage-evidence"><summary><span>教材依据与核对说明</span><small>教学主线已经讲完，需要核验时再展开</small></summary><div class="zlatoust-stage-evidence-body">' + (narrative.sources || []).map(function (source) {
      return '<h3>' + escape(source.label) + '</h3><blockquote>' + paragraph(source.quote) + '</blockquote>' + paragraph(source.note);
    }).join('') + '<details><summary>旧卡来源记录</summary>' + card.sources.map(renderStudySource).join('') + '</details></div></details>';
    html += legacyHtml(card);
    return html + '<nav class="b2-study-actions zlatoust-learning-footer"><button type="button" class="zlatoust-back-link" onclick="goChapter(' + chapter.index + ')">返回 P3 练习</button><button type="button" class="zlatoust-back-link" onclick="rememberKnowledgeCardPosition()">记住这里</button><span></span></nav></main>';
  }
  function mappingFor(exercise) {
    if (!curBook || curBook.id !== 'russian_b2' || !curBook.isB2Module || !currentQuizData) return null;
    for (var point of currentQuizData.knowledgePoints || []) {
      var mapping = (point.teachingMapping || []).find(function (item) { return item.exerciseId === exercise.id; });
      if (mapping) return { point: point, mapping: mapping };
    }
    return null;
  }
  function links(exercise) {
    var item = mappingFor(exercise);
    if (!item) return '';
    var mapping = item.mapping;
    return '<aside class="b2-teaching-links">' + paragraph(mapping.reason) + '<button type="button" data-teaching-open="' + escape(exercise.id) + '">补看：' + escape(mapping.title) + '</button>' + (mapping.notice ? '<p class="b2-teaching-notice">' + escape(mapping.notice) + '</p>' : '') + '</aside>';
  }
  function openFromQuestion(id) {
    var exercise = getQuizExercise(id), found = exercise && mappingFor(exercise);
    if (!found) return;
    if (curView === 'study-card' && active && active.card.id === found.point.studyCardId) {
      active.inlineReturn = { inline: true, questionId: id };
      var back = document.querySelector('.b2-teaching-return');
      if (back) back.hidden = false;
      focusSection(found.mapping.sectionId);
      return;
    }
    var navigation = { questionId: id, sectionId: found.mapping.sectionId, chapterIndex: curCh, data: currentQuizData, all: currentQuizAllExercises, scroll: window.scrollY };
    showStudyCard(currentQuizData.id, found.point.studyCardId, null, navigation);
  }
  function focusSection(id) {
    var node = document.getElementById(target(id));
    if (node) { node.scrollIntoView({ block: 'start' }); node.focus({ preventScroll: true }); }
  }
  function afterShow(navigation) {
    if (navigation && navigation.sectionId) requestAnimationFrame(function () { focusSection(navigation.sectionId); });
  }
  function returnToQuestion(leaveCard) {
    var navigation = active && (leaveCard ? active.navigation : active.inlineReturn || active.navigation);
    if (!navigation) return;
    if (navigation.inline) {
      var node = document.querySelector('[data-question-id="' + navigation.questionId + '"]');
      if (node) { node.closest('details').open = true; node.scrollIntoView({ block: 'start' }); }
      active.inlineReturn = null;
      var back = document.querySelector('.b2-teaching-return');
      if (back) back.hidden = !active.navigation;
    } else {
      curView = 'reading'; curCh = navigation.chapterIndex; syncReaderShellState();
      currentQuizAllExercises = navigation.all;
      pendingQuizJumpId = navigation.questionId;
      renderQuizChapter(navigation.data, navigation.scroll, { activeQuestionId: navigation.questionId, scroll: navigation.scroll });
    }
  }
  function refreshStats() {
    var node = document.querySelector('[data-teaching-stats]');
    if (!node || !active) return;
    var stats = getStudyCardProgress(active.card.partId, active.card.exerciseIds);
    var numbers = active.card.exerciseIds.map(function (id) { return Number(id.slice(-3)); });
    var range = numbers.length ? numbers[0] + (numbers.length > 1 ? '–' + numbers[numbers.length - 1] : '') : '';
    node.textContent = '原题 ' + range + ' · 已答 ' + stats.answered + ' · 待掌握 ' + stats.pending;
  }
  function findCheck(id) {
    return active.card.teachingNarrative.sections.map(function (section) { return section.check; }).filter(Boolean).find(function (check) { return check.id === id; });
  }
  document.addEventListener('click', function (event) {
    var jumpTarget = event.target.closest('[data-teaching-jump]');
    if (jumpTarget) {
      event.preventDefault();
      focusSection(jumpTarget.getAttribute('data-teaching-jump'));
      return;
    }
    var button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-teaching-open')) { openFromQuestion(button.dataset.teachingOpen); return; }
    if (button.hasAttribute('data-teaching-return')) { returnToQuestion(); return; }
    if (!active || !button.closest('.b2-teaching')) return;
    if (button.hasAttribute('data-teaching-answer')) {
      var check = findCheck(button.dataset.check);
      if (!check) return;
      var selected = Number(button.dataset.teachingAnswer);
      var answer = { selected: selected, correct: selected === check.answer, at: new Date().toISOString() };
      saveProgress(function (teaching) { teaching.answers[check.id] = answer; });
      var container = button.closest('[data-teaching-check]');
      container.querySelectorAll('[data-teaching-answer]').forEach(function (item, index) {
        item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
        item.classList.toggle('is-correct', index === check.answer);
        item.classList.toggle('is-wrong', item === button && !answer.correct);
      });
      var feedback = container.querySelector('.b2-teaching-feedback');
      feedback.hidden = false;
      feedback.classList.toggle('is-wrong', !answer.correct);
      feedback.innerHTML = feedbackHtml(checkFeedback(check, answer), answer.correct);
      var retry = container.querySelector('[data-teaching-retry]');
      if (retry) retry.hidden = false;
      return;
    }
    if (button.hasAttribute('data-teaching-retry-answer')) {
      var retryCheck = findCheck(button.dataset.check);
      if (!retryCheck || !retryCheck.retry) return;
      var retrySelected = Number(button.dataset.teachingRetryAnswer);
      var retryAnswer = { selected: retrySelected, correct: retrySelected === retryCheck.retry.answer, at: new Date().toISOString() };
      saveProgress(function (teaching) { teaching.retries[retryCheck.id] = retryAnswer; });
      var retryContainer = button.closest('[data-teaching-retry]');
      retryContainer.querySelectorAll('[data-teaching-retry-answer]').forEach(function (item, index) {
        item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
        item.classList.toggle('is-correct', index === retryCheck.retry.answer);
        item.classList.toggle('is-wrong', item === button && !retryAnswer.correct);
      });
      var retryFeedbackNode = retryContainer.querySelector('.b2-teaching-retry-feedback');
      retryFeedbackNode.hidden = false;
      retryFeedbackNode.classList.toggle('is-wrong', !retryAnswer.correct);
      retryFeedbackNode.innerHTML = feedbackHtml(retryFeedback(retryCheck, retryAnswer), retryAnswer.correct);
      return;
    }
    if (button.hasAttribute('data-teaching-transfer-answer')) {
      var task = (active.card.teachingNarrative.transferTasks || []).find(function (item) { return item.id === button.dataset.check; });
      if (!task) return;
      var transferSelected = Number(button.dataset.teachingTransferAnswer);
      var transferAnswer = { selected: transferSelected, correct: transferSelected === task.answer, at: new Date().toISOString() };
      saveProgress(function (teaching) { teaching.transfers[task.id] = transferAnswer; });
      var transferContainer = button.closest('[data-teaching-transfer]');
      transferContainer.querySelectorAll('[data-teaching-transfer-answer]').forEach(function (item, index) {
        item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
        item.classList.toggle('is-correct', index === task.answer);
        item.classList.toggle('is-wrong', item === button && !transferAnswer.correct);
      });
      var transferFeedbackNode = transferContainer.querySelector('.b2-teaching-transfer-feedback');
      transferFeedbackNode.hidden = false;
      transferFeedbackNode.classList.toggle('is-wrong', !transferAnswer.correct);
      transferFeedbackNode.innerHTML = feedbackHtml(transferFeedback(task, transferAnswer), transferAnswer.correct);
    }
  });
  document.addEventListener('change', function (event) {
    var field = event.target.closest('[data-teaching-transfer-text]');
    if (!field || !active || !field.closest('.b2-teaching')) return;
    var id = field.dataset.teachingTransferText;
    saveProgress(function (teaching) { teaching.transfers[id] = { text: field.value, at: new Date().toISOString() }; });
  });
  root.B2StudyTeaching = { render: render, links: links, afterShow: afterShow, returnToQuestion: returnToQuestion, refreshStats: refreshStats };
})(window);
