const http = require('http');
const fs = require('fs');
const path = require('path');
const { createRussianDictionaryLookup } = require('./server/russian-dictionary');

const PORT = Number(process.env.PORT) || 3000;
const lookupRussianDictionary = createRussianDictionaryLookup({});

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.webp': 'image/webp'
};

function stripHtmlText(value) {
    return String(value || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

const server = http.createServer((req, res) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let urlPath = req.url === '/' ? '/reader.html' : req.url;
    // 去除查询参数
    urlPath = urlPath.split('?')[0];
    // 解码 URL 编码（中文文件名等）
    try { urlPath = decodeURIComponent(urlPath); } catch(e) {}
    // 安全过滤：用 path.resolve 规范化后检查是否逃逸出项目目录
    const resolvedPath = path.resolve(__dirname, '.' + urlPath);
    if (!resolvedPath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    urlPath = resolvedPath.substring(__dirname.length).replace(/\\/g, '/');
    if (!urlPath.startsWith('/')) urlPath = '/' + urlPath;

    // ─── API: GET /api/dictionary/lookup ─────────────────────────
    if (req.method === 'GET' && urlPath === '/api/dictionary/lookup') {
        const term = requestUrl.searchParams.get('term') || '';
        const context = (requestUrl.searchParams.get('context') || '').slice(0, 500);
        const includeContext = requestUrl.searchParams.get('includeContext') === '1';
        lookupRussianDictionary(term)
            .then(result => {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ...result, contextIncluded: includeContext && Boolean(context) }));
            })
            .catch(error => {
                const invalid = error instanceof TypeError;
                const timeout = error && error.name === 'AbortError';
                res.writeHead(invalid ? 400 : timeout ? 504 : 502, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: invalid ? 'Invalid Russian dictionary term' : timeout ? 'Dictionary lookup timed out' : 'Dictionary lookup failed' }));
            });
        return;
    }

    // ─── API: POST /api/vocab-sync ───────────────────────────────
    if (req.method === 'POST' && urlPath === '/api/vocab-sync') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const logPath = path.join(__dirname, '俄语笔记库', 'wiki', 'study-log.json');
                let log = { study_log: {} };
                if (fs.existsSync(logPath)) {
                    log = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
                }
                if (!log.study_log) log.study_log = {};
                const today = data.date;
                const existing = log.study_log[today] || {};
                log.study_log[today] = {
                    ...existing,
                    vocab_reviewed: data.reviewed || 0,
                    vocab_mastered: data.mastered || 0,
                    vocab_due: data.due || 0,
                    vocab_streak: data.streak || 0,
                };
                fs.writeFileSync(logPath, JSON.stringify(log, null, 2), 'utf-8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Sync failed' }));
            }
        });
        return;
    }

    // ─── API: GET /api/novel/index ───────────────────────────────
    if (req.method === 'GET' && urlPath === '/api/novel/index') {
        try {
            // 合并小说和教材的index
            const novelIndex = path.join(__dirname, 'data', 'novel', 'index.json');
            const textbookIndex = path.join(__dirname, 'data', 'textbook', 'index.json');
            let books = [];
            if (fs.existsSync(novelIndex)) {
                const d = JSON.parse(fs.readFileSync(novelIndex, 'utf-8'));
                books = books.concat(d.books || []);
            }
            if (fs.existsSync(textbookIndex)) {
                const d = JSON.parse(fs.readFileSync(textbookIndex, 'utf-8'));
                books = books.concat(d.books || []);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ books }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to load index' }));
        }
        return;
    }

    // ─── API: GET /api/novel/:bookId/:chapterIdx ─────────────────
    const novelMatch = urlPath.match(/^\/api\/novel\/([^/]+)\/(\d+)$/);
    if (req.method === 'GET' && novelMatch) {
        try {
            const bookId = novelMatch[1].replace(/[^a-zA-Z0-9_-]/g, '');
            if (!bookId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid bookId' }));
                return;
            }
            const chIdx = parseInt(novelMatch[2], 10);
            const chName = 'ch' + String(chIdx).padStart(4, '0') + '.json';
            // 先查novel目录，再查textbook目录
            let chFile = path.join(__dirname, 'data', 'novel', bookId, chName);
            if (!fs.existsSync(chFile)) {
                chFile = path.join(__dirname, 'data', 'textbook', bookId, chName);
            }
            if (!fs.existsSync(chFile)) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Chapter not found' }));
                return;
            }
            const data = fs.readFileSync(chFile, 'utf-8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(data);
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal error' }));
        }
        return;
    }

    // ─── API: POST /api/novel-vocab ──────────────────────────────
    if (req.method === 'POST' && urlPath === '/api/novel-vocab') {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 10240) { // 10KB 限制
                res.writeHead(413, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Request too large' }));
                req.destroy();
            }
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                // 清理输入：去除换行符防止 YAML 注入
                const sanitize = (s) => stripHtmlText(s).replace(/[\r\n]/g, ' ').trim();
                const word = sanitize(data.word);
                if (!word) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'word is required' }));
                    return;
                }
                // 生成唯一文件名：取单词前20字符 + 8位hash
                const crypto = require('crypto');
                const hash = crypto.randomBytes(4).toString('hex');
                const safeName = word.replace(/[^a-zA-Zа-яА-ЯёЁ0-9]/g, '_').substring(0, 20);
                const fileName = safeName + '-' + hash + '.md';
                const vocabDir = path.join(__dirname, '俄语笔记库', '小说词汇');
                if (!fs.existsSync(vocabDir)) {
                    fs.mkdirSync(vocabDir, { recursive: true });
                }
                const filePath = path.join(vocabDir, fileName);
                // 快速去重：按文件名前缀匹配
                const wordPrefix = word.replace(/[^a-zA-Zа-яА-ЯёЁ0-9]/g, '_').substring(0, 20);
                const existing = fs.readdirSync(vocabDir).filter(f => f.startsWith(wordPrefix + '-') && f.endsWith('.md'));
                for (const f of existing) {
                    const content = fs.readFileSync(path.join(vocabDir, f), 'utf-8');
                    const wm = content.match(/^---\s*\n[\s\S]*?^word:\s*(.+)$/m);
                    if (wm && wm[1].trim() === word) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ ok: true, duplicate: true, message: 'Word already saved' }));
                        return;
                    }
                }
                // 生成 markdown
                const meaning = sanitize(data.meaning);
                const type = sanitize(data.type);
                const source = sanitize(data.source);
                const savedAt = new Date().toISOString().split('T')[0];
                const context = sanitize(data.context);
                const sourceSentenceRu = sanitize(data.sourceSentenceRu || data.context);
                const sourceSentenceZh = sanitize(data.sourceSentenceZh);
                let md = '---\n';
                md += 'word: ' + word + '\n';
                if (type) md += 'type: ' + type + '\n';
                if (meaning) md += 'meaning: ' + meaning + '\n';
                md += 'source: ' + source + '\n';
                if (sourceSentenceRu) md += 'source_sentence_ru: ' + sourceSentenceRu + '\n';
                if (sourceSentenceZh) md += 'source_sentence_zh: ' + sourceSentenceZh + '\n';
                md += 'saved_at: ' + savedAt + '\n';
                md += 'mastery: 0\n';
                md += 'tags: [小说词汇]\n';
                md += '---\n\n';
                if (context) {
                    md += '> ' + context + '\n';
                }
                fs.writeFileSync(filePath, md, 'utf-8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, file: fileName }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Save failed' }));
            }
        });
        return;
    }

    // ─── API: GET /api/novel-vocab-list ─────────────────────────
    if (req.method === 'GET' && urlPath === '/api/novel-vocab-list') {
        try {
            const vocabDir = path.join(__dirname, '俄语笔记库', '小说词汇');
            const result = [];
            if (fs.existsSync(vocabDir)) {
                const files = fs.readdirSync(vocabDir).filter(f => f.endsWith('.md'));
                for (const f of files) {
                    const content = fs.readFileSync(path.join(vocabDir, f), 'utf-8');
                    const wm = content.match(/^---\s*\n([\s\S]*?)\n---/);
                    if (!wm) continue;
                    const fm = {};
                    for (const line of wm[1].split('\n')) {
                        const m2 = line.match(/^(\w[\w-]*):\s*(.*)/);
                        if (m2) fm[m2[1]] = m2[2].trim();
                    }
                    if (fm.word) result.push({
                        word: stripHtmlText(fm.word),
                        type: stripHtmlText(fm.type || ''),
                        meaning: stripHtmlText(fm.meaning || ''),
                        source: stripHtmlText(fm.source || ''),
                        sourceSentenceRu: stripHtmlText(fm.source_sentence_ru || ''),
                        sourceSentenceZh: stripHtmlText(fm.source_sentence_zh || '')
                    });
                }
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify([]));
        }
        return;
    }

    let filePath = '.' + urlPath;

    // 如果当前目录找不到，尝试上级目录（用于 ../videos, ../kele-transparent.png 等）
    if (!fs.existsSync(filePath)) {
        const parentPath = '..' + urlPath;
        if (fs.existsSync(parentPath)) {
            filePath = parentPath;
        }
    }

    const extname = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.stat(filePath, (error, stats) => {
        if (error || !stats.isFile()) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }
        const range = req.headers.range;
        if (range && /^(video|audio)\//.test(contentType)) {
            const match = /bytes=(\d*)-(\d*)/.exec(range);
            const start = match && match[1] ? Number(match[1]) : 0;
            const end = match && match[2] ? Math.min(Number(match[2]), stats.size - 1) : stats.size - 1;
            if (!match || start > end || start >= stats.size) {
                res.writeHead(416, { 'Content-Range': 'bytes */' + stats.size });
                res.end();
                return;
            }
            res.writeHead(206, { 'Content-Type': contentType, 'Accept-Ranges': 'bytes', 'Content-Range': 'bytes ' + start + '-' + end + '/' + stats.size, 'Content-Length': end - start + 1 });
            fs.createReadStream(filePath, { start, end }).pipe(res);
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': stats.size, 'Accept-Ranges': /^(video|audio)\//.test(contentType) ? 'bytes' : 'none' });
        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
