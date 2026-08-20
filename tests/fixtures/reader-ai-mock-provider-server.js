'use strict';

const http = require('node:http');

const port = Number(process.env.MOCK_READER_AI_PORT || 0);

const grammar = {
  answerReason: '动词 интересоваться 要求工具格，因此 музыкой 正确。',
  optionReasons: [
    { key: 'A', reason: 'музыкой 是工具格单数，符合动词支配。' },
    { key: 'B', reason: 'музыке 是与格或前置格形式，不符合这里的支配关系。' }
  ],
  knowledgePoints: ['интересоваться + 工具格', '名词单数工具格词尾'],
  pitfall: '不要只按中文“对……”机械选择与格。',
  transferQuestion: { prompt: '请选择：Она увлекается ...', options: ['A. спортом', 'B. спорту'] }
};

const dictionary = {
  contextMeaning: '在当前句子中表示“音乐”，是兴趣所指向的对象。',
  morphology: 'музыкой 是名词 музыка 的单数工具格。',
  collocations: ['интересоваться музыкой', 'заниматься музыкой'],
  examples: [{ ru: 'Она давно занимается музыкой.', zh: '她长期从事音乐活动。' }],
  confusions: ['музыкальный 是形容词“音乐的”，不能代替名词 музыка。']
};

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let request = {};
    try { request = JSON.parse(body); } catch (_error) {}
    const user = request.messages && request.messages.find(message => message.role === 'user');
    const answer = user && /analysisKind/.test(user.content || '') ? dictionary : grammar;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(answer) } }] }));
  });
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write('MOCK_READER_AI_READY=' + server.address().port + '\n');
});
