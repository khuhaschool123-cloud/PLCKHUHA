# ระบบ PLC โรงเรียนบ้านคูหา

เว็บบันทึกกิจกรรม PLC สำหรับโรงเรียนบ้านคูหา ใช้ Google Sheets เป็นฐานข้อมูลข้อความและ Google Drive เก็บรูปหลักฐาน ผ่าน Google Apps Script Web App

## การเข้าใช้งาน

- ไม่มีระบบสมัครสมาชิกและไม่มีรหัสผ่านของระบบ
- ผู้ใช้กรอกอีเมลที่ได้รับอนุญาต ระบบส่งรหัสยืนยัน 6 หลักไปยังอีเมลนั้น
- รหัสยืนยันมีอายุ 10 นาที และเซสชันใช้งานมีอายุ 6 ชั่วโมง
- Apps Script ตรวจสิทธิ์ซ้ำทุกครั้งที่อ่าน บันทึก หรือลบข้อมูล
- รายชื่อผู้ได้รับอนุญาตอยู่ใน `google-apps-script/Code.gs` ตัวแปร `ALLOWED_USERS`

## ตั้งค่าฐานข้อมูล Google Drive แยกใหม่

1. สร้าง Google Sheet ใหม่ในบัญชี Google ที่โรงเรียนจะใช้เป็นเจ้าของข้อมูล
2. เปิด `ส่วนขยาย (Extensions)` > `Apps Script`
3. คัดลอกโค้ดทั้งหมดจาก `google-apps-script/Code.gs` ไปวางในไฟล์ `Code.gs`
4. ตั้งค่า Project Settings > Time zone เป็น `Asia/Bangkok`
5. เลือกฟังก์ชัน `setupProject` แล้วกด Run และอนุญาตสิทธิ์ Google Sheets, Google Drive และการส่งอีเมล
6. เปิด Execution log แล้วเก็บค่า `spreadsheetUrl`, `rootFolderUrl` และ `appKey`
7. เลือก `Deploy` > `New deployment` > `Web app`
8. ตั้ง `Execute as: Me` และ `Who has access: Anyone` แล้ว Deploy
9. คัดลอก URL ที่ลงท้ายด้วย `/exec`

ระบบจะสร้าง Google Sheet ชื่อ `Baan Khuha PLC Database` และโฟลเดอร์รูปชื่อ `Baan Khuha PLC Uploads` ใน Drive ของบัญชีเจ้าของ

## เชื่อมเว็บกับ Apps Script

สร้างไฟล์ `.env.local` ที่รากโปรเจกต์:

```env
VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
VITE_GOOGLE_APPS_SCRIPT_KEY=APP_KEY_FROM_SETUP_PROJECT
```

จากนั้นตรวจสอบโปรเจกต์:

```powershell
npm.cmd install
npm.cmd run lint
npm.cmd run build
```

> ค่า App Key จะอยู่ในไฟล์เว็บที่ build แล้ว การป้องกันหลักคือรหัสยืนยันทางอีเมลและ session token ที่ตรวจฝั่ง Apps Script

## เปลี่ยนตราโรงเรียน

ไฟล์ `public/school-logo.svg` เป็นตราชั่วคราว หากมีตราโรงเรียนจริงให้นำไฟล์ใหม่มาแทนโดยใช้ชื่อเดิม หรือแก้ค่า `logoUrl` ใน `src/App.jsx`
