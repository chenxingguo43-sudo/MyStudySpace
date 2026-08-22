/* 3D Acrylic Card Orbit — adapted from 3D-card-acrylic/index.html */
/* Dashboard-only: renders into #folderStage / #folderDeck / #stackProgress. */
(() => {
'use strict';
const STORAGE_KEY = 'knowledge_os_orbit_config_v1';
const el = id => document.getElementById(id);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const TAU = Math.PI * 2;

const notes = [
  { name: '01 收件箱', count: 186, status: '未读' },
  { name: '02 工作项目', count: 76, status: '在读' },
  { name: '03 领域知识', count: 142, status: '未读' },
  { name: '04 内容工坊', count: 63, status: '在读' },
  { name: '阅读管理', count: 826, status: '在读' },
  { name: '05 日记复盘', count: 38, status: '已读' },
  { name: '06 资源素材', count: 92, status: '未读' },
  { name: '07 待审处理', count: 41, status: '在读' },
  { name: '90 归档', count: 74, status: '已读' },
  { name: '99 系统', count: 28, status: '已读' },
  { name: '长期未读', count: 43, status: '未读' },
  { name: '待沉淀', count: 86, status: '待沉淀' }
];

const DEFAULT = {
  perspective: 1380, scale: 1, cardWidth: 116, cardHeight: 204, orbitScale: .78, activeScale: 1.04, orbitRearScale: .70,
  blur: 1.55, glow: .76, acrylic: .16, frost: .82, rim: .72, parallax: true, reflection: true,
  progressX: 7, progressY: 15, progressWidth: 122, progressHeight: 138, progressRotate: -2.2, progressOpacity: .94, progressVisible: true,
  cardCodeFontSize: 8, cardNameFontSize: 10, cardMetaFontSize: 7,
  progressTitleFontSize: 15, progressCountFontSize: 10, progressValueFontSize: 43, progressUnitFontSize: 14, progressLabelFontSize: 10,
  progressTitle: '阅读管理', progressCountText: '826 篇笔记', progressPercentText: '56', progressLabelText: '当前吸收进度',
  orbitOffsetX: 0, orbitOffsetY: 0, selectDuration: 520, snapDuration: 360, highlightDuration: 420, orbitEasing: 'smooth',
  orbitRadiusX: 252, orbitRadiusZ: 162, orbitHeight: 9, orbitLean: 19, orbitInertia: .94, cruiseSpeed: .22,
  autoCenter: true, autoCruise: true,
  breathEnabled: true, breathStage: true, breathAmbient: true, breathDeck: true, activeBreathMode: 'gentle', breathSpeed: 6.8, breathAmount: 1
};

function loadCfg() { try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; } catch (_) { return { ...DEFAULT }; } }
let cfg = loadCfg(), activeIndex = 4, cards = [], orbitRotation = -4 * (TAU / notes.length), orbitVelocity = 0, orbitAnimation = null, orbitDragging = false, orbitMoved = false, orbitSnapPending = false, pointerId = null, lastPointerX = 0, lastPointerT = 0, dragDistance = 0, ignoreClickUntil = 0, lastFrame = performance.now(), pointerRX = 0, pointerRY = 0;

const stage = el('folderStage'), deck = el('folderDeck');
if (!stage || !deck) return;
const stepAngle = () => TAU / notes.length;
const wrapIndex = n => ((n % notes.length) + notes.length) % notes.length;
const completionFor = n => n.status === '已读' ? 100 : n.status === '在读' ? 56 : 12;

function makeCard(note, index) {
  const card = document.createElement('article');
  card.className = 'folder-card';
  card.dataset.index = index;
  card.tabIndex = 0;
  const code = note.code || ('MD · ' + String(index + 1).padStart(2, '0'));
  card.innerHTML = `<div class="folder-card-art"><div class="card-side left"></div><div class="card-side right"></div><div class="card-top-edge"></div><div class="acrylic-shell"><div class="folder-core"></div><div class="folder-paper"></div></div><div class="folder-rim"></div></div><div class="folder-text-layer" aria-label="${note.name}"><div class="folder-code"><span data-field="code">${code}</span></div><div class="folder-meta"><span data-field="count">${note.count} 篇</span><span data-field="status">${note.status}</span></div><div class="folder-name" data-field="name">${note.name}</div></div>`;
  const activate = () => { if (performance.now() < ignoreClickUntil) return; selectFolder(index, true); };
  card.onclick = activate;
  card.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } };
  deck.appendChild(card);
  return card;
}
cards = notes.map(makeCard);

