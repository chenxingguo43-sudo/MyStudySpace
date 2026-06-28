const fs = require('fs');
const html = fs.readFileSync('D:/MyStudySpace/pomodoro.html', 'utf8');

// Find the CSS section to replace (line 140 to line 237)
const lines = html.split('\n');
let start = -1, end = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('全屏场景面板（基于 innook 蓝图精确值）')) start = i;
  if (start >= 0 && lines[i].includes('.enter-btn:active{transform:scale(0.98)}')) { end = i; break; }
}

console.log('Replace CSS lines:', start, '-', end);

const newCSS = `/* ═══ 全屏场景面板（双独立面板 + Apple 级毛玻璃） ═══ */
.scene-panel{position:fixed;inset:0;z-index:200;display:none;padding:2rem;overflow-y:auto}
.scene-panel.show{display:flex;align-items:center;justify-content:center;gap:0}
.scene-panel-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.15)}

/* ── Apple 级毛玻璃面板（两块独立浮动） ── */
.glass-panel{
  background:rgba(20,20,20,0.15);
  -webkit-backdrop-filter:blur(40px) saturate(120%);backdrop-filter:blur(40px) saturate(120%);
  border:1px solid rgba(255,255,255,0.12);
  border-radius:24px;
  padding:2.5rem;
  color:#fff;
  position:relative;z-index:1;
  animation:panelEnter 0.4s cubic-bezier(0.22,1,0.36,1) both;
}
@keyframes panelEnter{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

.scene-left{flex:1.4;max-width:55%;display:flex;flex-direction:column;gap:0.5rem}
.scene-right{flex:1;max-width:45%;display:flex;flex-direction:column;gap:1rem;animation-delay:0.08s}

@media(max-width:767px){
  .scene-panel.show{flex-direction:column;gap:1rem;padding:1rem}
  .scene-left,.scene-right{max-width:100%;flex:none;width:100%}
  .glass-panel{padding:1.5rem;border-radius:20px}
}

.scene-step{font-size:0.65rem;text-transform:uppercase;letter-spacing:0.25em;color:rgba(255,255,255,0.35);margin-bottom:0.2rem}
.scene-select-title{font-size:1.15rem;font-weight:600;margin-bottom:0.6rem}
.scene-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;overflow-y:auto}

.scene-card{position:relative;border-radius:16px;overflow:hidden;cursor:pointer;border:1px solid rgba(255,255,255,0.08);transition:all 0.25s cubic-bezier(0.22,1,0.36,1);background:rgba(255,255,255,0.03)}
.scene-card:hover{transform:scale(1.02);border-color:rgba(255,255,255,0.2)}
.scene-card:active{transform:scale(0.98)}
.scene-card.active{border-color:rgba(255,255,255,0.3);box-shadow:0 0 20px rgba(255,255,255,0.08)}
.scene-card-media{width:100%}
.scene-card-media img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}
.scene-card-copy{padding:0.7rem 0.9rem 0.8rem}
.scene-card-name{font-size:0.9rem;font-weight:600;color:#fff;line-height:1.2}
.scene-card-desc{font-size:0.7rem;color:rgba(255,255,255,0.45);margin-top:0.2rem;line-height:1.4}
.scene-card .check-mark{display:none;position:absolute;top:0.5rem;right:0.5rem;width:1.15rem;height:1.15rem;border-radius:50%;background:rgba(255,255,255,0.9);color:#050504;align-items:center;justify-content:center;font-size:0.6rem;font-weight:700}
.scene-card.active .check-mark{display:grid}

.control-section{padding:1rem 1.2rem;border-radius:16px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02)}
.control-section h3{font-size:0.88rem;font-weight:500;margin-bottom:0.5rem;color:rgba(255,255,255,0.85)}

.audio-icons{display:flex;justify-content:space-between;gap:0.4rem;margin-bottom:0.8rem}
.audio-icon{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;cursor:pointer;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);transition:all 0.2s}
.audio-icon svg{width:18px;height:18px;stroke:rgba(255,255,255,0.55);fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.audio-icon:hover{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.18)}
.audio-icon:hover svg{stroke:rgba(255,255,255,0.85)}
.audio-icon.active{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.3)}
.audio-icon.active svg{stroke:#fff}

.control-row{display:flex;align-items:center;gap:0.6rem;margin-bottom:0.5rem}
.control-row label{font-size:0.75rem;color:rgba(255,255,255,0.5);min-width:3rem}
.control-row input[type=range]{flex:1;height:2px;-webkit-appearance:none;background:rgba(255,255,255,0.15);border-radius:999px;outline:none;cursor:pointer}
.control-row input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;background:#fff;border-radius:50%;width:14px;height:14px;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,0.3)}
.control-row span{font-size:0.68rem;color:rgba(255,255,255,0.35);min-width:1.8rem;text-align:right}

.toggle-tabs{display:flex;border-radius:40px;border:1px solid rgba(255,255,255,0.12);padding:2px;margin-bottom:0.7rem}
.toggle-tabs button{flex:1;padding:0.35rem 0.7rem;border-radius:40px;border:none;cursor:pointer;font-size:0.72rem;background:transparent;color:rgba(255,255,255,0.4);font-family:inherit;transition:all 0.25s}
.toggle-tabs button.active{background:rgba(255,255,255,0.08);color:#fff;font-weight:500}

.pill-row{display:flex;gap:0.35rem;flex-wrap:wrap}
.pill-btn{border-radius:20px;border:1px solid rgba(255,255,255,0.15);padding:0.35rem 0.75rem;font-size:0.72rem;background:transparent;color:rgba(255,255,255,0.55);cursor:pointer;font-family:inherit;font-variant-numeric:tabular-nums;transition:all 0.2s}
.pill-btn:hover{border-color:rgba(255,255,255,0.35);color:rgba(255,255,255,0.85)}
.pill-btn.active{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.25);color:#fff}

.enter-btn{width:100%;height:52px;border-radius:26px;cursor:pointer;background:transparent;border:1px solid rgba(255,255,255,0.18);color:rgba(255,255,255,0.85);font-size:0.9rem;font-family:inherit;font-weight:500;transition:all 0.25s;letter-spacing:0.02em}
.enter-btn:hover{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.3);color:#fff}
.enter-btn:active{transform:scale(0.98)}`;

lines.splice(start, end - start + 1, newCSS);
fs.writeFileSync('D:/MyStudySpace/pomodoro.html', lines.join('\n'));
console.log('CSS replaced. New total lines:', lines.length);
