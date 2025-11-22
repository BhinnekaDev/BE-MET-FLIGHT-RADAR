"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const fs_1 = require("fs");
const docsDir = (0, path_1.join)(__dirname, '../public/docs');
if (!(0, fs_1.existsSync)(docsDir)) {
    (0, fs_1.mkdirSync)(docsDir, { recursive: true });
}
const cssSrc = (0, path_1.join)(__dirname, '../node_modules/@scalar/api-reference/dist/style.css');
const cssDest = (0, path_1.join)(docsDir, 'style.css');
if ((0, fs_1.existsSync)(cssSrc)) {
    (0, fs_1.copyFileSync)(cssSrc, cssDest);
    console.log('✅ style.css copied to /docs');
}
else {
    console.warn('⚠️ style.css not found in node_modules, UI mungkin tidak tampil rapi');
}
const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>MET Flight Radar API Docs</title>
  <link rel="stylesheet" href="./style.css">
</head>
<body>
  <div id="api-reference"></div>

  <!-- Scalar API Reference JS -->
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>

  <script>
    // Inisialisasi API Reference
    document.addEventListener("DOMContentLoaded", function() {
      if (window.Scalar) {
        Scalar.createApiReference('#api-reference', {
          url: '/openapi.json',
          theme: 'default'
        });
      } else {
        console.error("Scalar API Reference failed to load.");
      }
    });
  </script>
</body>
</html>
`;
(0, fs_1.writeFileSync)((0, path_1.join)(docsDir, 'index.html'), html);
console.log('✅ /docs/index.html generated');
//# sourceMappingURL=generate-docs.js.map