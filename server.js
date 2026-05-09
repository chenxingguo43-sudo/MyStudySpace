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
    // 解码 URL 编码（中文文件名等）
    try { urlPath = decodeURIComponent(urlPath); } catch(e) {}
    // 安全过滤，防止目录遍历攻击
    urlPath = urlPath.replace(/\.\.\/|\.\.\\/g, '');
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
