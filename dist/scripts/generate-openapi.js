"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
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
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@scalar/nestjs-api-reference/dist/styles.css">
</head>
<body>
  <div id="api-reference"></div>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/nestjs-api-reference/dist/main.js"></script>
  <script>
    ApiReference.init({
      element: document.getElementById('api-reference'),
      url: '/openapi.json',
      theme: 'default'
    });
  </script>
</body>
</html>
`;
(0, fs_1.writeFileSync)((0, path_1.join)(docsDir, 'index.html'), html);
console.log('✅ /docs/index.html generated');
//# sourceMappingURL=generate-openapi.js.map