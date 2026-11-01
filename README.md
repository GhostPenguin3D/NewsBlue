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

Pages project `newsblue-guide` และ D1 database `newsblue-questions` ถูกสร้างแล้ว; เว็บอยู่ที่ [newsblue-guide.pages.dev](https://newsblue-guide.pages.dev/). D1 ID และ binding `DB` อยู่ใน `wrangler.toml` และ schema ทั้งสาม migration ถูกนำไปใช้กับ remote database แล้ว

หากตั้งค่า Pages ผ่าน Git integration ให้เลือก framework preset `None`, เว้น Build command ว่าง และตั้ง Build output directory เป็น `public` ห้ามใช้ `npx wrangler deploy` เพราะเป็นคำสั่ง Workers ไม่ใช่ Pages

การ deploy จาก terminal ใช้คำสั่งนี้:

```bash
npx wrangler@4 pages deploy public --project-name=newsblue-guide
```

ถ้าต้องสร้าง environment ใหม่ ให้สร้าง D1 ด้วย `npx wrangler@4 d1 create newsblue-questions`, นำ ID ที่ได้ใส่ใน `wrangler.toml` แล้วรัน migration ตามลำดับ:

```bash
npx wrangler@4 d1 execute newsblue-questions --remote --file=./migrations/0001_init.sql
npx wrangler@4 d1 execute newsblue-questions --remote --file=./migrations/0002_answers.sql
npx wrangler@4 d1 execute newsblue-questions --remote --file=./migrations/0003_articles.sql
```

### เปิดใช้การเพิ่ม/ลบบทความ

ยังต้องตั้ง `ARTICLE_ADMIN_TOKEN` ก่อนใช้แผงจัดการบทความ: ไปที่ Cloudflare Dashboard → **Workers & Pages** → `newsblue-guide` → **Settings → Variables and Secrets** → เพิ่ม secret ชื่อ `ARTICLE_ADMIN_TOKEN` และกำหนดรหัสลับที่คุณเลือกเอง ห้าม commit หรือส่งรหัสนี้ในแชต แล้ว deploy ใหม่เพื่อให้ secret มีผลกับ deployment

ถ้าใช้ Wrangler ในเครื่องแทน Dashboard ให้ใช้ `npx wrangler@4 pages secret put ARTICLE_ADMIN_TOKEN --project-name=newsblue-guide` และพิมพ์ secret ใน terminal prompt เท่านั้น

สำหรับทดสอบในเครื่องให้สร้างตาราง local ตามลำดับด้วย `npx wrangler d1 execute newsblue-questions --local --file=./migrations/0001_init.sql`, `npx wrangler d1 execute newsblue-questions --local --file=./migrations/0002_answers.sql` และ `npx wrangler d1 execute newsblue-questions --local --file=./migrations/0003_articles.sql` แล้วรัน `npx wrangler pages dev public`

บทความที่เพิ่มจากหน้าเว็บจะเผยแพร่ทันที ส่วนการเพิ่ม/ลบต้องใช้ `ARTICLE_ADMIN_TOKEN` ที่ตั้งเป็น Cloudflare secret; สำหรับ local dev ตั้งค่าในไฟล์ `.dev.vars` ซึ่งถูก ignore จาก git รูปแบบไฟล์: `ARTICLE_ADMIN_TOKEN="your-long-random-secret"` รหัสอยู่ในหน่วยความจำหน้าเว็บระหว่าง session เท่านั้น

รายการคำถามเปิดหน้า `question.html?id=...` แยกเป็นรายกระทู้ คำตอบถูกเก็บในตาราง `answers` พร้อม `question_id` และโหลดเฉพาะของกระทู้นั้น

ฐานข้อมูลรายชื่อโรงเรียนจากแหล่งที่ให้มาไม่มีแผนการเรียนรายโรงเรียน จึงเก็บแผนที่ตรวจสอบแยกใน `public/data/school-programs.json` พร้อมปีรับสมัคร จำนวนรับ และ URL เอกสารโรงเรียน ขณะนี้ยืนยันได้ 1 แห่งจากประกาศปี 2569 ของโรงเรียนเตรียมอุดมศึกษา; โรงเรียนอื่นจะไม่แสดงบล็อกแผนจนกว่าจะมีแหล่งอ้างอิงรายโรงเรียน

## ข้อจำกัดของชุมชน

คำถามจะแสดงต่อสาธารณะและจำกัดความถี่ตาม IP แบบเก็บเฉพาะค่า hash ไม่เก็บ IP ดิบ อย่าโพสต์ข้อมูลส่วนตัว ระบบยังไม่มีบัญชีผู้ใช้หรือเครื่องมือกลั่นกรองผู้ดูแล