function nearestRotationFor(index, current = orbitRotation) { const base = -index * stepAngle(); return base + Math.round((current - base) / TAU) * TAU; }
function nearestFrontIndex() { return wrapIndex(Math.round(-orbitRotation / stepAngle())); }
function ease(t, name = cfg.orbitEasing) {
  const x = clamp(t, 0, 1);
  if (name === 'quick') return 1 - Math.pow(1 - x, 5);
  if (name === 'spring') { const c1 = 1.35, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
function startAnimation(target, duration = cfg.selectDuration) { orbitVelocity = 0; orbitSnapPending = false; orbitAnimation = { from: orbitRotation, to: target, start: performance.now(), duration, easing: cfg.orbitEasing }; }

function applyVars() {
  stage.style.setProperty('--stack-perspective', cfg.perspective + 'px');
  stage.style.setProperty('--folder-card-width', cfg.cardWidth);
  stage.style.setProperty('--folder-card-height', cfg.cardHeight);
  stage.style.setProperty('--folder-card-scale-x', (cfg.cardWidth / 116).toFixed(5));
  stage.style.setProperty('--folder-card-scale-y', (cfg.cardHeight / 204).toFixed(5));
  stage.style.setProperty('--progress-x', cfg.progressX);
  stage.style.setProperty('--progress-y', cfg.progressY);
  stage.style.setProperty('--progress-width', cfg.progressWidth);
  stage.style.setProperty('--progress-height', cfg.progressHeight);
  stage.style.setProperty('--progress-rotate', cfg.progressRotate);
  stage.style.setProperty('--progress-opacity', cfg.progressOpacity);
  stage.style.setProperty('--orbit-offset-x', cfg.orbitOffsetX);
  stage.style.setProperty('--orbit-offset-y', cfg.orbitOffsetY);
  stage.style.setProperty('--highlight-duration', cfg.highlightDuration + 'ms');
  stage.style.setProperty('--stack-glow', cfg.glow);
  stage.style.setProperty('--acrylic-alpha', cfg.acrylic);
  stage.style.setProperty('--frost-strength', cfg.frost);
  stage.style.setProperty('--rim-strength', cfg.rim);
  stage.style.setProperty('--breath-duration', cfg.breathSpeed + 's');
  stage.style.setProperty('--active-breath-duration', Math.max(1.8, cfg.breathSpeed * .53).toFixed(2) + 's');
  stage.style.setProperty('--breath-amount', cfg.breathAmount.toFixed(3));
  stage.dataset.breathEnabled = String(!!cfg.breathEnabled);
  stage.dataset.breathStage = String(!!cfg.breathStage);
  stage.dataset.breathAmbient = String(!!cfg.breathAmbient);
  stage.dataset.activeBreath = cfg.activeBreathMode;
  stage.classList.toggle('progress-hidden', !cfg.progressVisible);
  stage.classList.toggle('auto-cruising', cfg.autoCruise);
  document.documentElement.style.setProperty('--card-code-fs', cfg.cardCodeFontSize + 'px');
  document.documentElement.style.setProperty('--card-name-fs', cfg.cardNameFontSize + 'px');
  document.documentElement.style.setProperty('--card-meta-fs', cfg.cardMetaFontSize + 'px');
  document.documentElement.style.setProperty('--progress-title-fs', cfg.progressTitleFontSize + 'px');
  document.documentElement.style.setProperty('--progress-count-fs', cfg.progressCountFontSize + 'px');
  document.documentElement.style.setProperty('--progress-value-fs', cfg.progressValueFontSize + 'px');
  document.documentElement.style.setProperty('--progress-unit-fs', cfg.progressUnitFontSize + 'px');
  document.documentElement.style.setProperty('--progress-label-fs', cfg.progressLabelFontSize + 'px');
}

function layout() {
  applyVars();
  const rx = cfg.parallax && !orbitDragging ? pointerRY * .42 : 0;
  const ry = cfg.parallax && !orbitDragging ? pointerRX * .34 : 0;
  const now = performance.now() / 1000;
  const breathPhase = cfg.breathEnabled ? now * (Math.PI * 2 / Math.max(1, cfg.breathSpeed)) : 0;
  const breathWave = cfg.breathEnabled ? Math.sin(breathPhase) : 0;
  const breathDeckLift = cfg.breathEnabled && cfg.breathDeck ? (-4 * cfg.breathAmount * ((breathWave + 1) / 2)) : 0;
  const breathDeckScale = cfg.breathEnabled && cfg.breathDeck ? (1 + .008 * cfg.breathAmount * ((breathWave + 1) / 2)) : 1;
  deck.style.transform = `translate3d(0,${breathDeckLift.toFixed(2)}px,0) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${(cfg.scale * cfg.orbitScale * breathDeckScale).toFixed(4)})`;
  cards.forEach((card, index) => {
    let angle = orbitRotation + index * stepAngle(), sin = Math.sin(angle), cos = Math.cos(angle), depthNorm = (cos + 1) / 2;
    let x = sin * cfg.orbitRadiusX, z = cos * cfg.orbitRadiusZ, y = Math.sin(angle * 2) * cfg.orbitHeight + (1 - depthNorm) * 8 - 4;
    let isActive = index === activeIndex;
    let scale = (cfg.orbitRearScale + depthNorm * (1 - cfg.orbitRearScale)) * (isActive ? cfg.activeScale : 1);
    let rotateY = -sin * cfg.orbitLean, rotateZ = -sin * 2.2;
    if (cfg.breathEnabled && isActive) {
      const energy = (breathWave + 1) / 2;
      if (cfg.activeBreathMode === 'gentle') { y -= 1.5 * cfg.breathAmount * energy; z += 4 * cfg.breathAmount * energy; scale *= 1 + .018 * cfg.breathAmount * energy; }
      else if (cfg.activeBreathMode === 'jitter') { const t = now; x += ((Math.sin(t * 3.2) + Math.sin(t * 7.4) * .4) * .8) * cfg.breathAmount; y += ((Math.cos(t * 4.1) * .9) + (Math.sin(t * 9.1) * .3)) * cfg.breathAmount; z += ((Math.sin(t * 2.7) + 1) / 2) * 4 * cfg.breathAmount; scale *= 1 + .012 * cfg.breathAmount * ((Math.sin(t * 5.7) + 1) / 2); }
    }
    const materialOpacity = clamp(.25 + depthNorm * .75, .22, 1);
    const blur = isActive && depthNorm > .82 ? 0 : (1 - depthNorm) * cfg.blur;
    const depthBrightness = .61 + depthNorm * .49 + (isActive ? .045 : 0);
    const themeBrightness = 1, themeSaturation = 1;
    const brightness = depthBrightness * themeBrightness;
    const saturate = (.92 + depthNorm * .18) * themeSaturation;
    card.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,${z.toFixed(2)}px) rotateY(${rotateY.toFixed(2)}deg) rotateZ(${rotateZ.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
    card.style.filter = `blur(${blur.toFixed(2)}px) brightness(${brightness.toFixed(3)}) saturate(${saturate.toFixed(3)})`;
    card.style.opacity = materialOpacity.toFixed(3);
    card.style.zIndex = Math.round(depthNorm * 100);
  });
}

function updateDetails(index) {
  const n = notes[index], pct = completionFor(n);
  const cap = el('activeFolderName');
  if (cap) cap.textContent = n.name;
  const fn = el('focusFolderName'), fc = el('focusFolderCount'), fp = el('focusFolderPercent'), fl = el('focusFolderLabel'), fb = el('focusProgressBar');
  if (fn) fn.textContent = cfg.progressTitle;
  if (fc) fc.textContent = cfg.progressCountText;
  if (fp) fp.textContent = cfg.progressPercentText;
  if (fl) fl.textContent = cfg.progressLabelText;
  const numeric = parseFloat(String(cfg.progressPercentText).replace(/[^0-9.\-]/g, ''));
  if (fb) fb.style.width = (Number.isFinite(numeric) ? Math.max(0, numeric) : pct) + '%';
}

function markActive(i) {
  activeIndex = wrapIndex(i);
  cards.forEach((c, j) => c.classList.toggle('active', j === activeIndex));
  updateDetails(activeIndex);
}

function selectFolder(i, animate) {
  markActive(i);
  cfg.autoCruise = false;
  syncAuto();
  const target = nearestRotationFor(activeIndex);
  if (animate) startAnimation(target, cfg.selectDuration);
  else { orbitRotation = target; orbitAnimation = null; layout(); }
}

function syncAuto() {
  const btn = el('autoBtn');
  if (btn) { btn.classList.toggle('active', cfg.autoCruise); btn.textContent = cfg.autoCruise ? 'Ⅱ 暂停巡航' : '▶ 自动巡航'; }
  stage.classList.toggle('auto-cruising', cfg.autoCruise);
  applyVars();
}

function snap() { const idx = nearestFrontIndex(); markActive(idx); orbitVelocity = 0; orbitSnapPending = false; startAnimation(nearestRotationFor(idx), cfg.snapDuration); }

function endDrag(e) {
  if (!orbitDragging) return;
  orbitDragging = false;
  stage.classList.remove('is-dragging');
  try { stage.releasePointerCapture?.(e.pointerId); } catch (_) {}
  pointerId = null;
  if (orbitMoved) { ignoreClickUntil = performance.now() + 180; orbitSnapPending = cfg.autoCenter; }
}

stage.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  orbitDragging = true; orbitMoved = false; dragDistance = 0; pointerId = e.pointerId;
  lastPointerX = e.clientX; lastPointerT = performance.now();
  orbitAnimation = null; orbitVelocity = 0; cfg.autoCruise = false; syncAuto();
  stage.classList.add('is-dragging');
  stage.setPointerCapture?.(e.pointerId);
});

stage.addEventListener('pointermove', e => {
  const r = stage.getBoundingClientRect();
  if (!orbitDragging) {
    if (cfg.parallax) { pointerRX = clamp(((e.clientX - r.left) / r.width - .5) * 8, -4, 4); pointerRY = clamp(-((e.clientY - r.top) / r.height - .5) * 5, -2.5, 2.5); layout(); }
    return;
  }
  if (e.pointerId !== pointerId) return;
  const now = performance.now(), dx = e.clientX - lastPointerX, dt = Math.max(.008, (now - lastPointerT) / 1000), delta = dx * .0062;
  orbitRotation += delta;
  orbitVelocity = orbitVelocity * .52 + (delta / dt) * .48;
  dragDistance += Math.abs(dx); orbitMoved = dragDistance > 5;
  lastPointerX = e.clientX; lastPointerT = now; layout();
});

stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);
stage.addEventListener('pointerleave', e => { if (orbitDragging && e.buttons === 0) endDrag(e); if (!orbitDragging) { pointerRX = 0; pointerRY = 0; layout(); } });
stage.addEventListener('wheel', e => { e.preventDefault(); cfg.scale = Math.max(.01, cfg.scale * Math.exp(-e.deltaY * .0012)); layout(); }, { passive: false });

