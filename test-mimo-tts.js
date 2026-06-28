/**
 * MiMo TTS 俄语发音测试 - 正确的调用方式
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = 'tp-c3c4habyi41dvmqkhdvto80exfukn9nwbiqskwerrm11a2y4';
const BASE = 'token-plan-cn.xiaomimimo.com';

function ttsRequest(model, messages) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ model, messages, max_tokens: 4096 });
    const options = {
      hostname: BASE,
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf-8');
        try {
          const json = JSON.parse(text);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, raw: text });
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function base64ToBuffer(base64) {
  return Buffer.from(base64, 'base64');
}

async function testRussianTTS() {
  console.log('🎤 MiMo TTS 俄语发音测试');
  console.log('='.repeat(60));
  console.log(`Base: ${BASE}`);
  console.log('');

  // 测试用例
  const testCases = [
    { text: 'Привет', desc: '你好' },
    { text: 'Спасибо', desc: '谢谢' },
    { text: 'Здравствуйте', desc: '您好(正式)' },
    { text: 'Я изучаю русский язык', desc: '我在学俄语' },
    { text: 'После обеда я читал роман и смотрел телевизор', desc: 'B2口语长句' },
  ];

  // 测试 1: mimo-v2.5-tts + assistant role
  console.log('📌 测试 mimo-v2.5-tts (需要 assistant role)');
  console.log('-'.repeat(60));

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const messages = [
      { role: 'user', content: tc.text },
      { role: 'assistant', content: '' },
    ];

    const result = await ttsRequest('mimo-v2.5-tts', messages);

    if (result.data?.choices?.[0]?.message?.audio?.data) {
      const audioBase64 = result.data.choices[0].message.audio.data;
      const audioBuffer = base64ToBuffer(audioBase64);
      const outPath = path.join(__dirname, `tts_test_${i}.wav`);
      fs.writeFileSync(outPath, audioBuffer);
      console.log(`✅ [${tc.desc}] "${tc.text}" → ${audioBuffer.length} bytes → ${outPath}`);
    } else if (result.data?.error) {
      console.log(`❌ [${tc.desc}] Error: ${JSON.stringify(result.data.error).substring(0, 200)}`);
    } else {
      console.log(`⚠️ [${tc.desc}] Response: ${JSON.stringify(result.data).substring(0, 200)}`);
    }
  }

  // 测试 2: mimo-v2.5-tts-voicedesign
  console.log('');
  console.log('📌 测试 mimo-v2.5-tts-voicedesign');
  console.log('-'.repeat(60));

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const messages = [
      { role: 'user', content: `请朗读以下文本: ${tc.text}` },
    ];

    const result = await ttsRequest('mimo-v2.5-tts-voicedesign', messages);

    if (result.data?.choices?.[0]?.message?.audio?.data) {
      const audioBase64 = result.data.choices[0].message.audio.data;
      const audioBuffer = base64ToBuffer(audioBase64);
      const outPath = path.join(__dirname, `tts_voicedesign_${i}.wav`);
      fs.writeFileSync(outPath, audioBuffer);
      console.log(`✅ [${tc.desc}] "${tc.text}" → ${audioBuffer.length} bytes → ${outPath}`);
    } else if (result.data?.error) {
      console.log(`❌ [${tc.desc}] Error: ${JSON.stringify(result.data.error).substring(0, 200)}`);
    } else {
      console.log(`⚠️ [${tc.desc}] Response: ${JSON.stringify(result.data).substring(0, 200)}`);
    }
  }

  // 测试 3: mimo-v2.5-tts 不同的 message 格式
  console.log('');
  console.log('📌 测试 mimo-v2.5-tts 不同 message 格式');
  console.log('-'.repeat(60));

  const formats = [
    { name: 'assistant空content', messages: [{ role: 'user', content: 'Привет' }, { role: 'assistant', content: '' }] },
    { name: 'assistant有content', messages: [{ role: 'user', content: 'Say in Russian: Привет' }, { role: 'assistant', content: 'Привет' }] },
    { name: 'system+user+assistant', messages: [{ role: 'system', content: 'You are a Russian language teacher.' }, { role: 'user', content: 'Say: Привет' }, { role: 'assistant', content: '' }] },
    { name: '只有assistant', messages: [{ role: 'assistant', content: 'Привет' }] },
  ];

  for (const fmt of formats) {
    const result = await ttsRequest('mimo-v2.5-tts', fmt.messages);
    if (result.data?.choices?.[0]?.message?.audio?.data) {
      const audioBase64 = result.data.choices[0].message.audio.data;
      const audioBuffer = base64ToBuffer(audioBase64);
      const outPath = path.join(__dirname, `tts_format_${formats.indexOf(fmt)}.wav`);
      fs.writeFileSync(outPath, audioBuffer);
      console.log(`✅ [${fmt.name}] → ${audioBuffer.length} bytes → ${outPath}`);
    } else if (result.data?.error) {
      console.log(`❌ [${fmt.name}] Error: ${JSON.stringify(result.data.error).substring(0, 200)}`);
    } else {
      console.log(`⚠️ [${fmt.name}] Response: ${JSON.stringify(result.data).substring(0, 300)}`);
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('测试完成! 请检查生成的 .wav 文件播放效果');
}

testRussianTTS().catch(console.error);
