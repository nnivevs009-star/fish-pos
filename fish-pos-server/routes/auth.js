const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');

// GET /login
router.get('/login', (req, res) => {
  if (req.session && req.session.userId) {
    const role = req.session.role;
    if (role === 'superadmin') return res.redirect('/superadmin/dashboard');
    if (role === 'manager') return res.redirect('/branch/dashboard');
    return res.redirect('/pos/app');
  }
  res.render('login', { error: null, info: null });
});

// POST /login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render('login', { error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน', info: null });
  }

  const user = db.prepare(
    'SELECT * FROM users WHERE username = ? AND is_active = 1'
  ).get(username.trim());

  if (!user) {
    return res.render('login', { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกปิดใช้งาน', info: null });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.render('login', { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', info: null });
  }

  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.role = user.role;
  req.session.branchId = user.branch_id || null;

  const returnTo = req.session.returnTo;
  delete req.session.returnTo;

  if (returnTo) return res.redirect(returnTo);

  if (user.role === 'superadmin') return res.redirect('/superadmin/dashboard');
  if (user.role === 'manager') return res.redirect('/branch/dashboard');
  return res.redirect('/pos/app');
});

// GET /logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// GET /register — query param ?code=XXXXXX
router.get('/register', (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.render('login', { error: 'กรุณาใช้ลิงก์เชิญที่ถูกต้อง', info: null });
  }

  const invite = db.prepare(`
    SELECT i.*, b.name AS branch_name
    FROM invite_codes i
    JOIN branches b ON i.branch_id = b.id
    WHERE i.code = ? AND i.used_by IS NULL AND i.expires_at > datetime('now')
  `).get(code);

  if (!invite) {
    return res.render('login', { error: 'รหัสเชิญไม่ถูกต้อง หมดอายุ หรือถูกใช้งานแล้ว', info: null });
  }

  res.render('register', {
    code,
    invite,
    branchName: invite.branch_name,
    error: null
  });
});

// POST /register
router.post('/register', (req, res) => {
  const { code, username, password, confirm_password } = req.body;

  if (!code) {
    return res.render('login', { error: 'ไม่พบรหัสเชิญ', info: null });
  }

  const invite = db.prepare(`
    SELECT i.*, b.name AS branch_name
    FROM invite_codes i
    JOIN branches b ON i.branch_id = b.id
    WHERE i.code = ? AND i.used_by IS NULL AND i.expires_at > datetime('now')
  `).get(code);

  if (!invite) {
    return res.render('login', { error: 'รหัสเชิญไม่ถูกต้อง หมดอายุ หรือถูกใช้งานแล้ว', info: null });
  }

  const renderRegister = (error) => res.render('register', {
    code,
    invite,
    branchName: invite.branch_name,
    error
  });

  if (!username || !password || !confirm_password) {
    return renderRegister('กรุณากรอกข้อมูลให้ครบถ้วน');
  }

  if (password.length < 6) {
    return renderRegister('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
  }

  if (password !== confirm_password) {
    return renderRegister('รหัสผ่านไม่ตรงกัน');
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (existing) {
    return renderRegister('ชื่อผู้ใช้นี้ถูกใช้แล้ว กรุณาเลือกชื่ออื่น');
  }

  const hash = bcrypt.hashSync(password, 10);

  let newUser;
  try {
    const result = db.prepare(
      'INSERT INTO users (username, password_hash, role, branch_id) VALUES (?, ?, ?, ?)'
    ).run(username.trim(), hash, invite.role, invite.branch_id);

    newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  } catch (err) {
    return renderRegister('เกิดข้อผิดพลาดในการสร้างบัญชี กรุณาลองใหม่');
  }

  db.prepare(
    "UPDATE invite_codes SET used_by = ?, used_at = datetime('now') WHERE id = ?"
  ).run(newUser.id, invite.id);

  // Auto-login
  req.session.userId = newUser.id;
  req.session.username = newUser.username;
  req.session.role = newUser.role;
  req.session.branchId = newUser.branch_id || null;

  if (newUser.role === 'manager') return res.redirect('/branch/dashboard');
  return res.redirect('/pos/app');
});

module.exports = router;