function animate(ts) {
  const dt = Math.min(.05, Math.max(.001, (ts - lastFrame) / 1000));
  lastFrame = ts;
  if (!orbitDragging) {
    let changed = !!cfg.breathEnabled;
    if (orbitAnimation) {
      const raw = clamp((ts - orbitAnimation.start) / orbitAnimation.duration, 0, 1);
      const v = ease(raw, orbitAnimation.easing);
      orbitRotation = orbitAnimation.from + (orbitAnimation.to - orbitAnimation.from) * v;
      changed = true;
      if (raw >= 1) { orbitRotation = orbitAnimation.to; orbitAnimation = null; orbitVelocity = 0; }
    } else if (cfg.autoCruise) {
      orbitRotation += cfg.cruiseSpeed * dt; changed = true;
      const front = nearestFrontIndex();
      if (front !== activeIndex) markActive(front);
    } else if (Math.abs(orbitVelocity) > .003) {
      orbitRotation += orbitVelocity * dt;
      orbitVelocity *= Math.pow(cfg.orbitInertia, dt * 60);
      changed = true;
    } else if (orbitSnapPending && cfg.autoCenter) {
      snap(); changed = true;
    }
    if (changed) layout();
  }
  requestAnimationFrame(animate);
}

function saveCfg() { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); }

// Dashboard control bindings
const autoBtn = el('autoBtn');
if (autoBtn) autoBtn.onclick = () => { cfg.autoCruise = !cfg.autoCruise; orbitAnimation = null; orbitVelocity = 0; syncAuto(); saveCfg(); };
const resetBtn = el('resetViewBtn');
if (resetBtn) resetBtn.onclick = () => { cfg.autoCruise = false; orbitVelocity = 0; orbitAnimation = null; markActive(4); orbitRotation = -activeIndex * stepAngle(); syncAuto(); layout(); saveCfg(); };

markActive(activeIndex);
applyVars();
layout();
requestAnimationFrame(animate);
window.addEventListener('resize', () => layout(), { passive: true });

window.Orbit3D = {
  getConfig: () => ({ ...cfg }),
  setConfig: (patch) => { cfg = { ...cfg, ...patch }; applyVars(); layout(); saveCfg(); },
  selectFolder: (i) => selectFolder(i, true),
  toggleCruise: () => { cfg.autoCruise = !cfg.autoCruise; orbitAnimation = null; orbitVelocity = 0; syncAuto(); saveCfg(); }
};
})();
