from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import mysql.connector
from database import get_data_connection
from schemas import CustomerCreate, VehicleCreate, AppointmentCreate, ServiceJobCreate, ServiceItemCreate, BookingCreate
import time
import os
import re
import uuid
import hmac
from datetime import datetime, timezone, timedelta

app = FastAPI(title="The Sender Moto API")

from fastapi.middleware.cors import CORSMiddleware

# อ่านรายการ Origin ที่อนุญาตจาก .env (ค่าเริ่มต้นรองรับ localhost สำหรับพัฒนา)
_allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ตัวแปรจำกัดความถี่การจองคิวต่อ IP (ป้องกันบอทยิงถล่มโควตา TiDB)
_booking_rate_limit: dict[str, list[float]] = {}
_RATE_LIMIT_WINDOW = 600  # 10 นาที
_RATE_LIMIT_MAX_REQ = 5   # สูงสุด 5 ครั้งต่อ 10 นาทีต่อ IP
_BANGKOK_TZ = timezone(timedelta(hours=7))


@app.middleware("http")
async def api_prefix_and_security_middleware(request: Request, call_next):
    # รองรับทั้งการเรียกผ่าน /api/... บน Vercel และการเรียกตรงในเครื่อง
    path = request.scope.get("path", "")
    if path == "/api":
        request.scope["path"] = "/"
    elif path.startswith("/api/"):
        request.scope["path"] = path[4:]

    normalized_path = request.scope.get("path", "")

    # ตรวจสอบสิทธิ์ Admin เมื่อมีการตั้งค่า ADMIN_API_KEY ใน .env
    admin_key = os.getenv("ADMIN_API_KEY", "").strip()
    is_public_route = (
        request.method == "OPTIONS"
        or normalized_path == "/"
        or (normalized_path == "/bookings" and request.method == "POST")
    )

    if admin_key and not is_public_route:
        provided_key = request.headers.get("X-Admin-Key", "").strip()
        if not provided_key or not hmac.compare_digest(provided_key, admin_key):
            return JSONResponse(
                status_code=401,
                content={"status": "Failed", "message": "กรุณาเข้าสู่ระบบสำหรับผู้ดูแลระบบ (Unauthorized)"},
            )

    return await call_next(request)


@app.get("/")
def check_connection():
    connect = get_data_connection()
    if connect and connect.is_connected():
        connect.close()
        return {"status": "Success", "message": "connected database"}
    return {"status": "Failed", "message": "failed to connect database"}


@app.get("/admin/verify")
def verify_admin():
    return {"status": "Success", "message": "ยืนยันสิทธิ์ผู้ดูแลระบบสำเร็จ"}
########################################################################################################
#   START Customer
########################################################################################################
@app.get("/customers")
def get_customers():
    connect = get_data_connection()
    if not connect:
        return {"status": "Failed", "message": "failed to connect database", "data": []}

    cursor = connect.cursor(dictionary = True)
    try:
        cursor.execute("SELECT * FROM Customers ORDER BY CustomerID DESC")
        result = cursor.fetchall()
        return {"status": "Success", "data": result}
    except mysql.connector.Error as e:
        print(f"DB Error in get_customers: {e}")
        return {"status": "Failed", "message": "ไม่สามารถดึงข้อมูลลูกค้าได้", "data": []}
    finally:
        cursor.close()
        connect.close()

@app.post("/customers")
def create_customer(customer: CustomerCreate):
    connect = get_data_connection()
    if not connect:
        return {"status": "Failed", "message": "failed to create customer, Database connection error"}
    
    cursor = connect.cursor()
    sql = """
        INSERT INTO Customers (CustomerName, Address, PhoneNumber, Email, CustomerTier) 
        VALUES (%s, %s, %s, %s, %s)
    """
    val = (customer.CustomerName.strip(), customer.Address, customer.PhoneNumber.strip(), customer.Email, customer.CustomerTier)

    try:
        cursor.execute(sql, val)
        connect.commit()
        return {"status": "Success", "message": f"Added customer {customer.CustomerName} successfully"}
    except mysql.connector.Error as e:
        connect.rollback()
        print(f"DB Error in create_customer: {e}")
        return {"status": "Failed", "message": "ไม่สามารถเพิ่มข้อมูลลูกค้าได้"}
    finally:
        cursor.close()
        connect.close()
