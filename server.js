const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

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
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
    let urlPath = req.url === '/' ? '/index.html' : req.url;
    // 去除查询参数
    urlPath = urlPath.split('?')[0];
    // 解码 URL 编码（中文文件名等）
    try { urlPath = decodeURIComponent(urlPath); } catch(e) {}
    // 安全过滤，防止目录遍历攻击
    urlPath = urlPath.replace(/\.\.\/|\.\.\\/g, '');

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
                res.end(JSON.stringify({ error: e.message }));
            }
        });
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

    fs.readFile(filePath, (error, content) => {
        if (error) {
            res.writeHead(404);
            res.end('Not Found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
