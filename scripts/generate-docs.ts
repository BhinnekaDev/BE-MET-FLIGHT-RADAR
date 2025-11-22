import { join } from 'path';
import { writeFileSync, mkdirSync, existsSync, copyFileSync } from 'fs';

const docsDir = join(__dirname, '../public/docs');
if (!existsSync(docsDir)) {
  mkdirSync(docsDir, { recursive: true });
}

const cssSrc = join(
  __dirname,
  '../node_modules/@scalar/api-reference/dist/style.css',
);
const cssDest = join(docsDir, 'style.css');

if (existsSync(cssSrc)) {
  copyFileSync(cssSrc, cssDest);
  console.log('✅ style.css copied to /docs');
} else {
  console.warn(
    '⚠️ style.css not found in node_modules, UI mungkin tidak tampil rapi',
  );
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

writeFileSync(join(docsDir, 'index.html'), html);
console.log('✅ /docs/index.html generated');