########################################################################################################
#   END Customer
#------------------------------------------------------------------------------------------------------#
#   START Vehicles
########################################################################################################
@app.post("/vehicles")
def create_vehicle(vehicle: VehicleCreate):
    connect = get_data_connection()
    if not connect:
        return {"status": "Failed", "message": "failed to create vehicle, Database connection error"}

    cursor = connect.cursor()
    sql = """
        INSERT INTO Vehicles (CustomerID, CarBrand, CarNumber, CarModel, VINCODE) 
        VALUES (%s, %s, %s, %s, %s)
    """
    val = (vehicle.CustomerID, vehicle.CarBrand, vehicle.CarNumber, vehicle.CarModel, vehicle.VINCODE)

    try:
        cursor.execute(sql, val)
        connect.commit()
        msg = "Success"
        detail = f"Added vehicle {vehicle.CarNumber} successfully"
    except mysql.connector.Error as e:
        connect.rollback()
        print(f"DB Error in create_vehicle: {e}")
        msg = "Failed"
        detail = "ไม่สามารถเพิ่มข้อมูลรถยนต์ได้ (รหัสตัวถังอาจซ้ำ)"
    finally:
        cursor.close()
        connect.close()
    return {"status": msg, "message": detail}

@app.get("/vehicles")
def get_vehivles():
    connect = get_data_connection()
    if not connect:
        return {"status": "Failed", "message": "Database error can not show vehicle", "data": []}

    cursor = connect.cursor(dictionary = True)
    try:
        cursor.execute("SELECT * FROM Vehicles")
        result = cursor.fetchall()
        return {"status": "Success", "data": result}
    except mysql.connector.Error as e:
        print(f"DB Error in get_vehivles: {e}")
        return {"status": "Failed", "message": "ไม่สามารถดึงข้อมูลรถยนต์ได้", "data": []}
    finally:
        cursor.close()
        connect.close()
########################################################################################################
#   END Vehicles
#------------------------------------------------------------------------------------------------------#
#   START Appointment
########################################################################################################
@app.post("/appointment")
def create_appointment(appointment: AppointmentCreate):
    connect = get_data_connection()
    if not connect:
        return {"status": "Failed", "message": "failed to create appointment, Database connection error"}

    cursor = connect.cursor()
    sql = """
        INSERT INTO Appointments (CustomerID, VehicleID, AppointmentDate, AppointmentTime, ServiceType, Notes, Status) 
        VALUES (%s, %s, %s, %s, %s, %s, 'Pending')
    """
    val = (appointment.CustomerID, appointment.VehicleID, appointment.AppointmentDate, appointment.AppointmentTime, appointment.ServiceType, appointment.Notes)

    try:
        cursor.execute(sql, val)
        connect.commit()
        msg = "Success"
        detail = "Appointment booked successfully"

    except mysql.connector.Error as e:
        connect.rollback()
        print(f"DB Error in create_appointment: {e}")
        msg = "Failed"
        detail = "ไม่สามารถสร้างนัดหมายได้"
    finally:
        cursor.close()
        connect.close()
    return {"status": msg, "message": detail}

