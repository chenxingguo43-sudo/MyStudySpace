/* YCS Knowledge OS Dashboard — wiring layer */
(function() {
  'use strict';

  // Palette presets (prism-glass US-00 teal-green default)
  const PRESETS = [
    { id: 'US-00', name: 'teal-green', labelZh: '青绿深色系', colors: ['#02100D', '#0B3A30', '#10DF9A', '#66CDB1', '#C8F5E8'], effect: { type: 'none' } }
  ];

  // Initialize prism-glass palette engine (US-00 teal-green)
  const paletteEngine = window.DarkGlassPaletteEngine.create(PRESETS, document.documentElement);
  paletteEngine.setPalette('US-00');
  paletteEngine.setOptions({ intensity: 0.55, ambientStrength: 0.42, surfaceTint: 0.28, accentUsage: 0.34, effects: true });

  // Sync prism palette to fluid-glass and orbit accent colors
  function syncAccentToComponents() {
    const root = document.documentElement;
    const accent = getComputedStyle(root).getPropertyValue('--accent-primary').trim() || '#10DF9A';
    const highlight = getComputedStyle(root).getPropertyValue('--highlight').trim() || '#C8F5E8';
    const c2 = getComputedStyle(root).getPropertyValue('--palette-c2').trim() || '#0B3A30';
    root.style.setProperty('--fluid-a', accent);
    root.style.setProperty('--orbit-accent', accent);
    root.style.setProperty('--orbit-accent-hi', highlight);
    root.style.setProperty('--orbit-accent-shadow', c2);
    root.style.setProperty('--orbit-idle-edge', highlight);
  }
  syncAccentToComponents();
  document.addEventListener('darkglass:palettechange', syncAccentToComponents);

  // Fluid glass card config (injected before fluid-glass-engine.js loads)
  window.FLUID_GLASS_CONFIG = {
    storageKey: 'knowledge_os_fluid_glass_config',
    quality: 'auto',
    interaction: true,
    cards: [
      { key: 'today', label: '今日新增', eyebrow: 'TODAY', value: '12', unit: '篇', change: 20, preset: 'cyan', a: '#10DF9A', b: '#3cc8ff', c: '#075f68', speed: 0.92, intensity: 1.02, pointer: 0.82, surface: 0.08, seed: 1.7, chart: { enabled: false } },
      { key: 'inbox', label: '未读库存', eyebrow: 'INBOX', value: '28', unit: '篇', change: 8, preset: 'cyan', a: '#10DF9A', b: '#3cc8ff', c: '#075f68', speed: 0.84, intensity: 1.08, pointer: 0.80, surface: 0.08, seed: 4.9, chart: { enabled: false } },
      { key: 'archive', label: '已经阅读', eyebrow: 'ARCHIVE', value: '56', unit: '篇', change: 15, preset: 'cyan', a: '#10DF9A', b: '#3cc8ff', c: '#075f68', speed: 0.76, intensity: 0.98, pointer: 0.72, surface: 0.08, seed: 8.4, chart: { enabled: false } },
      { key: 'backlog', label: '长期未读', eyebrow: 'BACKLOG', value: '3', unit: '篇', change: -40, preset: 'cyan', a: '#10DF9A', b: '#3cc8ff', c: '#075f68', speed: 0.88, intensity: 1.05, pointer: 0.86, surface: 0.08, seed: 12.1, chart: { enabled: false } }
    ]
  };

  // Orbit config placeholder (orbit-engine.js has its own defaults; this allows future override)
  window.ORBIT_CONFIG = {};

  // Queue tabs
  document.querySelectorAll('.queue-tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.queue-tabs button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Orbit control buttons
  const modeBtn = document.getElementById('modeBtn');
  if (modeBtn) modeBtn.addEventListener('click', () => { window.Orbit3D && window.Orbit3D.toggleCruise(); });

  // Timeline dates
  document.querySelectorAll('.timeline-dates span').forEach(d => {
    d.addEventListener('click', () => {
      document.querySelectorAll('.timeline-dates span').forEach(s => s.classList.remove('active'));
      d.classList.add('active');
    });
  });

  // Make AI suggestion items editable
  document.querySelectorAll('.ai-list li').forEach(li => {
    li.setAttribute('contenteditable', 'true');
    li.setAttribute('spellcheck', 'false');
  });

  // Expose dashboard API
  window.KnowledgeOSDashboard = {
    palette: paletteEngine,
    syncAccent: syncAccentToComponents
  };
})();
