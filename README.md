# The Sender Moto — ระบบจองคิวซ่อมและบริหารจัดการอู่รถยุโรปครบวงจร

เว็บไซต์นัดหมายคิวซ่อมออนไลน์ ตรวจสอบ/เลื่อนนัดด้วยตนเอง และระบบจัดการหลังบ้าน (Admin Dashboard: ลูกค้า, คิวนัดหมาย, ใบงานซ่อม และพิมพ์ใบเสร็จรับเงิน) สำหรับอู่ซ่อมและดูแลรักษารถยนต์ยุโรป **The Sender Moto**

---

## 1. โครงสร้างระบบและเทคโนโลยี (Tech Stack)

- **Frontend (`frontend/`)**: Next.js 16.4.3 (App Router + TypeScript 5 + Tailwind CSS v4)
- **Backend API (`main.py`, `schemas.py`, `database.py`)**: Python FastAPI 0.162.0 + Pydantic 2.14.1
- **Database (`Car.sql`, `migrations/`)**: MySQL 8.0 / **TiDB Cloud Starter** (MySQL-compatible, AWS Singapore `ap-southeast-1`)
- **Deployment (`vercel.json`)**: **Single Vercel Project** (รันทั้ง Next.js และ Python `/api/*` บนโดเมนเดียวกันใน Region สิงคโปร์ `sin1`)

---

## 2. วิธีรันระบบในเครื่อง (Local Development)

### 2.1 เตรียมฐานข้อมูลในเครื่อง (Local MySQL)
1. รันสคริปต์สร้างตารางจากไฟล์ `Car.sql`:
   ```powershell
   mysql -u root -p < Car.sql
   ```
2. คัดลอกไฟล์ `.env.example` เป็น `.env` ที่รากโปรเจกต์ แล้วตั้งค่า `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` ให้ตรงกับเครื่องของคุณ

### 2.2 สร้างรหัสผ่านผู้ดูแลระบบคนแรก (First Admin Setup)
รันคำสั่งด้านล่างแล้วตั้งรหัสผ่านแอดมิน (อย่างน้อย 8 ตัวอักษร):
```powershell
.\venv\Scripts\python.exe create_admin.py
```
คัดลอกค่า `ADMIN_PASSWORD_HASH` และ `ADMIN_SESSION_SECRET` ที่ได้ไปใส่ในไฟล์ `.env`

### 2.3 รัน Backend API (พอร์ต 8000)
```powershell
.\venv\Scripts\uvicorn.exe main:app --reload --port 8000
```
- ตรวจสอบสถานะการเชื่อมต่อฐานข้อมูลได้ที่: `http://127.0.0.1:8000/health`

### 2.4 รัน Frontend Next.js (พอร์ต 3000)
เปิดอีก Terminal แล้วรัน:
```powershell
cd frontend
npm run dev
```
- หน้าเว็บไซต์สำหรับลูกค้า: `http://localhost:3000`
- หน้าจัดการสำหรับแอดมิน: `http://localhost:3000/admin`

### 2.5 รันสคริปต์ทดสอบระบบจองคิวอัตโนมัติ
```powershell
$env:PYTHONIOENCODING="utf-8"; .\venv\Scripts\python.exe scripts\test_booking_flow.py
```

---

## 3. วิธีตั้งค่าฐานข้อมูลฟรีบน TiDB Cloud Starter (AWS Singapore)

