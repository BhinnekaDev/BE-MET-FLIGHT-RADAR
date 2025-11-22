"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const path_1 = require("path");
const fs_1 = require("fs");
function handler(req, res) {
    try {
        const reqUrl = req.url || '/';
        if (reqUrl === '/openapi.json') {
            const jsonPath = (0, path_1.join)(__dirname, '../public/openapi.json');
            if (!(0, fs_1.existsSync)(jsonPath)) {
                return res.status(404).json({ message: 'openapi.json not found' });
            }
            const json = (0, fs_1.readFileSync)(jsonPath, 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            return res.status(200).send(json);
        }
        if (reqUrl.startsWith('/docs')) {
            let docsPath = (0, path_1.join)(__dirname, '../public', reqUrl);
            if ((0, fs_1.existsSync)(docsPath)) {
                const stats = (0, fs_1.statSync)(docsPath);
                if (stats.isDirectory()) {
                    docsPath = (0, path_1.join)(docsPath, 'index.html');
                }
                if ((0, fs_1.existsSync)(docsPath)) {
                    const ext = (0, path_1.extname)(docsPath).toLowerCase();
                    let contentType = 'text/html';
                    if (ext === '.css')
                        contentType = 'text/css';
                    else if (ext === '.js')
                        contentType = 'application/javascript';
                    else if (ext === '.json')
                        contentType = 'application/json';
                    else if (ext === '.png')
                        contentType = 'image/png';
                    else if (ext === '.jpg' || ext === '.jpeg')
                        contentType = 'image/jpeg';
                    else if (ext === '.svg')
                        contentType = 'image/svg+xml';
                    else if (ext === '.ico')
                        contentType = 'image/x-icon';
                    const content = (0, fs_1.readFileSync)(docsPath);
                    res.setHeader('Content-Type', contentType);
                    return res.status(200).send(content);
                }
            }
            return res.status(404).send('Docs Not Found');
        }
        res.status(404).send('Not Found');
    }
    catch (err) {
        res
            .status(500)
            .json({ message: 'Internal Server Error', error: err.message });
    }
}
//# sourceMappingURL=index.js.map