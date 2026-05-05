const express = require('express');
const router = express.Router();
const path = require('path');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

router.use(requireAuth);
router.use(requireRole(['staff', 'cashier', 'manager', 'superadmin']));

// GET /pos/app
router.get('/app', (req, res) => {
  const posFile = path.join(__dirname, '..', '..', 'fish-pos.html');
  res.sendFile(posFile, (err) => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Fish POS</title>
          <style>
            body {
              background: #0a1628; color: #e2e8f0;
              font-family: 'Segoe UI', sans-serif;
              display: flex; align-items: center; justify-content: center;
              min-height: 100vh; margin: 0;
            }
            .box {
              text-align: center; max-width: 480px; padding: 2rem;
              background: #0f2044; border: 1px solid #1e3a5f;
              border-radius: 16px;
            }
            h1 { color: #38bdf8; font-size: 1.5rem; margin-bottom: 1rem; }
            p { color: #94a3b8; line-height: 1.7; margin-bottom: 0.5rem; }
            code { background: #1e3a5f; padding: 0.2rem 0.5rem; border-radius: 4px; color: #7dd3fc; }
            a { color: #38bdf8; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="box">
            <h1>🐟 Fish POS</h1>
            <p>ไม่พบไฟล์ <code>fish-pos.html</code></p>
            <p>กรุณาวางไฟล์ <code>fish-pos.html</code> ไว้ที่:<br>
              <code>e:\\claudcode-work\\fish-pos.html</code>
            </p>
            <p style="margin-top:1.5rem">
              <a href="/logout">← ออกจากระบบ</a>
            </p>
          </div>
        </body>
        </html>
      `);
    }
  });
});

module.exports = router;
