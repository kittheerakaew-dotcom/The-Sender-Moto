from fastapi import FastAPI, Request, Path
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import mysql.connector
from database import get_data_connection
from schemas import (
    CustomerCreate,
    VehicleCreate,
    AppointmentCreate,
    ServiceJobCreate,
    ServiceItemCreate,
    BookingCreate,
    AdminLoginRequest,
)
import time
import os
import uuid
import hmac
import hashlib
import base64
import json

_IS_PROD = (
    os.getenv("APP_ENV", "development").lower() == "production"
    or os.getenv("VERCEL_ENV", "").lower() == "production"
)

# ปิด /docs, /redoc, /openapi.json อัตโนมัติเมื่อรันบน Production
app = FastAPI(
    title="The Sender Moto API",
    docs_url=None if _IS_PROD else "/docs",
    redoc_url=None if _IS_PROD else "/redoc",
    openapi_url=None if _IS_PROD else "/openapi.json",
)

from fastapi.middleware.cors import CORSMiddleware

# อ่านรายการ Origin ที่อนุญาตจาก .env และห้ามใช้ "*" ร่วมกับ Cookie เด็ดขาด
_allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
    if origin.strip() and origin.strip() != "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Content-Type", "X-Admin-Key", "Authorization"],
)

_SESSION_COOKIE_NAME = "sender_admin_session"
_SESSION_TTL_SECONDS = 8 * 3600  # อายุเซสชัน 8 ชั่วโมง


def _get_session_secret() -> bytes:
    secret = (
        os.getenv("ADMIN_SESSION_SECRET", "").strip()
        or os.getenv("ADMIN_PASSWORD_HASH", "").strip()
        or os.getenv("ADMIN_API_KEY", "").strip()
        or "dev-local-only-secret-change-in-env"
    )
    return secret.encode("utf-8")


