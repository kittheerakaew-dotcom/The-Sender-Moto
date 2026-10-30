"""
สคริปต์สำรองและกู้คืนฐานข้อมูล (Backup & Restore) สำหรับ The Sender Moto
รองรับทั้ง MySQL ในเครื่อง และ TiDB Cloud Starter (ผ่าน mysqldump / mysql CLI)

วิธีใช้งาน (ภาษาไทย):
1. สำรองข้อมูล (Backup):
   python backup_restore.py backup
   -> ระบบจะสร้างไฟล์สำรองในโฟลเดอร์ backups/ เช่น backups/the_sender_moto_20261031_023000.sql

2. กู้คืนข้อมูล (Restore) ไปยังฐานข้อมูลที่ตั้งไว้ใน .env:
   python backup_restore.py restore backups/the_sender_moto_20261031_023000.sql

หมายเหตุสำหรับผู้ใช้ Windows:
- ต้องมีโปรแกรม mysqldump และ mysql อยู่ใน PATH (ปกติจะอยู่ใน C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin)
- สคริปต์นี้ส่งรหัสผ่านผ่านตัวแปรสภาพแวดล้อม MYSQL_PWD ชั่วคราว เพื่อไม่ให้รหัสผ่านหลุดไปแสดงในประวัติคำสั่ง (Command Line)
"""

import os
import sys
import shutil
import subprocess
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()


def _find_binary(name: str) -> str:
    path = shutil.which(name)
    if path:
        return path
    # ค้นหาในโฟลเดอร์มาตรฐานของ MySQL บน Windows
    common_dirs = [
        r"C:\Program Files\MySQL\MySQL Server 8.0\bin",
        r"C:\Program Files\MySQL\MySQL Server 8.4\bin",
        r"C:\xampp\mysql\bin",
    ]
    for d in common_dirs:
        candidate = os.path.join(d, f"{name}.exe")
        if os.path.exists(candidate):
            return candidate
    return name


def run_backup():
    host = os.getenv("DB_HOST", "127.0.0.1")
    port = os.getenv("DB_PORT", "3306")
    user = os.getenv("DB_USER", "root")
    password = os.getenv("DB_PASSWORD", "")
    db_name = os.getenv("DB_NAME", "EuroCarcare")
    ssl_ca = os.getenv("DB_SSL_CA", "")

    os.makedirs("backups", exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = os.path.join("backups", f"the_sender_moto_{timestamp}.sql")

    mysqldump_bin = _find_binary("mysqldump")
    cmd = [
        mysqldump_bin,
        f"--host={host}",
        f"--port={port}",
        f"--user={user}",
        "--single-transaction",
        "--skip-lock-tables",
        "--set-gtid-purged=OFF",
        "--default-character-set=utf8mb4",
    ]
    if ssl_ca:
        cmd.extend([f"--ssl-ca={ssl_ca}", "--ssl-mode=VERIFY_IDENTITY"])
    elif "tidbcloud.com" in host:
        cmd.append("--ssl-mode=REQUIRED")

    cmd.append(db_name)

    env = os.environ.copy()
    if password:
        env["MYSQL_PWD"] = password

    print(f"กำลังสำรองฐานข้อมูล '{db_name}' จาก {host}:{port} ...")
    with open(output_file, "w", encoding="utf-8") as f:
        result = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE, text=True, env=env)

    if result.returncode != 0:
        print("เกิดข้อผิดพลาดในการสำรองข้อมูล:", result.stderr)
        sys.exit(1)

    print(f"สำรองข้อมูลสำเร็จ! บันทึกไฟล์ไว้ที่: {output_file}")


def run_restore(sql_file: str):
    if not os.path.exists(sql_file):
        print(f"ไม่พบไฟล์สำรองข้อมูล: {sql_file}")
        sys.exit(1)

    host = os.getenv("DB_HOST", "127.0.0.1")
    port = os.getenv("DB_PORT", "3306")
    user = os.getenv("DB_USER", "root")
    password = os.getenv("DB_PASSWORD", "")
    db_name = os.getenv("DB_NAME", "EuroCarcare")
    ssl_ca = os.getenv("DB_SSL_CA", "")

    mysql_bin = _find_binary("mysql")
    cmd = [
        mysql_bin,
        f"--host={host}",
        f"--port={port}",
        f"--user={user}",
        "--default-character-set=utf8mb4",
    ]
    if ssl_ca:
        cmd.extend([f"--ssl-ca={ssl_ca}", "--ssl-mode=VERIFY_IDENTITY"])
    elif "tidbcloud.com" in host:
        cmd.append("--ssl-mode=REQUIRED")

    cmd.append(db_name)

    env = os.environ.copy()
    if password:
        env["MYSQL_PWD"] = password

    print(f"กำลังกู้คืนข้อมูลจาก '{sql_file}' ไปยังฐานข้อมูล '{db_name}' ({host}:{port}) ...")
    with open(sql_file, "r", encoding="utf-8") as f:
        result = subprocess.run(cmd, stdin=f, stderr=subprocess.PIPE, text=True, env=env)

    if result.returncode != 0:
        print("เกิดข้อผิดพลาดในการกู้คืนข้อมูล:", result.stderr)
        sys.exit(1)

    print("กู้คืนข้อมูลสำเร็จเรียบร้อย!")


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in ("backup", "restore"):
        print("วิธีใช้:")
        print("  สำรองข้อมูล: python backup_restore.py backup")
        print("  กู้คืนข้อมูล:  python backup_restore.py restore <path_to_sql_file>")
        sys.exit(1)

    action = sys.argv[1]
    if action == "backup":
        run_backup()
    elif action == "restore":
        if len(sys.argv) < 3:
            print("กรุณาระบุไฟล์ .sql ที่ต้องการกู้คืน เช่น: python backup_restore.py restore backups/the_sender_moto_xxxx.sql")
            sys.exit(1)
        run_restore(sys.argv[2])
