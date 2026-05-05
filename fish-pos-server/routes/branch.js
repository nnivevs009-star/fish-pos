const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const requireBranch = require('../middleware/requireBranch');

router.use(requireAuth);
router.use(requireRole(['manager', 'superadmin']));
router.use(requireBranch);

// GET /branch/dashboard
router.get('/dashboard', (req, res) => {
  const branchId = req.branchId;

  let branch = null;
  if (branchId) {
    branch = db.prepare('SELECT * FROM branches WHERE id = ?').get(branchId);
  }

  const userCounts = {};
  if (branchId) {
    const rows = db.prepare(`
      SELECT role, COUNT(*) as cnt FROM users
      WHERE branch_id = ? GROUP BY role
    `).all(branchId);
    rows.forEach(r => { userCounts[r.role] = r.cnt; });
  }

  const inviteCodes = branchId
    ? db.prepare(`
        SELECT i.*, u.username as creator_name, ub.username as used_by_name
        FROM invite_codes i
        LEFT JOIN users u ON i.created_by = u.id
        LEFT JOIN users ub ON i.used_by = ub.id
        WHERE i.branch_id = ?
        ORDER BY i.created_at DESC
        LIMIT 10
      `).all(branchId)
    : [];

  res.render('branch/dashboard', {
    branch,
    user_counts: userCounts,
    invite_codes: inviteCodes,
    session: req.session
  });
});

// GET /branch/users
router.get('/users', (req, res) => {
  const branchId = req.branchId;

  const users = branchId
    ? db.prepare(`
        SELECT u.*, b.name as branch_name FROM users u
        LEFT JOIN branches b ON u.branch_id = b.id
        WHERE u.branch_id = ?
        ORDER BY u.created_at ASC
      `).all(branchId)
    : db.prepare(`
        SELECT u.*, b.name as branch_name FROM users u
        LEFT JOIN branches b ON u.branch_id = b.id
        ORDER BY u.created_at ASC
      `).all();

  const invites = branchId
    ? db.prepare(`
        SELECT i.*, u.username as creator_name, ub.username as used_by_name
        FROM invite_codes i
        LEFT JOIN users u ON i.created_by = u.id
        LEFT JOIN users ub ON i.used_by = ub.id
        WHERE i.branch_id = ?
        ORDER BY i.created_at DESC
        LIMIT 20
      `).all(branchId)
    : [];

  const branch = branchId
    ? db.prepare('SELECT * FROM branches WHERE id = ?').get(branchId)
    : null;

  res.render('branch/users', {
    users,
    invites,
    branch,
    message: req.query.msg || null,
    session: req.session
  });
});

// POST /branch/invite
router.post('/invite', (req, res) => {
  const branchId = req.branchId;
  if (!branchId) {
    return res.redirect('/branch/users?msg=ไม่ได้กำหนดสาขา');
  }

  const { role } = req.body;
  const isSuperadmin = req.session.role === 'superadmin';

  // Manager can only create staff/cashier, not manager
  const allowedRoles = isSuperadmin
    ? ['manager', 'staff', 'cashier']
    : ['staff', 'cashier'];

  const safeRole = allowedRoles.includes(role) ? role : 'staff';

  const code = crypto.randomBytes(6).toString('hex').toUpperCase();

  db.prepare(`
    INSERT INTO invite_codes (code, branch_id, role, created_by, expires_at)
    VALUES (?, ?, ?, ?, datetime('now', '+48 hours'))
  `).run(code, branchId, safeRole, req.session.userId);

  const msg = encodeURIComponent(`รหัสเชิญ: ${code} | สิทธิ์: ${safeRole} | ลิงก์: http://localhost:3000/register?code=${code}`);
  res.redirect(`/branch/users?msg=${msg}`);
});

// POST /branch/users/:id/toggle
router.post('/users/:id/toggle', (req, res) => {
  const id = parseInt(req.params.id);
  const branchId = req.branchId;
  const isSuperadmin = req.session.role === 'superadmin';

  if (id === req.session.userId) {
    return res.redirect('/branch/users?msg=ไม่สามารถปิดใช้งานบัญชีตัวเองได้');
  }

  // Enforce branch scope for non-superadmin
  const user = isSuperadmin
    ? db.prepare('SELECT * FROM users WHERE id = ?').get(id)
    : db.prepare('SELECT * FROM users WHERE id = ? AND branch_id = ?').get(id, branchId);

  if (!user) {
    return res.redirect('/branch/users?msg=ไม่พบผู้ใช้หรือไม่มีสิทธิ์');
  }

  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(user.is_active ? 0 : 1, id);
  res.redirect('/branch/users?msg=เปลี่ยนสถานะผู้ใช้แล้ว');
});

// POST /branch/users/:id/delete
router.post('/users/:id/delete', (req, res) => {
  const id = parseInt(req.params.id);
  const branchId = req.branchId;
  const isSuperadmin = req.session.role === 'superadmin';

  if (id === req.session.userId) {
    return res.redirect('/branch/users?msg=ไม่สามารถลบบัญชีตัวเองได้');
  }

  // Enforce branch scope for non-superadmin
  const user = isSuperadmin
    ? db.prepare('SELECT * FROM users WHERE id = ?').get(id)
    : db.prepare('SELECT * FROM users WHERE id = ? AND branch_id = ?').get(id, branchId);

  if (!user) {
    return res.redirect('/branch/users?msg=ไม่พบผู้ใช้หรือไม่มีสิทธิ์');
  }

  db.prepare('UPDATE invite_codes SET used_by = NULL, used_at = NULL WHERE used_by = ?').run(id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.redirect('/branch/users?msg=ลบผู้ใช้แล้ว');
});

module.exports = router;
