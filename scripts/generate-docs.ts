import { join } from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

const docsDir = join(__dirname, '../public/docs');
if (!existsSync(docsDir)) {
  mkdirSync(docsDir, { recursive: true });
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

writeFileSync(join(docsDir, 'index.html'), html);
console.log('✅ /docs/index.html generated');
