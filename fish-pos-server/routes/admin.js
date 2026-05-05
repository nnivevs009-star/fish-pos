const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const requireAuth = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin');

// All admin routes require auth + admin role
router.use(requireAuth);
router.use(requireAdmin);

// GET /admin/users
router.get('/users', (req, res) => {
  const users = db.prepare(
    'SELECT id, username, role, created_at FROM users ORDER BY created_at ASC'
  ).all();

  const invites = db.prepare(`
    SELECT i.id, i.code, i.role, i.created_at, i.expires_at, i.used_by, i.used_at,
           u.username AS creator_username,
           ub.username AS used_by_username
    FROM invite_codes i
    LEFT JOIN users u ON i.created_by = u.id
    LEFT JOIN users ub ON i.used_by = ub.id
    ORDER BY i.created_at DESC
    LIMIT 20
  `).all();

  res.render('admin/users', {
    users,
    invites,
    currentUser: req.session,
    message: req.query.msg || null
  });
});

// POST /admin/invite — generate invite code
router.post('/invite', (req, res) => {
  const role = ['admin', 'staff'].includes(req.body.role) ? req.body.role : 'staff';
  const code = crypto.randomBytes(6).toString('hex').toUpperCase();

  db.prepare(`
    INSERT INTO invite_codes (code, role, created_by, expires_at)
    VALUES (?, ?, ?, datetime('now', '+24 hours'))
  `).run(code, role, req.session.userId);

  res.redirect(`/admin/users?msg=สร้างรหัสเชิญสำเร็จ: ${code} (${role})`);
});

// POST /admin/users/:id/delete
router.post('/users/:id/delete', (req, res) => {
  const targetId = parseInt(req.params.id, 10);

  if (targetId === req.session.userId) {
    return res.redirect('/admin/users?msg=ไม่สามารถลบบัญชีตัวเองได้');
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(targetId);
  res.redirect('/admin/users?msg=ลบผู้ใช้สำเร็จ');
});

// POST /admin/users/:id/role
router.post('/users/:id/role', (req, res) => {
  const targetId = parseInt(req.params.id, 10);

  if (targetId === req.session.userId) {
    return res.redirect('/admin/users?msg=ไม่สามารถเปลี่ยน role ตัวเองได้');
  }

  const newRole = ['admin', 'staff'].includes(req.body.role) ? req.body.role : 'staff';
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(newRole, targetId);
  res.redirect('/admin/users?msg=เปลี่ยน role สำเร็จ');
});

// POST /admin/invites/:id/revoke
router.post('/invites/:id/revoke', (req, res) => {
  const inviteId = parseInt(req.params.id, 10);
  db.prepare('DELETE FROM invite_codes WHERE id = ? AND used_by IS NULL').run(inviteId);
  res.redirect('/admin/users?msg=ยกเลิกรหัสเชิญสำเร็จ');
});

module.exports = router;