1. สมัครและเข้าสู่ระบบที่ [TiDB Cloud](https://tidbcloud.com/)
2. กด **Create Cluster** &rarr; เลือกแพ็กเกจ **Starter (Free)**
3. เลือก Cloud Provider เป็น **AWS** และเลือกภูมิภาค **Singapore (`ap-southeast-1`)** เพื่อให้เชื่อมต่อกับไทยและ Vercel Singapore (`sin1`) ได้เร็วที่สุด
4. ตั้งชื่อคลัสเตอร์และกดสร้าง รอประมาณ 30–60 วินาที แล้วกดปุ่ม **Connect**:
   - คัดลอกค่า `Host` (เช่น `gateway01.ap-southeast-1.prod.aws.tidbcloud.com`), `Port` (`4000`), `User` และ `Password`
5. เปิดเมนู **SQL Editor** (หรือเชื่อมต่อผ่าน MySQL Client) แล้วรันคำสั่งในไฟล์ `Car.sql` เพื่อสร้างฐานข้อมูลและตารางทั้งหมด
   - *หมายเหตุ*: หากมีฐานข้อมูลรุ่นเก่าอยู่แล้ว สามารถรันไฟล์ในโฟลเดอร์ `migrations/001_phase_b_data_pdpa.sql` และ `migrations/002_phase_c_booking_flow.sql` เพื่ออัปเกรดตารางโดยไม่ลบข้อมูลเดิม
6. **การตั้งค่า TLS**: ใน `database.py` ระบบจะเปิดใช้ TLS อัตโนมัติทันทีเมื่อ `DB_HOST` มีคำว่า `tidbcloud.com` หรือเมื่อตั้งค่า `DB_SSL_REQUIRED=true`
7. **วิธีดูโควตาฟรี (Quota Monitoring)**:
   - เข้าหน้า Dashboard ของคลัสเตอร์บน TiDB Cloud เพื่อดูปริมาณ **Row Storage** (ฟรีสูงสุด **5 GiB**) และ **Request Units (RUs)** (ฟรี **50 ล้าน RUs/เดือน**)
   - **สำคัญ**: หากใช้โควตา 50M RUs หมดในเดือนนั้น TiDB จะปฏิเสธการเปิด Connection ใหม่ชั่วคราว ระบบจึงมี Honeypot และตาราง `Rate_Limits` ป้องกันบอทยิง API จองคิว รวมถึงไม่มีการใช้ระบบ Auto-polling ในหน้า Admin เพื่อประหยัด RUs สูงสุด

---

## 4. วิธีนำขึ้นระบบจริงบน Vercel (Single Vercel Project)

1. นำโค้ดขึ้น GitHub Repository ของคุณ
2. เข้าสู่ระบบ [Vercel](https://vercel.com/) &rarr; กด **Add New... &rarr; Project** แล้วเลือก Repository นี้
3. ไม่ต้องเปลี่ยน Root Directory (ปล่อยไว้ที่ราก `/` เพื่อให้ Vercel อ่านไฟล์ `vercel.json` ซึ่งเชื่อมทั้ง `main.py` และ `frontend/` เข้าด้วยกันในโปรเจกต์เดียว)
4. ไปที่ส่วน **Environment Variables** แล้วเพิ่มตัวแปรดังนี้:

| ชื่อตัวแปร (Key) | ค่าที่ต้องตั้งบน Production (Value) | คำอธิบาย |
| :--- | :--- | :--- |
| `APP_ENV` | `production` | ปิด `/docs`, `/redoc`, `/openapi.json` และบังคับใช้คุกกี้ `Secure` + Admin Auth |
| `DB_HOST` | `gateway01.ap-southeast-1.prod.aws.tidbcloud.com` | Host ของ TiDB Cloud Starter |
| `DB_PORT` | `4000` | พอร์ตของ TiDB Cloud (`4000`) |
| `DB_USER` | `<ชื่อผู้ใช้จาก TiDB Cloud>` | ชื่อผู้ใช้ฐานข้อมูล |
| `DB_PASSWORD` | `<รหัสผ่านจาก TiDB Cloud>` | รหัสผ่านฐานข้อมูล |
| `DB_NAME` | `TheSenderMoto` | ชื่อฐานข้อมูล |
| `DB_SSL_REQUIRED` | `true` | บังคับเข้ารหัสการเชื่อมต่อฐานข้อมูลด้วย TLS |
| `ADMIN_PASSWORD_HASH` | `scrypt$16384$8$1$...` | ค่าที่ได้จากคำสั่ง `python create_admin.py` |
| `ADMIN_SESSION_SECRET` | `<รหัสสุ่ม 64 ตัวอักษร>` | ค่าที่ได้จากคำสั่ง `python create_admin.py` |
| `ALLOWED_ORIGINS` | `https://yourdomain.com` | โดเมนจริงของเว็บไซต์ (คั่นด้วย `,` หากมีหลายโดเมน) |
| `NEXT_PUBLIC_API_URL` | `/api` | ชี้ไปที่ `/api` บนโดเมนเดียวกัน |
| `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.com` | URL หลักของเว็บไซต์สำหรับทำ Sitemap และ SEO |
| `MAX_CARS_PER_SLOT` | `2` | จำนวนรถที่รับได้สูงสุดต่อช่วงเวลา |
| `MIN_LEAD_TIME_MINUTES` | `60` | ต้องจองล่วงหน้าอย่างน้อยกี่นาที |
| `WORKSHOP_HOLIDAYS` | `2026-12-31,2027-01-01` | วันหยุดพิเศษของอู่ (เว้นว่างได้) |
| `LINE_CHANNEL_ACCESS_TOKEN` | `<Token จาก LINE Developers>` | สำหรับส่งแจ้งเตือนคิวใหม่เข้า LINE แอดมิน (เว้นว่างได้) |
| `LINE_ADMIN_USER_ID` | `<User ID หรือ Group ID>` | ปลายทางผู้รับแจ้งเตือน LINE (เว้นว่างได้) |

5. กด **Deploy** แล้วตรวจสอบการทำงานได้ที่ `https://<your-domain>/api/health`
6. **การผูกชื่อโดเมนจริง (Custom Domain)**:
   - ไปที่แท็บ **Settings &rarr; Domains** บน Vercel &rarr; พิมพ์ชื่อโดเมนของอู่ (เช่น `thesendermoto.com`) แล้วตั้งค่า DNS (`A Record` และ `CNAME`) ตามที่ Vercel แนะนำ (Vercel ออกใบรับรอง SSL/HTTPS ให้อัตโนมัติฟรี)

---

## 5. การสำรองและกู้คืนฐานข้อมูล (Backup & Restore)

ไม่ควรพึ่งพาเฉพาะระบบสำรองข้อมูลอัตโนมัติของ Cloud เพียงอย่างเดียว แนะนำให้สำรองข้อมูลเก็บไว้ในเครื่องอย่างน้อยสัปดาห์ละ 1 ครั้งด้วยสคริปต์ `backup_restore.py` หรือปุ่ม **ส่งออก CSV** ในหน้า Admin

### สำรองข้อมูล (Backup เป็นไฟล์ `.sql`)
```powershell
.\venv\Scripts\python.exe backup_restore.py backup
```
ไฟล์สำรองจะถูกบันทึกไว้ที่โฟลเดอร์ `backups/the_sender_moto_YYYYMMDD_HHMMSS.sql`

### กู้คืนข้อมูล (Restore จากไฟล์ `.sql`)
```powershell
.\venv\Scripts\python.exe backup_restore.py restore backups\the_sender_moto_20261031_120000.sql
```

---

## 6. ตารางสรุปค่าใช้จ่ายจริงในการเปิดใช้งาน (Cost Breakdown)

> **ข้อควรทราบสำคัญเรื่องสิทธิ์การใช้งานเชิงพาณิชย์ของ Vercel**:
> แพ็กเกจ **Vercel Hobby (ฟรี)** มีข้อกำหนดการใช้งานสำหรับ **ส่วนบุคคลหรือการทดสอบที่ไม่ใช่เชิงพาณิชย์เท่านั้น (Non-commercial / Staging only)** เนื่องจากเว็บไซต์อู่ซ่อมรถเป็นธุรกิจเชิงพาณิชย์ เมื่อเปิดใช้งานจริงสำหรับลูกค้า (**Production Launch**) จำเป็นต้องใช้แพ็กเกจ **Vercel Pro** (หรือเลือกผู้ให้บริการโฮสติ้งอื่นที่อนุญาตการใช้งานเชิงพาณิชย์)

| รายการบริการ | ช่วงพัฒนา / ทดสอบ (Staging) | เปิดใช้งานจริงเชิงพาณิชย์ (Production) | รายละเอียดและโควตา |
| :--- | :--- | :--- | :--- |
| **1. Hosting (Vercel)** | **ฟรี ($0)** *(Vercel Hobby — ใช้ทดสอบเท่านั้น)* | **$20 / เดือน** *(~680–700 บาท/เดือน สำหรับ Vercel Pro)* | รองรับการใช้งานเชิงพาณิชย์, FastAPI Serverless (`sin1`) + Next.js, SSL อัตโนมัติ |
| **2. Database (TiDB Cloud Starter - AWS Singapore)** | **ฟรี ($0)** | **ฟรี ($0)** | ฟรี 5 GiB Row Storage + 50 ล้าน RUs/เดือน (เริ่มมีค่าใช้จ่ายเฉพาะเมื่อขยายเกินโควตาฟรี) |
| **3. ระบบแจ้งเตือน LINE Official Account** | **ฟรี ($0)** | **ฟรี ($0)** *(แพ็กเกจเริ่มต้น)* | ส่งแจ้งเตือนแอดมินฟรี **300 ข้อความ Push/เดือน** (1 คิวจอง = 1 ข้อความ) |
| **4. พื้นที่เก็บรูปอาการรถ (Photo Upload)** | **ฟรี ($0)** | **ฟรี ($0)** | บีบอัดรูปฝั่งเบราว์เซอร์เก็บในฐานข้อมูลโดยตรง (หรือต่อ Cloudflare R2 ฟรี 10 GB/เดือนในอนาคต) |
| **5. ชื่อโดเมน (`.com` หรือ `.co.th`)** | ไม่ต้องใช้ (ใช้ `.vercel.app`) | **~350 – 800 บาท / ปี** | จดผ่านผู้ให้บริการโดเมนและชี้ DNS มาที่ Vercel |
| **รวมค่าใช้จ่ายรายเดือนโดยประมาณ** | **0 บาท / เดือน** | **~680–700 บาท / เดือน** *(+ ค่าโดเมนรายปี)* | ประหยัดและเสถียรสำหรับธุรกิจอู่รถยุโรป |

---

## 7. รายการตรวจสอบก่อนเปิดใช้งานจริง (Pre-Launch Checklist)

- [ ] **อัปเกรด Vercel เป็นแพ็กเกจ Pro** (หรือย้ายไปโฮสต์ที่รองรับการใช้งานเชิงพาณิชย์) ก่อนเปิดรับลูกค้าจริง
- [ ] **แทนที่ข้อความ `[TODO: ...]` ด้วยข้อมูลจริงของอู่**:
  - ในไฟล์ `frontend/app/page.tsx`:
    - ที่อยู่อู่จริง (`[TODO: ใส่ข้อมูลจริง - ที่อยู่อู่ The Sender Moto]`)
    - LINE ID จริง (`[TODO: ใส่ข้อมูลจริง - @LINE_ID]`)
    - ลิงก์แผนที่ Google Maps และลิงก์เพิ่มเพื่อน LINE (`[TODO: ใส่ลิงก์ Google Maps และ LINE OA จริงก่อนเปิดใช้งาน]`)
    - รูปภาพจริงของอู่ ช่องซ่อม และทีมช่าง
    - เงื่อนไขระยะเวลารับประกันงานซ่อมและรีวิวจากลูกค้าจริง
  - ในไฟล์ `frontend/app/admin/jobs/page.tsx`:
    - ที่อยู่อู่ เบอร์โทร และเลขประจำตัวผู้เสียภาษีในหัวใบเสร็จรับเงิน (`[TODO: ใส่ข้อมูลจริง - ที่อยู่อู่ เบอร์โทร และเลขประจำตัวผู้เสียภาษี]`)
- [ ] รัน `python create_admin.py` เพื่อสร้างรหัสผ่านแอดมินที่คาดเดายาก และตั้งค่า `ADMIN_PASSWORD_HASH` + `ADMIN_SESSION_SECRET` บน Vercel
- [ ] ตั้งค่า `APP_ENV=production` บน Vercel เพื่อปิดหน้า `/docs` และบังคับใช้คุกกี้ `Secure`
- [ ] ทดสอบจองคิว 1 รายการบนเว็บจริง และทดสอบค้นหา/เลื่อนนัด/รับรถเข้าซ่อมในหน้า `/admin`
