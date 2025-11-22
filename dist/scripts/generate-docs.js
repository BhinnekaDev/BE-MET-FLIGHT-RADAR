"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const fs_1 = require("fs");
const docsDir = (0, path_1.join)(__dirname, '../public/docs');
if (!(0, fs_1.existsSync)(docsDir)) {
    (0, fs_1.mkdirSync)(docsDir, { recursive: true });
}
const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>MET Flight Radar API Docs</title>
</head>
<body>
  <div id="api-reference"></div>
  
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  <script>
    Scalar.createApiReference('#api-reference', {
      url: '/openapi.json',
      theme: 'default'
    });
  </script>
</body>
</html>
`;
(0, fs_1.writeFileSync)((0, path_1.join)(docsDir, 'index.html'), html);
console.log('✅ /docs/index.html generated');
//# sourceMappingURL=generate-docs.js.map