@app.get("/appointment")
def get_appointment():
    connect = get_data_connection()
    if not connect:
        return {"status": "Failed", "message": "can not get data, Database connection error", "data": []}

    cursor = connect.cursor(dictionary = True)
    try:
        cursor.execute("SELECT * FROM Appointments")
        result = cursor.fetchall()

        for row in result:
            if 'AppointmentTime' in row and row['AppointmentTime'] is not None:
                row['AppointmentTime'] = str(row['AppointmentTime'])
            if 'AppointmentDate' in row and row['AppointmentDate'] is not None:
                row['AppointmentDate'] = str(row['AppointmentDate'])

        return {"status": "Success", "data": result}
    except mysql.connector.Error as e:
        print(f"DB Error in get_appointment: {e}")
        return {"status": "Failed", "message": "ไม่สามารถดึงข้อมูลนัดหมายได้", "data": []}
    finally:
        cursor.close()
        connect.close()
########################################################################################################
#   END Appointment
#------------------------------------------------------------------------------------------------------#
#   START Service_Job
########################################################################################################
@app.post("/service-jobs")
def create_service_job(job: ServiceJobCreate):
    connect = get_data_connection()
    if not connect:
        return {"status": "Failed", "message": "can not create service, Database connection error"}

    cursor = connect.cursor()
    sql = """
        INSERT INTO Service_Jobs (AppointmentID, MechanicName, JobStatus, TotalCost) 
        VALUES (%s, %s, %s, %s)
    """
    val = (job.AppointmentID, job.MechanicName, job.JobStatus, job.TotalCost)

    try:
        cursor.execute(sql, val)
        connect.commit()
        msg = "Success"
        detail = f"Service job assigned to {job.MechanicName} successfully"

    except mysql.connector.Error as e:
        connect.rollback()
        print(f"DB Error in create_service_job: {e}")
        msg = "Failed"
        detail = "ไม่สามารถเปิดใบงานซ่อมได้"
    finally:
        cursor.close()
        connect.close()
    return {"status": msg, "message": detail}

@app.get("/service-jobs")
def get_service_jobs():
    connect = get_data_connection()
    if not connect:
        return {"status": "Failed", "message": "can not get service, Database connection error", "data": []}

    cursor = connect.cursor(dictionary = True)
    try:
        cursor.execute("SELECT * FROM Service_Jobs")
        result = cursor.fetchall()
        return {"status": "Success", "data": result}
    except mysql.connector.Error as e:
        print(f"DB Error in get_service_jobs: {e}")
        return {"status": "Failed", "message": "ไม่สามารถดึงข้อมูลใบงานซ่อมได้", "data": []}
    finally:
        cursor.close()
        connect.close()
########################################################################################################
#   END Service_Job
#------------------------------------------------------------------------------------------------------#
#   START ServiceItem
########################################################################################################
@app.post("/service-items")
def create_service_item(item: ServiceItemCreate):
    if item.JobID is None:
        return {"status": "Failed", "message": "กรุณาระบุรหัสใบงาน (JobID)"}

    connect = get_data_connection()
    if not connect:
        return {"status": "Failed", "message": "failed to create ServiceItem, Database connection error"}

    cursor = connect.cursor()
    sql = """
        INSERT INTO Service_Items (JobID, ItemName, Quantity, UnitPrice) 
        VALUES (%s, %s, %s, %s)
    """
    val = (item.JobID, item.ItemName.strip(), item.Quantity, item.UnitPrice)

    try:
        cursor.execute(sql, val)
        connect.commit()
        msg = "Success"
        detail = f"Added item {item.ItemName} to job successfully"

    except mysql.connector.Error as e:
        connect.rollback()
        print(f"DB Error in create_service_item: {e}")
        msg = "Failed"
        detail = "ไม่สามารถเพิ่มรายการอะไหล่ได้"
    finally:
        cursor.close()
        connect.close()
    return {"status": msg, "message": detail}

@app.get("/service-items")
def get_service_items():
    connect = get_data_connection()
    if not connect:
        return {"status": "Failed", "message": "can not get service items, Database connection error", "data": []}

    cursor = connect.cursor(dictionary = True)
    try:
        cursor.execute("SELECT * FROM Service_Items")
        result = cursor.fetchall()
        return {"status": "Success", "data": result}
    except mysql.connector.Error as e:
        print(f"DB Error in get_service_items: {e}")
        return {"status": "Failed", "message": "ไม่สามารถดึงรายการอะไหล่ได้", "data": []}
    finally:
        cursor.close()
        connect.close()
