const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

router.use(requireAuth);
router.use(requireRole(['superadmin']));

// GET /superadmin/dashboard
router.get('/dashboard', (req, res) => {
  const totalBranches = db.prepare('SELECT COUNT(*) as cnt FROM branches').get().cnt;
  const activeBranches = db.prepare("SELECT COUNT(*) as cnt FROM branches WHERE status='active'").get().cnt;
  const totalUsers = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role != 'superadmin'").get().cnt;

  const branches_stats = db.prepare(`
    SELECT b.id, b.name, b.location, b.status,
           COUNT(u.id) as user_count
    FROM branches b
    LEFT JOIN users u ON u.branch_id = b.id
    GROUP BY b.id
    ORDER BY b.created_at ASC
  `).all();

  res.render('superadmin/dashboard', {
    branches_stats,
    total_users: totalUsers,
    total_branches: totalBranches,
    active_branches: activeBranches,
    session: req.session
  });
});

// GET /superadmin/branches
router.get('/branches', (req, res) => {
  const branches = db.prepare('SELECT * FROM branches ORDER BY created_at ASC').all();
  res.render('superadmin/branches', {
    branches,
    message: req.query.msg || null,
    session: req.session
  });
});

// POST /superadmin/branches
router.post('/branches', (req, res) => {
  const { name, location } = req.body;
  if (!name || !name.trim()) {
    return res.redirect('/superadmin/branches?msg=กรุณากรอกชื่อสาขา');
  }
  db.prepare('INSERT INTO branches (name, location) VALUES (?, ?)').run(name.trim(), (location || '').trim());
  res.redirect('/superadmin/branches?msg=สร้างสาขาแล้ว');
});

// POST /superadmin/branches/:id/toggle
router.post('/branches/:id/toggle', (req, res) => {
  const id = parseInt(req.params.id);
  const branch = db.prepare('SELECT status FROM branches WHERE id = ?').get(id);
  if (!branch) return res.redirect('/superadmin/branches?msg=ไม่พบสาขา');
  const newStatus = branch.status === 'active' ? 'inactive' : 'active';
  db.prepare('UPDATE branches SET status = ? WHERE id = ?').run(newStatus, id);
  res.redirect('/superadmin/branches?msg=เปลี่ยนสถานะสาขาแล้ว');
});

// POST /superadmin/branches/:id/delete
router.post('/branches/:id/delete', (req, res) => {
  const id = parseInt(req.params.id);
  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE branch_id = ?').get(id).cnt;
  if (userCount > 0) {
    return res.redirect('/superadmin/branches?msg=ไม่สามารถลบสาขาที่มีผู้ใช้อยู่');
  }
  db.prepare('DELETE FROM invite_codes WHERE branch_id = ?').run(id);
  db.prepare('DELETE FROM branches WHERE id = ?').run(id);
  res.redirect('/superadmin/branches?msg=ลบสาขาแล้ว');
});

// GET /superadmin/users
router.get('/users', (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.role, u.is_active, u.created_at,
           b.name as branch_name
    FROM users u
    LEFT JOIN branches b ON u.branch_id = b.id
    ORDER BY u.created_at ASC
  `).all();

  const branches = db.prepare('SELECT id, name FROM branches ORDER BY name ASC').all();

  res.render('superadmin/users', {
    users,
    branches,
    message: req.query.msg || null,
    session: req.session
  });
});

// POST /superadmin/users/:id/toggle
router.post('/users/:id/toggle', (req, res) => {
  const id = parseInt(req.params.id);
  if (id === req.session.userId) {
    return res.redirect('/superadmin/users?msg=ไม่สามารถปิดใช้งานบัญชีตัวเองได้');
  }
  const user = db.prepare('SELECT is_active FROM users WHERE id = ?').get(id);
  if (!user) return res.redirect('/superadmin/users?msg=ไม่พบผู้ใช้');
  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(user.is_active ? 0 : 1, id);
  res.redirect('/superadmin/users?msg=เปลี่ยนสถานะผู้ใช้แล้ว');
});

// POST /superadmin/users/:id/delete
router.post('/users/:id/delete', (req, res) => {
  const id = parseInt(req.params.id);
  if (id === req.session.userId) {
    return res.redirect('/superadmin/users?msg=ไม่สามารถลบบัญชีตัวเองได้');
  }
  db.prepare('UPDATE invite_codes SET used_by = NULL, used_at = NULL WHERE used_by = ?').run(id);
  db.prepare('DELETE FROM invite_codes WHERE created_by = ?').run(id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.redirect('/superadmin/users?msg=ลบผู้ใช้แล้ว');
});

// GET /superadmin/invite — redirect to branches with instructions
router.get('/invite', (req, res) => {
  res.redirect('/superadmin/branches?msg=เลือกสาขาแล้วกด "สร้างรหัสเชิญ"');
});

// POST /superadmin/invite
router.post('/invite', (req, res) => {
  const { role, branch_id } = req.body;
  const validRoles = ['manager', 'staff', 'cashier'];
  const safeRole = validRoles.includes(role) ? role : 'staff';
  const branchId = parseInt(branch_id);

  if (!branchId) {
    return res.redirect('/superadmin/branches?msg=กรุณาเลือกสาขา');
  }

  const branch = db.prepare('SELECT id, name FROM branches WHERE id = ?').get(branchId);
  if (!branch) {
    return res.redirect('/superadmin/branches?msg=ไม่พบสาขา');
  }

  const code = crypto.randomBytes(6).toString('hex').toUpperCase();

  db.prepare(`
    INSERT INTO invite_codes (code, branch_id, role, created_by, expires_at)
    VALUES (?, ?, ?, ?, datetime('now', '+48 hours'))
  `).run(code, branchId, safeRole, req.session.userId);

  const msg = encodeURIComponent(`รหัสเชิญ: ${code} | สาขา: ${branch.name} | สิทธิ์: ${safeRole} | ลิงก์: http://localhost:3000/register?code=${code}`);
  res.redirect(`/superadmin/branches?msg=${msg}`);
});

module.exports = router;
