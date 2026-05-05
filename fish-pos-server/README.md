# Fish POS — Multi-Branch Authentication Server v2.0

## วิธีติดตั้ง

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. สร้างข้อมูลเริ่มต้น (superadmin + manager1 + สาขาทดสอบ)
node seed.js

# 3. รัน server
npm start
```

Server จะรันที่ `http://localhost:3000`

---

## ข้อมูล Login เริ่มต้น

| Role         | Username    | Password     | สาขา        |
|--------------|-------------|--------------|-------------|
| Super Admin  | superadmin  | Admin1234    | —           |
| Manager      | manager1    | Manager1234  | สาขาทดสอบ  |

---

## แผนที่ URL

| URL                        | คำอธิบาย                             | สิทธิ์ที่เข้าได้              |
|----------------------------|--------------------------------------|-------------------------------|
| `/login`                   | หน้าเข้าสู่ระบบ                      | ทุกคน                         |
| `/logout`                  | ออกจากระบบ                           | ทุกคน                         |
| `/register?code=XXXXXX`    | สมัครสมาชิกด้วยรหัสเชิญ             | ทุกคน (มีรหัส)                |
| `/superadmin/dashboard`    | ภาพรวมระบบทุกสาขา                    | superadmin                    |
| `/superadmin/branches`     | จัดการสาขา + สร้างรหัสเชิญ          | superadmin                    |
| `/superadmin/users`        | ดูผู้ใช้ทั้งหมดในระบบ               | superadmin                    |
| `/branch/dashboard`        | ภาพรวมสาขา                           | manager, superadmin           |
| `/branch/users`            | จัดการผู้ใช้ในสาขา                  | manager, superadmin           |
| `/pos/app`                 | หน้า POS หลัก                        | staff, cashier, manager, superadmin |

---

## สิทธิ์การใช้งาน

| สิทธิ์      | POS | Branch Mgmt | User Mgmt | Invite Code | All Branches |
|-------------|-----|-------------|-----------|-------------|--------------|
| superadmin  | ✅  | ✅          | ✅        | ✅ (all)    | ✅           |
| manager     | ✅  | ✅          | ✅        | staff/cashier | ❌ (own only) |
| staff       | ✅  | ❌          | ❌        | ❌          | ❌           |
| cashier     | ✅  | ❌          | ❌        | ❌          | ❌           |

---

## วิธีเพิ่มสาขาใหม่ (ทีละขั้น)

1. Login ด้วย superadmin
2. ไปที่ `/superadmin/branches`
3. กรอกชื่อสาขาและที่ตั้ง → กด "สร้างสาขา"
4. เลื่อนลงที่แผงด้านขวา → เลือกสาขาใหม่ + สิทธิ์ Manager → กด "สร้างรหัสเชิญ"
5. คัดลอกลิงก์ที่แสดง (`http://localhost:3000/register?code=XXXXXX`)
6. ส่งลิงก์ให้ผู้จัดการสาขาใหม่สมัครสมาชิก
7. หลังสมัครแล้ว ผู้จัดการสามารถสร้างรหัสเชิญสำหรับ staff/cashier ต่อได้เอง

---

## Environment Variables

| Variable          | Default                            | คำอธิบาย                    |
|-------------------|------------------------------------|-----------------------------|
| `PORT`            | `3000`                             | Port ที่ server รัน         |
| `SESSION_SECRET`  | `fish-pos-multi-branch-secret`     | Secret key สำหรับ session   |

---

## โครงสร้างฐานข้อมูล

- **branches** — สาขา (name, location, status)
- **users** — ผู้ใช้ (username, password_hash, role, branch_id, is_active)
- **invite_codes** — รหัสเชิญ (code, branch_id, role, expires_at, used_by)

---

## คำเตือน

> **เปลี่ยนรหัสผ่านทันทีหลัง deploy ขึ้น production!**

- เปลี่ยนรหัสผ่าน `Admin1234` และ `Manager1234` ก่อนใช้งานจริง
- เปลี่ยน `SESSION_SECRET` เป็นค่าสุ่มที่ปลอดภัย
- ไฟล์ `data.db` และ `sessions.db` จะถูกสร้างในโฟลเดอร์ `fish-pos-server/`
