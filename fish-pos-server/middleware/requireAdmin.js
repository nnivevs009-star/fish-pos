module.exports = function requireAdmin(req, res, next) {
  if (req.session && req.session.role === 'admin') {
    return next();
  }
  res.status(403).send(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <title>ไม่มีสิทธิ์เข้าถึง</title>
      <style>
        body { background: #0a1628; color: #e2e8f0; font-family: sans-serif;
               display: flex; align-items: center; justify-content: center;
               min-height: 100vh; margin: 0; }
        .box { text-align: center; }
        h1 { color: #f87171; font-size: 2rem; }
        p { color: #94a3b8; }
        a { color: #38bdf8; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="box">
        <h1>403 - ไม่มีสิทธิ์เข้าถึง</h1>
        <p>คุณต้องเป็น Admin เพื่อเข้าถึงหน้านี้</p>
        <a href="/pos">← กลับไปยังหน้า POS</a>
      </div>
    </body>
    </html>
  `);
};
