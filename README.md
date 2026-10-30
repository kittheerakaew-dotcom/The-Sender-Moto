# The Sender Moto — ระบบจองคิวและบริหารจัดการอู่ซ่อมรถยุโรป

ระบบเว็บไซต์นัดหมายคิวซ่อมออนไลน์และระบบหลังบ้าน (Admin Dashboard) สำหรับ **The Sender Moto** พัฒนาด้วย **Next.js (App Router + TypeScript + Tailwind CSS v4)** และ **Python FastAPI + MySQL / TiDB Cloud Starter**

---

## โครงสร้างโปรเจกต์

```text
Car/
├── frontend/                     # Next.js 16 (App Router + TypeScript)
│   ├── app/
│   │   ├── page.tsx              # หน้าหลักสำหรับลูกค้า + ฟอร์มจองคิวซ่อม
│   │   ├── layout.tsx            # โครงสร้างหลัก ฟอนต์ไทย และ SEO Metadata
│   │   ├── not-found.tsx         # หน้า 404
│   │   ├── robots.ts             # กำหนดสิทธิ์ Search Engine (บล็อก /admin)
│   │   ├── sitemap.ts            # แผนผังเว็บไซต์สำหรับ SEO
│   │   └── admin/                # ระบบจัดการสำหรับเจ้าหน้าที่อู่
│   │       ├── layout.tsx        # เมนู Sidebar รองรับมือถือ + ระบบยืนยัน Admin Key
│   │       ├── page.tsx          # จัดการข้อมูลลูกค้า (Customers)
│   │       ├── appointments/     # จัดการคิวซ่อมและกดรับรถเข้าซ่อม
│   │       └── jobs/             # จัดการใบงานซ่อม รายการอะไหล่ และพิมพ์ใบเสร็จ
├── main.py                       # FastAPI Backend API
├── schemas.py                    # Pydantic Schemas สำหรับตรวจสอบข้อมูล
├── database.py                   # ระบบเชื่อมต่อ MySQL / TiDB พร้อม Connection Reuse
├── Car.sql                       # โครงสร้างตารางฐานข้อมูล (MySQL / TiDB)
├── backup_restore.py             # สคริปต์สำรองและกู้คืนฐานข้อมูลด้วย mysqldump
├── requirements.txt              # รายการแพ็กเกจ Python สำหรับ Deploy บน Vercel
├── vercel.json                   # ตั้งค่า Routing สำหรับ Vercel (Next.js + FastAPI)
└── .env.example                  # ตัวอย่างการตั้งค่าตัวแปรสภาพแวดล้อม
```

---

## วิธีรันระบบในเครื่อง (Local Development)

### 1. ตั้งค่าฐานข้อมูลและ `.env`
1. คัดลอก `.env.example` ไปเป็น `.env` แล้วใส่ค่าเชื่อมต่อ MySQL ในเครื่อง
2. รันไฟล์ `Car.sql` เพื่อสร้างตารางทั้งหมด:
   ```bash
   mysql -u root -p < Car.sql
   ```

### 2. รัน Python API (พอร์ต 8000)
```bash
venv\Scripts\uvicorn main:app --reload --port 8000
```

### 3. รัน Next.js Frontend (พอร์ต 3000)
```bash
cd frontend
npm run dev
```
เปิดเบราว์เซอร์ไปที่ `http://localhost:3000` (หน้าลูกค้า) หรือ `http://localhost:3000/admin` (หน้าเจ้าหน้าที่)

---

## การสำรองและกู้คืนข้อมูล (Backup & Restore)

ไม่ควรพึ่งพาระบบสำรองข้อมูลอัตโนมัติของผู้ให้บริการคลาวด์เพียงอย่างเดียว สามารถใช้สคริปต์ `backup_restore.py` เพื่อสำรองข้อมูลลงเครื่องได้ทุกเมื่อ:

* **สำรองฐานข้อมูล (Backup)**:
  ```bash
  venv\Scripts\python backup_restore.py backup
  ```
  *(ไฟล์ `.sql` จะถูกบันทึกไว้ในโฟลเดอร์ `backups/`)*

* **กู้คืนฐานข้อมูล (Restore)**:
  ```bash
  venv\Scripts\python backup_restore.py restore backups/the_sender_moto_YYYYMMDD_HHMMSS.sql
  ```

---

## การนำขึ้นใช้งานจริง (Vercel + TiDB Cloud Starter)

> **ข้อควรทราบสำคัญเกี่ยวกับใบอนุญาตของ Vercel:**
> แผน **Vercel Hobby (ฟรี)** อนุญาตให้ใช้สำหรับการพัฒนา ทดสอบ หรือโปรเจกต์ส่วนบุคคลที่ไม่ใช่เชิงพาณิชย์เท่านั้น (Non-commercial use only) เนื่องจากเว็บไซต์ **The Sender Moto** เป็นเว็บไซต์ธุรกิจอู่ซ่อมรถยนต์เชิงพาณิชย์ **เมื่อเปิดใช้งานจริง (Production Launch) จำเป็นต้องใช้แผน Vercel Pro** หรือผู้ให้บริการโฮสติ้งอื่นที่อนุญาตการใช้งานเชิงพาณิชย์

### ขั้นตอนตั้งค่า TiDB Cloud Starter (AWS Singapore)
1. สร้างคลัสเตอร์ **TiDB Cloud Starter** เลือกภูมิภาค **AWS Singapore (`ap-southeast-1`)**
2. สร้างฐานข้อมูลชื่อ `TheSenderMoto` แล้วนำคำสั่งในไฟล์ `Car.sql` ไปรันผ่าน SQL Editor หรือ `mysql` CLI
3. นำค่า `DB_HOST`, `DB_PORT` (`4000`), `DB_USER`, `DB_PASSWORD`, `DB_NAME` ไปตั้งใน Environment Variables ของ Vercel พร้อมกำหนด `DB_SSL_REQUIRED=true` และ `ADMIN_API_KEY`

---

## รายการข้อมูลจริงที่ต้องใส่แทนที่ `[TODO: ...]` ก่อนเปิดใช้งานจริง

1. `frontend/app/page.tsx` (ส่วนติดต่ออู่):
   - `[TODO: ใส่ข้อมูลจริง - ที่อยู่อู่ The Sender Moto]`
   - `[TODO: ใส่ข้อมูลจริง - เช่น จันทร์–เสาร์ 08:30 – 17:30 น.]`
   - `[TODO: ใส่ข้อมูลจริง - เบอร์โทรศัพท์อู่]`
   - `[TODO: ใส่ข้อมูลจริง - @LINE_ID]`
   - `[TODO: ใส่ลิงก์ Google Maps และ LINE OA จริงก่อนเปิดใช้งาน]`
2. `frontend/app/admin/jobs/page.tsx` (ส่วนหัวใบเสร็จรับเงิน):
   - `[TODO: ใส่ข้อมูลจริง - ที่อยู่อู่ เบอร์โทร และเลขประจำตัวผู้เสียภาษี]`