########################################################################################################
#   END Service_items
#------------------------------------------------------------------------------------------------------#
#   START booking
########################################################################################################
@app.post("/bookings")
def create_booking(booking: BookingCreate, request: Request = None):
    # 1. ดักบอทด้วย Honeypot (ถ้าช่องซ่อนถูกกรอก ให้ตอบกลับทันทีโดยไม่เปลืองโควตา DB)
    if booking.Website and booking.Website.strip():
        return {"status": "Success", "message": "จองคิวสำเร็จ"}

    # 2. จำกัดอัตราการยิงต่อ IP (Rate Limiting)
    client_ip = "local"
    if request and request.client:
        forwarded = request.headers.get("x-forwarded-for")
        client_ip = forwarded.split(",")[0].strip() if forwarded else request.client.host

    now_ts = time.time()
    recent_hits = [t for t in _booking_rate_limit.get(client_ip, []) if now_ts - t < _RATE_LIMIT_WINDOW]
    if len(recent_hits) >= _RATE_LIMIT_MAX_REQ:
        return {"status": "Failed", "message": "คุณส่งคำขอจองคิวบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง"}

    # 3. ตรวจสอบความถูกต้องของข้อมูลก่อนเชื่อมต่อฐานข้อมูล
    customer_name = booking.CustomerName.strip()
    raw_phone = re.sub(r"[\s\-]", "", booking.PhoneNumber.strip())
    car_brand = booking.CarBrand.strip()
    car_model = booking.CarModel.strip()
    car_number = booking.CarNumber.strip()
    service_type = booking.ServiceType.strip()
    notes = booking.Notes.strip() if booking.Notes else None

    if len(customer_name) < 2 or len(customer_name) > 100:
        return {"status": "Failed", "message": "กรุณาระบุชื่อ-นามสกุลให้ถูกต้อง"}

    if not re.match(r"^0[2689]\d{7,8}$", raw_phone):
        return {"status": "Failed", "message": "กรุณาระบุเบอร์โทรศัพท์ไทยให้ถูกต้อง (เช่น 0812345678)"}

    if not car_model or len(car_model) > 100 or not car_number or len(car_number) > 20:
        return {"status": "Failed", "message": "กรุณาระบุรุ่นรถยนต์และทะเบียนรถให้ครบถ้วน"}

    try:
        appt_date = datetime.strptime(booking.AppointmentDate.strip(), "%Y-%m-%d").date()
        time_str = booking.AppointmentTime.strip()
        appt_time = datetime.strptime(time_str[:5], "%H:%M").time()
    except ValueError:
        return {"status": "Failed", "message": "รูปแบบวันที่หรือเวลาไม่ถูกต้อง"}

    today_bkk = datetime.now(_BANGKOK_TZ).date()
    if appt_date < today_bkk:
        return {"status": "Failed", "message": "ไม่สามารถจองคิวย้อนหลังได้ กรุณาเลือกวันที่ตั้งแต่วันนี้เป็นต้นไป"}

    connect = get_data_connection()
    if not connect:
        return {"status": "Failed", "message": "ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง"}

    cursor = connect.cursor()
    try:
        # ตรวจสอบว่ามีลูกค้าที่ใช้เบอร์โทรศัพท์นี้อยู่แล้วหรือไม่ เพื่อลดข้อมูลซ้ำซ้อน
        cursor.execute(
            "SELECT CustomerID FROM Customers WHERE PhoneNumber = %s LIMIT 1",
            (raw_phone,)
        )
        existing_customer = cursor.fetchone()
        if existing_customer:
            customer_id = existing_customer[0]
        else:
            cursor.execute(
                "INSERT INTO Customers (CustomerName, PhoneNumber) VALUES (%s, %s)",
                (customer_name, raw_phone)
            )
            customer_id = cursor.lastrowid

        # ตรวจสอบว่ารถทะเบียนนี้ของลูกค้ารายนี้มีในระบบแล้วหรือไม่
        cursor.execute(
            "SELECT VehicleID FROM Vehicles WHERE CustomerID = %s AND CarNumber = %s LIMIT 1",
            (customer_id, car_number)
        )
        existing_vehicle = cursor.fetchone()
        if existing_vehicle:
            vehicle_id = existing_vehicle[0]
        else:
            # ใช้ UUID สั้นเพื่อให้ไม่ชนกันแม้มีลูกค้ากดจองพร้อมกันในวินาทีเดียวกัน (ยาว 17 ตัวอักษร)
            temp_vincode = f"TMP-{uuid.uuid4().hex[:13].upper()}"
            cursor.execute(
                "INSERT INTO Vehicles (CustomerID, CarBrand, CarNumber, CarModel, VINCODE) VALUES (%s, %s, %s, %s, %s)",
                (customer_id, car_brand, car_number, car_model, temp_vincode)
            )
            vehicle_id = cursor.lastrowid

        # ป้องกันการกดจองซ้ำในวันและเวลาเดียวกันสำหรับรถคันเดิม
        cursor.execute(
            """
            SELECT AppointmentID FROM Appointments
            WHERE VehicleID = %s AND AppointmentDate = %s AND Status IN ('Pending', 'In Progress')
            LIMIT 1
            """,
            (vehicle_id, str(appt_date))
        )
        if cursor.fetchone():
            return {"status": "Failed", "message": "รถทะเบียนนี้มีคิวนัดหมายในวันที่เลือกไว้แล้ว"}

        cursor.execute(
            "INSERT INTO Appointments (CustomerID, VehicleID, AppointmentDate, AppointmentTime, ServiceType, Notes, Status) VALUES (%s, %s, %s, %s, %s, %s, 'Pending')",
            (customer_id, vehicle_id, str(appt_date), appt_time.strftime("%H:%M:%S"), service_type, notes)
        )
        appointment_id = cursor.lastrowid

        connect.commit()
        recent_hits.append(now_ts)
        _booking_rate_limit[client_ip] = recent_hits
        return {
            "status": "Success",
            "message": "จองคิวสำเร็จ",
            "booking_id": appointment_id,
        }

    except mysql.connector.Error as e:
        connect.rollback()
        print(f"DB Error in create_booking: {e}")
        return {"status": "Failed", "message": "เกิดข้อผิดพลาดในการบันทึกคิวซ่อม กรุณาลองใหม่อีกครั้ง"}
    finally:
        cursor.close()
        connect.close()
