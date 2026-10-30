"""
สคริปต์สร้างรหัสผ่านผู้ดูแลระบบแบบเข้ารหัส (Hashed Admin Password) สำหรับ The Sender Moto
ใช้อัลกอริทึม scrypt จากมาตรฐานไลบรารีของ Python (ไม่ต้องติดตั้งแพ็กเกจเพิ่ม และปลอดภัยเทียบเท่า Argon2/bcrypt)

วิธีใช้งาน:
  venv\\Scripts\\python create_admin.py
หรือส่งรหัสผ่านทางอาร์กิวเมนต์:
  venv\\Scripts\\python create_admin.py <รหัสผ่านที่ต้องการ>

จากนั้นนำค่า ADMIN_PASSWORD_HASH และ ADMIN_SESSION_SECRET ที่ได้ ไปใส่ในไฟล์ .env และใน Vercel Environment Variables
"""

import getpass
import hashlib
import secrets
import sys


def hash_admin_password(password: str) -> str:
    salt = secrets.token_hex(16)
    n, r, p = 16384, 8, 1
    derived = hashlib.scrypt(
        password.encode("utf-8"),
        salt=bytes.fromhex(salt),
        n=n,
        r=r,
        p=p,
        dklen=32,
    )
    return f"scrypt${n}${r}${p}${salt}${derived.hex()}"


def main():
    if len(sys.argv) > 1:
        pwd = sys.argv[1]
    else:
        pwd = getpass.getpass("กรอกรหัสผ่าน Admin ที่ต้องการตั้ง (อย่างน้อย 8 ตัวอักษร): ")

    if len(pwd.strip()) < 8:
        print("ข้อผิดพลาด: รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร")
        sys.exit(1)

    pwd_hash = hash_admin_password(pwd.strip())
    session_secret = secrets.token_hex(32)

    print("\nสร้างรหัสผ่านเข้ารหัสสำเร็จ! คัดลอกค่าด้านล่างไปใส่ในไฟล์ .env หรือ Vercel Environment Variables:\n")
    print(f'ADMIN_PASSWORD_HASH="{pwd_hash}"')
    print(f'ADMIN_SESSION_SECRET="{session_secret}"')


if __name__ == "__main__":
    main()
