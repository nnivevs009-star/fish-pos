const bcrypt = require('bcrypt');
const db = require('./db');

// Delete all existing data in safe order
db.prepare('DELETE FROM invite_codes').run();
db.prepare('DELETE FROM users').run();
db.prepare('DELETE FROM branches').run();

// Reset autoincrement counters
db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('invite_codes','users','branches')").run();

// Create branch
const branchResult = db.prepare(
  "INSERT INTO branches (name, location) VALUES ('สาขาทดสอบ', 'กรุงเทพ')"
).run();
const branchId = branchResult.lastInsertRowid;

// Create superadmin
const saHash = bcrypt.hashSync('Admin1234', 10);
db.prepare(
  'INSERT INTO users (username, password_hash, role, branch_id) VALUES (?, ?, ?, ?)'
).run('superadmin', saHash, 'superadmin', null);

// Create manager1
const mgrHash = bcrypt.hashSync('Manager1234', 10);
db.prepare(
  'INSERT INTO users (username, password_hash, role, branch_id) VALUES (?, ?, ?, ?)'
).run('manager1', mgrHash, 'manager', branchId);

console.log('');
console.log('✅ Seed สำเร็จ');
console.log('─'.repeat(40));
console.log('Super Admin   : superadmin / Admin1234');
console.log('Branch Manager: manager1   / Manager1234  (สาขาทดสอบ)');
console.log('─'.repeat(40));
console.log('');