########################################################################################################
#   END booking
#------------------------------------------------------------------------------------------------------#
#   START get appointment
########################################################################################################
@app.get("/appointments")
def get_appointments():
    connect = get_data_connection()
    if not connect:
        return {"status": "Failed", "message": "Database connection error"}
    
    cursor = connect.cursor(dictionary=True)
    try:
        query = """
            SELECT a.AppointmentID, a.AppointmentDate, a.AppointmentTime, a.ServiceType, a.Notes, a.Status,
                   c.CustomerName, c.PhoneNumber,
                   v.CarBrand, v.CarModel, v.CarNumber
            FROM Appointments a
            JOIN Customers c ON a.CustomerID = c.CustomerID
            JOIN Vehicles v ON a.VehicleID = v.VehicleID
            ORDER BY a.AppointmentDate ASC, a.AppointmentTime ASC
        """
        cursor.execute(query)
        appointments = cursor.fetchall()

        for appt in appointments:
            appt['AppointmentDate'] = str(appt['AppointmentDate'])
            appt['AppointmentTime'] = str(appt['AppointmentTime'])
            
        return {"status": "Success", "data": appointments}
    except mysql.connector.Error as e:
        print(f"DB Error in get_appointments: {e}")
        return {"status": "Failed", "message": "ไม่สามารถดึงข้อมูลตารางนัดหมายได้"}
    finally:
        cursor.close()
        connect.close()
