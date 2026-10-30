"""
สคริปต์ทดสอบระบบจองคิว การป้องกันการจองซ้ำ (Slot Capacity & FOR UPDATE Lock)
การค้นหา/เลื่อน/ยกเลิกคิวด้วยตนเอง และสถานะงานซ่อม (Phase C Verification)
รันบนฐานข้อมูลจำลองชั่วคราว (eurocarcare_test) โดยไม่กระทบฐานข้อมูลจริง
"""
import os
import sys
import mysql.connector
from dotenv import load_dotenv
from starlette.requests import Request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

os.environ["DB_NAME"] = "eurocarcare_test"
os.environ["ADMIN_USERNAME"] = "admin"
os.environ["ADMIN_PASSWORD"] = "TestSecretPass123!"
os.environ["ADMIN_SESSION_SECRET"] = "test_secret_key_for_phase_c_verification_123456"

import database
import schemas
import main


def make_dummy_request(ip: str = "127.0.0.1") -> Request:
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/bookings",
        "headers": [],
        "client": (ip, 12345),
    }
    return Request(scope)


def run_tests():
    root_conn = mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
    )
    root_cur = root_conn.cursor()
    root_cur.execute("DROP DATABASE IF EXISTS eurocarcare_test")

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    with open(os.path.join(base_dir, "Car.sql"), "r", encoding="utf-8") as f:
        sql_text = (
            f.read()
            .replace("CREATE DATABASE IF NOT EXISTS TheSenderMoto", "CREATE DATABASE IF NOT EXISTS eurocarcare_test")
            .replace("USE TheSenderMoto;", "USE eurocarcare_test;")
        )
    for stmt in sql_text.split(";"):
        if stmt.strip():
            root_cur.execute(stmt)
    root_conn.commit()

    # ทดสอบรัน migration 002 ซ้ำเพื่อยืนยัน Idempotency (รองรับทั้ง TiDB และ MySQL 8)
    with open(os.path.join(base_dir, "migrations", "002_phase_c_booking_flow.sql"), "r", encoding="utf-8") as f:
        mig_text = f.read().replace("USE eurocarcare;", "USE eurocarcare_test;")
    for stmt in mig_text.split(";"):
        clean_stmt = stmt.strip()
        if clean_stmt:
            try:
                root_cur.execute(clean_stmt)
            except mysql.connector.Error:
                fallback_stmt = clean_stmt.replace("ADD COLUMN IF NOT EXISTS ", "ADD COLUMN ").replace(
                    "CREATE UNIQUE INDEX IF NOT EXISTS ", "CREATE UNIQUE INDEX "
                )
                try:
                    root_cur.execute(fallback_stmt)
                except mysql.connector.Error as inner_err:
                    if inner_err.errno not in (1060, 1061):
                        raise
    root_conn.commit()

    try:
        # 1. จองคิวคันที่ 1 ในช่วงเวลา 2026-11-05 10:00
        req1 = schemas.BookingCreate(
            CustomerName="สมชาย ใจดี",
            PhoneNumber="081-234-5678",
            LineID="@somchai",
            Email="somchai@example.com",
            CarBrand="BMW",
            CarModel="320d",
            CarYear=2022,
            CarNumber="1กข-1234",
            ServiceType="General Maintenance",
            Mileage=45000,
            AppointmentDate="2026-11-05",
            AppointmentTime="10:00",
            Notes="เช็กระยะตามกำหนด",
            PhotoURL="data:image/jpeg;base64,/9j/4AAQ",
            ConsentPDPA=True,
            Website="",
        )
        res1 = main.create_booking(req1, make_dummy_request("10.0.0.1"))
        assert res1["status"] == "Success", res1
        ref1 = res1["booking_ref"]
        assert ref1.startswith("SM-261105-"), f"Invalid BookingRef: {ref1}"
        assert res1["estimated_minutes"] == 90

        # 2. จองคิวคันที่ 2 ในช่วงเวลาเดียวกัน (2026-11-05 10:00) -> สำเร็จ (Capacity = 2)
        req2 = schemas.BookingCreate(
            CustomerName="วิชัย รักรถ",
            PhoneNumber="089-876-5432",
            CarBrand="Porsche",
            CarModel="Cayenne",
            CarYear=2023,
            CarNumber="9ฮฮ 9999",
            ServiceType="Engine Repair",
            Mileage=12000,
            AppointmentDate="2026-11-05",
            AppointmentTime="10:00",
            ConsentPDPA=True,
            Website="",
        )
        res2 = main.create_booking(req2, make_dummy_request("10.0.0.2"))
        assert res2["status"] == "Success", res2
        ref2 = res2["booking_ref"]
        assert ref2.startswith("SM-261105-")
        assert res2["estimated_minutes"] == 240

        # 3. จองคิวคันที่ 3 ในช่วงเวลาเดียวกัน (2026-11-05 10:00) -> ต้องถูกบล็อกเพราะคิวเต็ม
        req3 = schemas.BookingCreate(
            CustomerName="มานะ อดทน",
            PhoneNumber="082-111-2222",
            CarBrand="Audi",
            CarModel="A4",
            CarNumber="2ขค 5678",
            ServiceType="Diagnostics",
            AppointmentDate="2026-11-05",
            AppointmentTime="10:00",
            ConsentPDPA=True,
            Website="",
        )
        res3 = main.create_booking(req3, make_dummy_request("10.0.0.3"))
        assert res3["status"] == "Failed" and "เต็มแล้ว" in res3["message"], res3

        # 4. ตรวจสอบจำนวนคิวว่างผ่าน get_slot_availability
        avail = main.get_slot_availability("2026-11-05")
        assert avail["status"] == "Success"
        assert avail["booked_slots"].get("10:00") == 2, avail

        # 5. ทดสอบลูกค้าค้นหาคิว / เลื่อนนัด / ยกเลิกนัดด้วยตนเอง
        looked = main.lookup_booking(
            schemas.BookingLookupRequest(BookingRef=ref1, PhoneNumber="0812345678"),
            make_dummy_request("10.0.0.1"),
        )
        assert looked["status"] == "Success" and looked["data"]["BookingRef"] == ref1, looked

        resched = main.reschedule_booking(
            schemas.BookingRescheduleRequest(
                BookingRef=ref1,
                PhoneNumber="0812345678",
                AppointmentDate="2026-11-06",
                AppointmentTime="13:00",
            ),
            make_dummy_request("10.0.0.1"),
        )
        assert resched["status"] == "Success", resched

        canceled = main.cancel_booking_by_customer(
            schemas.BookingLookupRequest(BookingRef=ref1, PhoneNumber="0812345678"),
            make_dummy_request("10.0.0.1"),
        )
        assert canceled["status"] == "Success", canceled

        # 6. ทดสอบการอัปเดตสถานะและบันทึกภายในของแอดมิน (Appointments & Service_Jobs)
        appts = main.get_appointments()["data"]
        appt2 = [a for a in appts if a["BookingRef"] == ref2][0]
        appt2_id = appt2["AppointmentID"]

        upd_appt = main.update_appointment_status(
            schemas.StatusUpdateRequest(Status="Confirmed", InternalNotes="เตรียมอะไหล่แท้ Porsche"),
            appointment_id=appt2_id,
        )
        assert upd_appt["status"] == "Success", upd_appt

        acc = main.accept_appointment(appointment_id=appt2_id)
        assert acc["status"] == "Success", acc

        jobs = main.get_jobs()["data"]
        job_id = jobs[0]["JobID"]

        upd_job = main.update_job_status(
            schemas.StatusUpdateRequest(Status="Ready", InternalNotes="ซ่อมเสร็จพร้อมส่งมอบ"),
            job_id=job_id,
        )
        assert upd_job["status"] == "Success", upd_job

        print("ALL PHASE C TESTS PASSED SUCCESSFULLY!")
    finally:
        if database._cached_connection:
            try:
                database._cached_connection.close()
            except Exception:
                pass
            database._cached_connection = None
        root_cur.execute("DROP DATABASE IF EXISTS eurocarcare_test")
        root_conn.commit()
        root_cur.close()
        root_conn.close()


if __name__ == "__main__":
    run_tests()
