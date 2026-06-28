/**
 * MiMo VoiceClone 俄语完整测试
 * 用 Edge TTS 高质量俄语音频做克隆样本
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = 'tp-c3c4habyi41dvmqkhdvto80exfukn9nwbiqskwerrm11a2y4';
const BASE = 'token-plan-cn.xiaomimimo.com';

function request(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const options = {
      hostname: BASE,
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf-8');
        try {
          resolve({ status: res.statusCode, data: JSON.parse(text) });
        } catch {
          resolve({ status: res.statusCode, raw: text });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function cloneAndSave(samplePath, text, outName) {
  const sampleBuffer = fs.readFileSync(samplePath);
  const sampleBase64 = sampleBuffer.toString('base64');

  const result = await request({
    model: 'mimo-v2.5-tts-voiceclone',
    messages: [
      { role: 'user', content: text },
      { role: 'assistant', content: '' }
    ],
    audio: { voice: `data:audio/mp3;base64,${sampleBase64}` },
    max_tokens: 4096,
  });

  if (result.data?.choices?.[0]?.message?.audio?.data) {
    const audioBase64 = result.data.choices[0].message.audio.data;
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const outPath = path.join(__dirname, outName);
    fs.writeFileSync(outPath, audioBuffer);
    console.log(`✅ "${text}" → ${audioBuffer.length} bytes → ${outPath}`);
    return true;
  } else if (result.data?.error) {
    console.log(`❌ "${text}" → ${JSON.stringify(result.data.error).substring(0, 150)}`);
    return false;
  } else {
    console.log(`⚠️ "${text}" → ${JSON.stringify(result.data).substring(0, 200)}`);
    return false;
  }
}

async function main() {
  console.log('🎤 MiMo VoiceClone 俄语完整测试');
  console.log('='.repeat(60));

  // 用两个不同的 Edge TTS 样本
  const samples = [
    { path: 'edge_privet_m.mp3', label: '男声样本(Dmitry)' },
    { path: 'edge_privet_f.mp3', label: '女声样本(Svetlana)' },
  ];

  const testTexts = [
    { text: 'Привет', desc: '你好' },
    { text: 'Спасибо', desc: '谢谢' },
    { text: 'Здравствуйте', desc: '您好' },
    { text: 'До свидания', desc: '再见' },
    { text: 'Я изучаю русский язык', desc: '我在学俄语' },
    { text: 'После обеда я читал роман и смотрел телевизор', desc: 'B2长句' },
  ];

  for (const sample of samples) {
    const samplePath = path.join(__dirname, sample.path);
    if (!fs.existsSync(samplePath)) {
      console.log(`\n⚠️ 跳过 ${sample.label}: 文件不存在`);
      continue;
    }

    console.log(`\n📌 克隆样本: ${sample.label} (${sample.path})`);
    console.log('-'.repeat(60));

    for (let i = 0; i < testTexts.length; i++) {
      const tc = testTexts[i];
      const prefix = sample.path.includes('_m.') ? 'clone_m' : 'clone_f';
      const outName = `${prefix}_${i}.wav`;
      await cloneAndSave(samplePath, tc.text, outName);
    }
  }

  // 对比测试：同样文本，Edge TTS vs MiMo Clone
  console.log('\n📌 对比：同样文本的 Edge TTS 原版');
  console.log('-'.repeat(60));
  console.log('edge_privet_m.mp3 → 男声 Edge 原版 "Привет"');
  console.log('edge_spasibo_m.mp3 → 男声 Edge 原版 "Спасибо"');
  console.log('edge_zdravstvuyte_m.mp3 → 男声 Edge 原版 "Здравствуйте"');
  console.log('edge_dmitry_long.mp3 → 男声 Edge 原版 长句');

  console.log('\n' + '='.repeat(60));
  console.log('测试完成!');
  console.log('请对比 clone_m_*.wav vs edge_*_m.mp3 的发音质量');
}

main().catch(console.error);