########################################################################################################
#   END get appointment
#------------------------------------------------------------------------------------------------------#
#   START change status
########################################################################################################
@app.put("/appointments/{appointment_id}/accept")
def accept_appointment(appointment_id: int):
    connect = get_data_connection()
    if not connect:
        return {"status": "Failed", "message": "Database connection error"}

    cursor = connect.cursor()
    try:
        # ตรวจสอบก่อนว่าคิวนี้ถูกเปิดใบงานไปแล้วหรือยัง เพื่อป้องกันการกดซ้ำ
        cursor.execute(
            "SELECT Status FROM Appointments WHERE AppointmentID = %s LIMIT 1",
            (appointment_id,)
        )
        row = cursor.fetchone()
        if not row:
            return {"status": "Failed", "message": "ไม่พบรายการนัดหมายนี้"}
        if row[0] != "Pending":
            return {"status": "Failed", "message": "รายการนัดหมายนี้ถูกรับรถเข้าซ่อมไปแล้ว"}

        cursor.execute(
            "UPDATE Appointments SET Status = 'In Progress' WHERE AppointmentID = %s",
            (appointment_id,)
        )

        cursor.execute(
            "INSERT INTO Service_Jobs (AppointmentID, MechanicName, JobStatus) VALUES (%s, %s, 'In Progress')",
            (appointment_id, 'ช่างประจำศูนย์')
        )

        connect.commit()
        return {"status": "Success", "message": "รับรถเข้าซ่อมสำเร็จ"}

    except mysql.connector.Error as e:
        connect.rollback()
        print(f"DB Error in accept_appointment: {e}")
        return {"status": "Failed", "message": "ไม่สามารถอัปเดตสถานะการรับรถได้"}
    finally:
        cursor.close()
        connect.close()
########################################################################################################
#   END change status
#------------------------------------------------------------------------------------------------------#
#   START get jobs
########################################################################################################
@app.get("/jobs")
def get_jobs():
    connect = get_data_connection()
    if not connect:
        return {"status": "Failed", "message": "Database connection error"}

    cursor = connect.cursor(dictionary=True)
    try:
        query = """
            SELECT j.JobID, j.MechanicName, j.JobStatus, j.TotalCost,
                   v.CarBrand, v.CarModel, v.CarNumber, c.CustomerName
            FROM Service_Jobs j
            JOIN Appointments a ON j.AppointmentID = a.AppointmentID
            JOIN Vehicles v ON a.VehicleID = v.VehicleID
            JOIN Customers c ON a.CustomerID = c.CustomerID
            ORDER BY j.JobID DESC
        """
        cursor.execute(query)
        return {"status": "Success", "data": cursor.fetchall()}
    except mysql.connector.Error as e:
        print(f"DB Error in get_jobs: {e}")
        return {"status": "Failed", "message": "ไม่สามารถดึงข้อมูลใบงานซ่อมได้", "data": []}
    finally:
        cursor.close()
        connect.close()

