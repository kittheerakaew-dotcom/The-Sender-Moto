import mysql.connector
from mysql.connector import Error
import os
import time
from dotenv import load_dotenv

load_dotenv()

# เก็บ Connection ไว้ใช้ซ้ำใน Serverless เพื่อลดการเปิด Connection ใหม่ทุกครั้ง
_cached_connection = None


class _ReusableConnection:
    """ห่อหุ้ม Connection เพื่อให้โค้ดเดิมที่เรียก connect.close() ไม่ตัดการเชื่อมต่อจริง แต่คืนค่ากลับมาใช้ซ้ำได้"""
    def __init__(self, conn):
        self._conn = conn

    def __getattr__(self, name):
        return getattr(self._conn, name)

    def close(self):
        # เคลียร์ Transaction ที่อาจค้างอยู่ แต่เก็บ TCP Connection ไว้ใช้ซ้ำในรอบถัดไป
        try:
            if self._conn and self._conn.is_connected() and self._conn.in_transaction:
                self._conn.rollback()
        except Error:
            pass


def _create_raw_connection():
    host        =os.getenv("DB_HOST", "127.0.0.1")
    port        =int(os.getenv("DB_PORT", "3306"))
    user        =os.getenv("DB_USER")
    password    =os.getenv("DB_PASSWORD")
    database    =os.getenv("DB_NAME")
    ssl_ca      =os.getenv("DB_SSL_CA")
    ssl_req     =os.getenv("DB_SSL_REQUIRED", "").lower() in ("1", "true", "yes")

    connect_kwargs = {
        "host":                 host,
        "port":                 port,
        "user":                 user,
        "password":             password,
        "database":             database,
        "connection_timeout":   8,
        "charset":              "utf8mb4",
        "use_unicode":          True,
    }

    # เปิดใช้ TLS อัตโนมัติเมื่อต่อกับ TiDB Cloud หรือเมื่อกำหนดค่า SSL ใน .env
    if ssl_ca:
        connect_kwargs["ssl_ca"] = ssl_ca
        connect_kwargs["ssl_verify_identity"] = True
    elif ssl_req or (host and "tidbcloud.com" in host):
        connect_kwargs["ssl_disabled"] = False
    else:
        connect_kwargs["ssl_disabled"] = True

    return mysql.connector.connect(**connect_kwargs)


def get_data_connection():
    global _cached_connection

    current_db = os.getenv("DB_NAME")

    # 1. ลองใช้ Connection เดิมถ้ายังเปิดอยู่และชี้ไปที่ฐานข้อมูลเดียวกัน
    if _cached_connection is not None:
        try:
            _cached_connection.ping(reconnect=True, attempts=2, delay=1)
            if _cached_connection.database != current_db and current_db:
                _cached_connection.database = current_db
            return _ReusableConnection(_cached_connection)
        except Error:
            try:
                _cached_connection.close()
            except Exception:
                pass
            _cached_connection = None

    # 2. สร้าง Connection ใหม่ พร้อมลองใหม่อีก 1 ครั้งหากเกิด Cold Start
    for attempt in range(2):
        try:
            _cached_connection = _create_raw_connection()
            return _ReusableConnection(_cached_connection)
        except Error as e:
            print(f"Error: {e}")
            _cached_connection = None
            if attempt == 0:
                time.sleep(0.5)

    return None
