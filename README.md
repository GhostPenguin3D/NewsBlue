# ไปต่อ ม.ปลาย

เว็บคู่มือเตรียมตัวขึ้นมัธยมปลายแบบ static multi-page พร้อม Cloudflare Pages Functions และ D1 สำหรับเก็บคำถามชุมชน

## หน้าเว็บ

- `public/index.html` หน้าแรก
- `public/schools.html` ค้นหาโรงเรียนและคู่มือสายการเรียน
- `public/articles.html` บทความ เทคนิคอ่านหนังสือ และแผงจัดการบทความ
- `public/community.html` กระทู้ถามตอบ (ต้องตั้งค่า D1)
- `public/sheets.html` ชีทสรุป 5 วิชา พิมพ์หรือบันทึกเป็น PDF

ข้อมูลโรงเรียน 2,359 แห่งจาก 62 เขตพื้นที่ มาจาก [ระบบสารสนเทศนักเรียน - รายชื่อเขตพื้นที่การศึกษามัธยมศึกษา](https://school.webactivity.net/districts.php) ซึ่งระบุ snapshot วันที่ 10 มิถุนายน 2569 ภาคเรียนที่ 1/2569 ประกอบด้วยชื่อโรงเรียน สังกัด จำนวนนักเรียนรวม/ชาย/หญิง และจำนวนห้องเรียน ตัวเลขนี้เป็นข้อมูลตามวันอ้างอิง ไม่ใช่ข้อมูลสดและไม่ใช่เกณฑ์รับสมัคร

ดึง snapshot ใหม่จากต้นทางได้ด้วย `node scripts/import-school-data.mjs` สคริปต์ตรวจยอดรวมจากหน้าเขต จำนวนรายการ และรหัสโรงเรียนซ้ำ ก่อนเขียน `public/data/schools.json` แหล่งข้อมูลสำหรับชีทระบุไว้ในไฟล์ JSON และแสดงในหน้า print/PDF

## Deploy บน Cloudflare Pages

ต้องมี Node.js และบัญชี Cloudflare ที่ใช้ Wrangler ได้

1. สร้างฐานข้อมูล: `npx wrangler d1 create newsblue-questions`
2. นำ `database_id` จากผลลัพธ์ไปแทนค่า placeholder `00000000-0000-0000-0000-000000000000` ใน `wrangler.toml`
3. สร้างตารางบนฐานข้อมูล remote: `npx wrangler d1 execute newsblue-questions --remote --file=./migrations/0001_init.sql`
4. เพิ่มตารางคำตอบแยกตามกระทู้: `npx wrangler d1 execute newsblue-questions --remote --file=./migrations/0002_answers.sql`
5. สร้างตารางบทความ: `npx wrangler d1 execute newsblue-questions --remote --file=./migrations/0003_articles.sql`
6. ตั้ง secret ผู้ดูแล: `npx wrangler pages secret put ARTICLE_ADMIN_TOKEN --project-name=newsblue-guide` แล้วกรอกรหัสสุ่มของคุณใน terminal เมื่อ Wrangler ถาม ห้าม commit หรือแชร์ค่านี้
7. Deploy จากโฟลเดอร์โปรเจกต์: `npx wrangler pages deploy public --project-name=newsblue-guide`

ผูก D1 binding ชื่อ `DB` กับ Pages project หากตั้งค่า binding ผ่าน Cloudflare Dashboard แทน Wrangler config ให้ใช้ชื่อเดียวกัน แล้ว deploy ใหม่

สำหรับทดสอบในเครื่องให้สร้างตาราง local ตามลำดับด้วย `npx wrangler d1 execute newsblue-questions --local --file=./migrations/0001_init.sql`, `npx wrangler d1 execute newsblue-questions --local --file=./migrations/0002_answers.sql` และ `npx wrangler d1 execute newsblue-questions --local --file=./migrations/0003_articles.sql` แล้วรัน `npx wrangler pages dev public`

บทความที่เพิ่มจากหน้าเว็บจะเผยแพร่ทันที ส่วนการเพิ่ม/ลบต้องใช้ `ARTICLE_ADMIN_TOKEN` ที่ตั้งเป็น Cloudflare secret; สำหรับ local dev ตั้งค่าในไฟล์ `.dev.vars` ซึ่งถูก ignore จาก git รูปแบบไฟล์: `ARTICLE_ADMIN_TOKEN="your-long-random-secret"` รหัสอยู่ในหน่วยความจำหน้าเว็บระหว่าง session เท่านั้น

รายการคำถามเปิดหน้า `question.html?id=...` แยกเป็นรายกระทู้ คำตอบถูกเก็บในตาราง `answers` พร้อม `question_id` และโหลดเฉพาะของกระทู้นั้น

ฐานข้อมูลรายชื่อโรงเรียนจากแหล่งที่ให้มาไม่มีแผนการเรียนรายโรงเรียน จึงเก็บแผนที่ตรวจสอบแยกใน `public/data/school-programs.json` พร้อมปีรับสมัคร จำนวนรับ และ URL เอกสารโรงเรียน ขณะนี้ยืนยันได้ 1 แห่งจากประกาศปี 2569 ของโรงเรียนเตรียมอุดมศึกษา; โรงเรียนอื่นจะไม่แสดงบล็อกแผนจนกว่าจะมีแหล่งอ้างอิงรายโรงเรียน

## ข้อจำกัดของชุมชน

คำถามจะแสดงต่อสาธารณะและจำกัดความถี่ตาม IP แบบเก็บเฉพาะค่า hash ไม่เก็บ IP ดิบ อย่าโพสต์ข้อมูลส่วนตัว ระบบยังไม่มีบัญชีผู้ใช้หรือเครื่องมือกลั่นกรองผู้ดูแล