@app.post("/jobs/{job_id}/items")
def add_job_item(job_id: int, item: ServiceItemCreate):
    connect = get_data_connection()
    if not connect:
        return {"status": "Failed", "message": "Database connection error"}

    cursor = connect.cursor()
    try:
        cursor.execute(
            "SELECT JobStatus FROM Service_Jobs WHERE JobID = %s LIMIT 1",
            (job_id,)
        )
        job_row = cursor.fetchone()
        if not job_row:
            return {"status": "Failed", "message": "ไม่พบใบงานซ่อมนี้"}
        if job_row[0] == "Completed":
            return {"status": "Failed", "message": "ใบงานซ่อมนี้ปิดงานแล้ว ไม่สามารถเพิ่มรายการได้"}

        cursor.execute(
            "INSERT INTO Service_Items (JobID, ItemName, Quantity, UnitPrice) VALUES (%s, %s, %s, %s)",
            (job_id, item.ItemName.strip(), item.Quantity, item.UnitPrice)
        )
        cursor.execute(
            "UPDATE Service_Jobs SET TotalCost = TotalCost + %s WHERE JobID = %s",
            (item.Quantity * item.UnitPrice, job_id)
        )

        connect.commit()
        return {"status": "Success", "message": "เพิ่มรายการอะไหล่สำเร็จ"}

    except mysql.connector.Error as e:
        connect.rollback()
        print(f"DB Error in add_job_item: {e}")
        return {"status": "Failed", "message": "ไม่สามารถบันทึกค่าอะไหล่ได้"}
    finally:
        cursor.close()
        connect.close()
########################################################################################################
#   END get jobs
#------------------------------------------------------------------------------------------------------#
#   START get receipt
########################################################################################################
@app.get("/jobs/{job_id}/receipt")
def get_job_receipt(job_id: int):
    connect = get_data_connection()
    if not connect:
        return {"status": "Failed", "message": "Database connection error"}
    
    cursor = connect.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT j.JobID, j.TotalCost, 
                   v.CarBrand, v.CarModel, v.CarNumber,
                   c.CustomerName, c.PhoneNumber
            FROM Service_Jobs j
            JOIN Appointments a ON j.AppointmentID = a.AppointmentID
            JOIN Vehicles v ON a.VehicleID = v.VehicleID
            JOIN Customers c ON a.CustomerID = c.CustomerID
            WHERE j.JobID = %s
        """, (job_id,))
        job_info = cursor.fetchone()

        cursor.execute("SELECT ItemName, Quantity, UnitPrice FROM Service_Items WHERE JobID = %s", (job_id,))
        items = cursor.fetchall()

        if not job_info:
            return {"status": "Failed", "message": "ไม่พบข้อมูลใบงาน"}

        return {"status": "Success", "job_info": job_info, "items": items}
    except mysql.connector.Error as e:
        print(f"DB Error in get_job_receipt: {e}")
        return {"status": "Failed", "message": "ไม่สามารถดึงข้อมูลใบเสร็จได้"}
    finally:
        cursor.close()
        connect.close()
########################################################################################################
#   END get receipt
#------------------------------------------------------------------------------------------------------#
#   START complete
########################################################################################################
@app.put("/jobs/{job_id}/complete")
def complete_job(job_id: int):
    connect = get_data_connection()
    if not connect:
        return {"status": "Failed", "message": "Database connection error"}
    
    cursor = connect.cursor()
    try:
        # อัปเดตสถานะใบงานเป็น Completed และซิงก์สถานะนัดหมายให้เป็น Completed ด้วย
        cursor.execute(
            "SELECT AppointmentID FROM Service_Jobs WHERE JobID = %s LIMIT 1",
            (job_id,)
        )
        row = cursor.fetchone()
        if not row:
            return {"status": "Failed", "message": "ไม่พบใบงานซ่อมนี้"}

        cursor.execute(
            "UPDATE Service_Jobs SET JobStatus = 'Completed' WHERE JobID = %s",
            (job_id,)
        )
        cursor.execute(
            "UPDATE Appointments SET Status = 'Completed' WHERE AppointmentID = %s",
            (row[0],)
        )
        connect.commit()
        return {"status": "Success", "message": "ปิดงานซ่อมเรียบร้อยแล้ว"}
    except mysql.connector.Error as e:
        connect.rollback()
        print(f"DB Error in complete_job: {e}")
        return {"status": "Failed", "message": "ไม่สามารถปิดงานซ่อมได้"}
    finally:
        cursor.close()
        connect.close()
