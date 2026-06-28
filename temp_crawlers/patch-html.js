const fs = require('fs');
const html = fs.readFileSync('D:/MyStudySpace/pomodoro.html', 'utf8');

// Replace the scene panel HTML structure
const oldHTML = `<div class="scene-panel-content liquid-glass">
    <div class="scene-select-area">
      <div class="scene-select-title">🖼️ 选择你的学习场景</div>
      <div class="scene-grid" id="scene-grid"></div>
    </div>
    <div class="controls-area">
      <div class="control-section">
        <div class="control-step">STEP 02</div>
        <h3>设置声音氛围</h3>
        <div class="audio-icons">
          <div class="audio-icon active" data-sound="piano" onclick="selectSound(this)">🎹</div>
          <div class="audio-icon" data-sound="rain" onclick="selectSound(this)">🌧️</div>
          <div class="audio-icon" data-sound="fire" onclick="selectSound(this)">🔥</div>
          <div class="audio-icon" data-sound="nature" onclick="selectSound(this)">🍃</div>
          <div class="audio-icon" data-sound="cafe" onclick="selectSound(this)">☕</div>
          <div class="audio-icon" data-sound="ocean" onclick="selectSound(this)">🌊</div>
        </div>
        <div class="control-row">
          <label>音乐</label>
          <input type="range" id="bgm-slider" min="0" max="100" value="50" oninput="setVolume(this.value)">
          <span id="bgm-pct">50%</span>
        </div>
        <div class="control-row">
          <label>背景音</label>
          <input type="range" id="ambient-slider" min="0" max="100" value="30" oninput="setAmbient(this.value)">
          <span id="ambient-pct">30%</span>
        </div>
      </div>
      <div class="control-section">
        <div class="control-step">STEP 03</div>
        <h3>设置专注时间</h3>
        <div class="toggle-tabs">
          <button class="active" onclick="switchTimerMode('countdown',this)">倒计时</button>
          <button onclick="switchTimerMode('stopwatch',this)">正计时</button>
        </div>
        <div class="pill-row">
          <button class="pill-btn active" onclick="setQuickTime(25,this)">25 分钟</button>
          <button class="pill-btn" onclick="setQuickTime(45,this)">45 分钟</button>
          <button class="pill-btn" onclick="setQuickTime(50,this)">50 分钟</button>
          <button class="pill-btn" onclick="setQuickTime(90,this)">90 分钟</button>
        </div>
      </div>
      <button class="enter-btn" onclick="enterStudyRoom()">进入自习室 →</button>
    </div>
  </div>`;

const newHTML = `<!-- 左侧：场景选择 -->
  <div class="scene-left glass-panel">
    <div class="scene-step">STEP 01</div>
    <div class="scene-select-title">选择你的学习场景</div>
    <div class="scene-grid" id="scene-grid"></div>
  </div>
  <!-- 右侧：声音+时间设置 -->
  <div class="scene-right glass-panel">
    <div>
      <div class="scene-step">STEP 02</div>
      <div class="control-section">
        <h3>设置声音氛围</h3>
        <div class="audio-icons">
          <div class="audio-icon active" data-sound="piano" onclick="selectSound(this)"><svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>
          <div class="audio-icon" data-sound="rain" onclick="selectSound(this)"><svg viewBox="0 0 24 24"><path d="M16 13V21M8 13V21M12 15V23M20 8V16M4 8V16"/></svg></div>
          <div class="audio-icon" data-sound="wind" onclick="selectSound(this)"><svg viewBox="0 0 24 24"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg></div>
          <div class="audio-icon" data-sound="fire" onclick="selectSound(this)"><svg viewBox="0 0 24 24"><path d="M12 12c2-2.96 0-7-1-8 0 3.038-1.773 4.741-3 6-1.226 1.26-2 3.24-2 5a6 6 0 1 0 12 0c0-1.532-1.056-3.94-2-5-1.786 3-2 2-2 2z"/></svg></div>
          <div class="audio-icon" data-sound="coffee" onclick="selectSound(this)"><svg viewBox="0 0 24 24"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg></div>
          <div class="audio-icon" data-sound="ocean" onclick="selectSound(this)"><svg viewBox="0 0 24 24"><path d="M2 12c1.5-2 3.5-3 5-3s3.5 1 5 3 3.5 3 5 3 3.5-1 5-3"/><path d="M2 17c1.5-2 3.5-3 5-3s3.5 1 5 3 3.5 3 5 3 3.5-1 5-3"/></svg></div>
        </div>
        <div class="control-row">
          <label>音乐</label>
          <input type="range" id="bgm-slider" min="0" max="100" value="50" oninput="setVolume(this.value)">
          <span id="bgm-pct">50%</span>
        </div>
        <div class="control-row">
          <label>背景音</label>
          <input type="range" id="ambient-slider" min="0" max="100" value="30" oninput="setAmbient(this.value)">
          <span id="ambient-pct">30%</span>
        </div>
      </div>
    </div>
    <div>
      <div class="scene-step">STEP 03</div>
      <div class="control-section">
        <h3>设置专注时间</h3>
        <div class="toggle-tabs">
          <button class="active" onclick="switchTimerMode('countdown',this)">倒计时</button>
          <button onclick="switchTimerMode('stopwatch',this)">正计时</button>
        </div>
        <div class="pill-row">
          <button class="pill-btn active" onclick="setQuickTime(25,this)">25 分钟</button>
          <button class="pill-btn" onclick="setQuickTime(45,this)">45 分钟</button>
          <button class="pill-btn" onclick="setQuickTime(50,this)">50 分钟</button>
          <button class="pill-btn" onclick="setQuickTime(90,this)">90 分钟</button>
        </div>
      </div>
    </div>
    <button class="enter-btn" onclick="enterStudyRoom()">进入自习室 →</button>
  </div>`;

if (html.includes(oldHTML)) {
  const result = html.replace(oldHTML, newHTML);
  fs.writeFileSync('D:/MyStudySpace/pomodoro.html', result);
  console.log('HTML replaced successfully!');
} else {
  console.log('Old HTML not found, trying partial match...');
  // Try to find just the opening tag
  if (html.includes('scene-panel-content liquid-glass')) {
    console.log('Found scene-panel-content, doing manual replacement');
  }
}
