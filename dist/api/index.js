"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const path_1 = require("path");
const fs_1 = require("fs");
function handler(req, res) {
    try {
        const jsonPath = (0, path_1.join)(__dirname, '/openapi.json');
        if (!(0, fs_1.existsSync)(jsonPath)) {
            return res.status(404).json({ message: 'openapi.json not found' });
        }
        if (req.url === '/openapi.json') {
            const json = (0, fs_1.readFileSync)(jsonPath, 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            return res.status(200).send(json);
        }
        if (req.url === '/docs' || req.url === '/') {
            return res.redirect(302, '/docs/');
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