def _create_session_token() -> str:
    payload = {"role": "admin", "exp": int(time.time()) + _SESSION_TTL_SECONDS}
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8").rstrip("=")
    sig = hmac.new(_get_session_secret(), payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{sig}"


def _verify_session_token(token: str) -> bool:
    if not token or "." not in token:
        return False
    try:
        payload_b64, sig = token.split(".", 1)
        expected_sig = hmac.new(_get_session_secret(), payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return False
        padding = "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64 + padding).decode("utf-8"))
        return payload.get("role") == "admin" and int(payload.get("exp", 0)) > int(time.time())
    except Exception:
        return False


def _verify_password(plain_password: str) -> bool:
    pwd_hash = os.getenv("ADMIN_PASSWORD_HASH", "").strip()
    admin_key = os.getenv("ADMIN_API_KEY", "").strip()

    # 1. ตรวจสอบกับรหัสผ่านที่เข้ารหัสแบบ scrypt (scrypt$N$r$p$salt$hash)
    if pwd_hash.startswith("scrypt$"):
        try:
            _, n_s, r_s, p_s, salt_hex, digest_hex = pwd_hash.split("$")
            derived = hashlib.scrypt(
                plain_password.encode("utf-8"),
                salt=bytes.fromhex(salt_hex),
                n=int(n_s),
                r=int(r_s),
                p=int(p_s),
                dklen=len(bytes.fromhex(digest_hex)),
            )
            if hmac.compare_digest(derived.hex(), digest_hex):
                return True
        except Exception:
            return False

    # 2. รองรับ ADMIN_API_KEY สำหรับความเข้ากันได้ย้อนหลัง
    if admin_key and hmac.compare_digest(plain_password, admin_key):
        return True

    return False


def _is_admin_auth_configured() -> bool:
    return bool(
        os.getenv("ADMIN_PASSWORD_HASH", "").strip()
        or os.getenv("ADMIN_API_KEY", "").strip()
        or _IS_PROD
    )


def _is_request_authorized(request: Request) -> bool:
    if not _is_admin_auth_configured():
        return True

    # 1. ตรวจจาก HttpOnly Session Cookie
    cookie_token = request.cookies.get(_SESSION_COOKIE_NAME, "").strip()
    if cookie_token and _verify_session_token(cookie_token):
        return True

    # 2. ตรวจจาก Header X-Admin-Key (รองรับทั้ง Session Token และรหัสผ่านเมื่อเรียกข้ามพอร์ตตอนพัฒนา)
    header_token = request.headers.get("X-Admin-Key", "").strip()
    if header_token:
        if _verify_session_token(header_token) or _verify_password(header_token):
            return True

    return False


def _hash_client_ip(request: Request | None) -> str:
    raw_ip = "local"
    if request and request.client:
        forwarded = request.headers.get("x-forwarded-for")
        raw_ip = forwarded.split(",")[0].strip() if forwarded else request.client.host
    # แฮช IP ก่อนเก็บลงฐานข้อมูลเพื่อไม่เก็บข้อมูลส่วนบุคคล (PDPA)
    return hashlib.sha256(f"sender-moto-rate:{raw_ip}".encode("utf-8")).hexdigest()[:32]


def _check_serverless_rate_limit(cursor, connect, scope: str, ip_hash: str, max_hits: int, window_sec: int) -> bool:
    """ตรวจสอบและเพิ่มจำนวนครั้งการเรียกในตาราง Rate_Limits (รองรับ Serverless 100%)"""
    rate_key = f"{scope}:{ip_hash}"
    now_ts = int(time.time())
    try:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS Rate_Limits (
                RateKey VARCHAR(100) PRIMARY KEY,
                HitCount INT NOT NULL DEFAULT 1,
                WindowStart BIGINT NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """
        )
        cursor.execute("SELECT HitCount, WindowStart FROM Rate_Limits WHERE RateKey = %s LIMIT 1", (rate_key,))
        row = cursor.fetchone()
        if not row:
            cursor.execute(
                "INSERT INTO Rate_Limits (RateKey, HitCount, WindowStart) VALUES (%s, 1, %s)",
                (rate_key, now_ts),
            )
            connect.commit()
            return True

        hit_count, window_start = int(row[0]), int(row[1])
        if now_ts - window_start >= window_sec:
            cursor.execute(
                "UPDATE Rate_Limits SET HitCount = 1, WindowStart = %s WHERE RateKey = %s",
                (now_ts, rate_key),
            )
            connect.commit()
            return True

        if hit_count >= max_hits:
            return False

        cursor.execute(
            "UPDATE Rate_Limits SET HitCount = HitCount + 1 WHERE RateKey = %s",
            (rate_key,),
        )
        connect.commit()
        return True
    except mysql.connector.Error:
        return True


def _log_db_error(context: str, err: mysql.connector.Error):
    # บันทึกเฉพาะรหัสข้อผิดพลาดของฐานข้อมูลโดยไม่พิมพ์ข้อมูลส่วนบุคคลของลูกค้าลง Log
    errno = getattr(err, "errno", "unknown")
    sqlstate = getattr(err, "sqlstate", "unknown")
    print(f"DB Error in {context}: errno={errno} sqlstate={sqlstate}")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    msg = "ข้อมูลที่กรอกไม่ถูกต้องหรือมีฟิลด์ที่ไม่อนุญาต กรุณาตรวจสอบอีกครั้ง"
    for err in exc.errors():
        raw_msg = str(err.get("msg", ""))
        if "Value error," in raw_msg:
            msg = raw_msg.split("Value error,", 1)[1].strip()
            break
        if err.get("type") == "extra_forbidden":
            msg = "ไม่อนุญาตให้ส่งฟิลด์ข้อมูลเพิ่มเติมที่ระบบไม่ได้กำหนด"
            break
    return JSONResponse(
        status_code=422,
        content={"status": "Failed", "message": msg},
    )


@app.middleware("http")
async def api_prefix_and_security_middleware(request: Request, call_next):
    # รองรับทั้งการเรียกผ่าน /api/... บน Vercel และการเรียกตรงในเครื่อง
    path = request.scope.get("path", "")
    if path == "/api":
        request.scope["path"] = "/"
    elif path.startswith("/api/"):
        request.scope["path"] = path[4:]

    normalized_path = request.scope.get("path", "")

    is_public_route = (
        request.method == "OPTIONS"
        or normalized_path in ("/", "/health", "/admin/login", "/admin/logout")
        or (normalized_path == "/bookings" and request.method == "POST")
    )

    if not is_public_route and not _is_request_authorized(request):
        response = JSONResponse(
            status_code=401,
            content={"status": "Failed", "message": "กรุณาเข้าสู่ระบบสำหรับผู้ดูแลระบบ (Unauthorized)"},
        )
    else:
        response = await call_next(request)

    # เพิ่ม Security Headers ในทุกการตอบกลับของ API
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/")
def check_connection():
    connect = get_data_connection()
    if connect and connect.is_connected():
        connect.close()
        return {"status": "Success", "message": "connected database"}
    return {"status": "Failed", "message": "failed to connect database"}


@app.get("/health")
def health_check():
    connect = get_data_connection()
    if connect and connect.is_connected():
        connect.close()
        return {"status": "Success", "message": "ok"}
    return JSONResponse(status_code=503, content={"status": "Failed", "message": "database unavailable"})


@app.post("/admin/login")
def admin_login(credentials: AdminLoginRequest, request: Request):
    if not _is_admin_auth_configured():
        token = _create_session_token()
        res = JSONResponse(content={"status": "Success", "message": "เข้าสู่ระบบสำเร็จ", "session_token": token})
        res.set_cookie(
            key=_SESSION_COOKIE_NAME,
            value=token,
            httponly=True,
            secure=_IS_PROD,
            samesite="lax",
            max_age=_SESSION_TTL_SECONDS,
            path="/",
        )
        return res

    connect = get_data_connection()
    if connect:
        cursor = connect.cursor()
        try:
            ip_hash = _hash_client_ip(request)
            # จำกัดการเดารหัสผ่านผิดไม่เกิน 5 ครั้งใน 15 นาทีต่อ IP
            if not _check_serverless_rate_limit(cursor, connect, "admin_login", ip_hash, max_hits=5, window_sec=900):
                return JSONResponse(
                    status_code=429,
                    content={"status": "Failed", "message": "คุณลองรหัสผ่านผิดเกินกำหนด กรุณารอ 15 นาทีแล้วลองใหม่"},
                )
        finally:
            cursor.close()
            connect.close()

    if not _verify_password(credentials.Password):
        return JSONResponse(
            status_code=401,
            content={"status": "Failed", "message": "รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง"},
        )

    token = _create_session_token()
    response = JSONResponse(
        content={"status": "Success", "message": "เข้าสู่ระบบผู้ดูแลระบบสำเร็จ", "session_token": token}
    )
    response.set_cookie(
        key=_SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=_IS_PROD,
        samesite="lax",
        max_age=_SESSION_TTL_SECONDS,
        path="/",
    )
    return response


@app.post("/admin/logout")
def admin_logout():
    response = JSONResponse(content={"status": "Success", "message": "ออกจากระบบเรียบร้อยแล้ว"})
    response.delete_cookie(key=_SESSION_COOKIE_NAME, path="/")
    return response


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
        _log_db_error("get_customers", e)
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
    val = (customer.CustomerName, customer.Address, customer.PhoneNumber, customer.Email, customer.CustomerTier)

    try:
        cursor.execute(sql, val)
        connect.commit()
        return {"status": "Success", "message": "บันทึกข้อมูลลูกค้าสำเร็จ"}
    except mysql.connector.Error as e:
        connect.rollback()
        _log_db_error("create_customer", e)
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
        detail = "บันทึกข้อมูลรถยนต์สำเร็จ"
    except mysql.connector.Error as e:
        connect.rollback()
        _log_db_error("create_vehicle", e)
        msg = "Failed"
        detail = "ไม่สามารถเพิ่มข้อมูลรถยนต์ได้ (รหัสตัวถังอาจซ้ำในระบบ)"
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
        _log_db_error("get_vehivles", e)
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
        _log_db_error("create_appointment", e)
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
        _log_db_error("get_appointment", e)
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
        detail = "เปิดใบงานซ่อมสำเร็จ"

    except mysql.connector.Error as e:
        connect.rollback()
        _log_db_error("create_service_job", e)
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
        _log_db_error("get_service_jobs", e)
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
    val = (item.JobID, item.ItemName, item.Quantity, item.UnitPrice)

    try:
        cursor.execute(sql, val)
        connect.commit()
        msg = "Success"
        detail = "เพิ่มรายการอะไหล่สำเร็จ"

    except mysql.connector.Error as e:
        connect.rollback()
        _log_db_error("create_service_item", e)
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
        _log_db_error("get_service_items", e)
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

    connect = get_data_connection()
    if not connect:
        return {"status": "Failed", "message": "ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง"}

    cursor = connect.cursor()
    try:
        # 2. จำกัดอัตราการยิงต่อ IP ผ่านตาราง Rate_Limits ในฐานข้อมูล (รองรับ Serverless 100%)
        ip_hash = _hash_client_ip(request)
        if not _check_serverless_rate_limit(cursor, connect, "booking", ip_hash, max_hits=5, window_sec=600):
            return {"status": "Failed", "message": "คุณส่งคำขอจองคิวบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง"}

        # 3. ตรวจสอบว่ามีลูกค้าที่ใช้เบอร์โทรศัพท์นี้อยู่แล้วหรือไม่ เพื่อลดข้อมูลซ้ำซ้อน
        cursor.execute(
            "SELECT CustomerID FROM Customers WHERE PhoneNumber = %s LIMIT 1",
            (booking.PhoneNumber,)
        )
        existing_customer = cursor.fetchone()
        if existing_customer:
            customer_id = existing_customer[0]
        else:
            cursor.execute(
                "INSERT INTO Customers (CustomerName, PhoneNumber) VALUES (%s, %s)",
                (booking.CustomerName, booking.PhoneNumber)
            )
            customer_id = cursor.lastrowid

        # 4. ตรวจสอบว่ารถทะเบียนนี้ของลูกค้ารายนี้มีในระบบแล้วหรือไม่
        cursor.execute(
            "SELECT VehicleID FROM Vehicles WHERE CustomerID = %s AND CarNumber = %s LIMIT 1",
            (customer_id, booking.CarNumber)
        )
        existing_vehicle = cursor.fetchone()
        if existing_vehicle:
            vehicle_id = existing_vehicle[0]
        else:
            # ใช้ UUID สั้นเพื่อให้ไม่ชนกันแม้มีลูกค้ากดจองพร้อมกันในวินาทีเดียวกัน (ยาว 17 ตัวอักษร)
            temp_vincode = f"TMP-{uuid.uuid4().hex[:13].upper()}"
            cursor.execute(
                "INSERT INTO Vehicles (CustomerID, CarBrand, CarNumber, CarModel, VINCODE) VALUES (%s, %s, %s, %s, %s)",
                (customer_id, booking.CarBrand, booking.CarNumber, booking.CarModel, temp_vincode)
            )
            vehicle_id = cursor.lastrowid

        # 5. ป้องกันการกดจองซ้ำในวันเดียวกันสำหรับรถคันเดิม
        cursor.execute(
            """
            SELECT AppointmentID FROM Appointments
            WHERE VehicleID = %s AND AppointmentDate = %s AND Status IN ('Pending', 'Confirmed', 'In Progress')
            LIMIT 1
            """,
            (vehicle_id, booking.AppointmentDate)
        )
        if cursor.fetchone():
            return {"status": "Failed", "message": "รถทะเบียนนี้มีคิวนัดหมายในวันที่เลือกไว้แล้ว"}

        cursor.execute(
            "INSERT INTO Appointments (CustomerID, VehicleID, AppointmentDate, AppointmentTime, ServiceType, Notes, Status) VALUES (%s, %s, %s, %s, %s, %s, 'Pending')",
            (customer_id, vehicle_id, booking.AppointmentDate, f"{booking.AppointmentTime}:00", booking.ServiceType, booking.Notes)
        )
        appointment_id = cursor.lastrowid

        connect.commit()
        return {
            "status": "Success",
            "message": "จองคิวสำเร็จ",
            "booking_id": appointment_id,
        }

    except mysql.connector.Error as e:
        connect.rollback()
        _log_db_error("create_booking", e)
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
        _log_db_error("get_appointments", e)
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
def accept_appointment(appointment_id: int = Path(..., gt=0)):
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
        _log_db_error("accept_appointment", e)
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
        _log_db_error("get_jobs", e)
        return {"status": "Failed", "message": "ไม่สามารถดึงข้อมูลใบงานซ่อมได้", "data": []}
    finally:
        cursor.close()
        connect.close()

@app.post("/jobs/{job_id}/items")
def add_job_item(item: ServiceItemCreate, job_id: int = Path(..., gt=0)):
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
            (job_id, item.ItemName, item.Quantity, item.UnitPrice)
        )
        cursor.execute(
            "UPDATE Service_Jobs SET TotalCost = TotalCost + %s WHERE JobID = %s",
            (item.Quantity * item.UnitPrice, job_id)
        )

        connect.commit()
        return {"status": "Success", "message": "เพิ่มรายการอะไหล่สำเร็จ"}

    except mysql.connector.Error as e:
        connect.rollback()
        _log_db_error("add_job_item", e)
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
def get_job_receipt(job_id: int = Path(..., gt=0)):
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
        _log_db_error("get_job_receipt", e)
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
def complete_job(job_id: int = Path(..., gt=0)):
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
        _log_db_error("complete_job", e)
        return {"status": "Failed", "message": "ไม่สามารถปิดงานซ่อมได้"}
    finally:
        cursor.close()
        connect.close()
