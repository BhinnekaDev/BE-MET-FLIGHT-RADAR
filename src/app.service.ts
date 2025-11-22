import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return `
      <html>
        <head>
          <title>Met Flight Radar API</title>
          <style>
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
              color: #ffffff;
              text-align: center;
            }
            h1 {
              font-size: 2.5rem;
              margin-bottom: 10px;
            }
            p {
              font-size: 1.2rem;
              margin-bottom: 20px;
              opacity: 0.85;
            }
            a {
              display: inline-block;
              padding: 12px 28px;
              font-size: 1rem;
              color: #ffffff;
              background: #1e3c72;
              border-radius: 6px;
              text-decoration: none;
              transition: all 0.3s ease;
            }
            a:hover {
              background: #162c54;
              transform: translateY(-2px);
            }
          </style>
        </head>
        <body>
          <div>
            <h1>Met Flight Radar API Aktif 🚀</h1>
            <p>Memantau dan melacak data serta analisa penerbangan secara real-time.</p>
            <a href="/docs" target="_blank">Lihat Dokumentasi</a>
          </div>
        </body>
      </html>
    `;
  }
}
