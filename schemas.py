from pydantic import BaseModel, ConfigDict, Field, field_validator
from datetime import date, time, datetime, timezone, timedelta
from typing import Literal
import os
import re

_BANGKOK_TZ = timezone(timedelta(hours=7))

AllowedCustomerTier = Literal["Standard", "Premium", "VIP"]
AllowedCarBrand = Literal[
    "Mercedes-Benz",
    "BMW",
    "Audi",
    "Porsche",
    "Volkswagen",
    "Volvo",
    "MINI",
    "Land Rover",
]
AllowedServiceType = Literal[
    "General Maintenance",
    "Engine Repair",
    "Suspension",
    "Diagnostics",
]
AllowedJobStatus = Literal[
    "Pending",
    "Confirmed",
    "In Progress",
    "Ready",
    "Completed",
    "Cancelled",
    "No-Show",
]

SERVICE_DURATION_MINUTES: dict[str, int] = {
    "General Maintenance": 90,
    "Diagnostics": 60,
    "Suspension": 180,
    "Engine Repair": 240,
}


def _sanitize_text(val: str) -> str:
    # ตัดช่องว่างเกินและลบอักขระควบคุมหรือแท็ก HTML ที่อาจเป็นอันตราย (ป้องกัน XSS)
    cleaned = re.sub(r"[\x00-\x1f\x7f<>]", "", val.strip())
    return re.sub(r"\s+", " ", cleaned)


def _validate_thai_phone(val: str) -> str:
    # แปลง +66 หรือ 66 นำหน้าให้เป็น 0 และตัดขีด/ช่องว่างออกให้เป็นมาตรฐานเดียวกัน
    digits = re.sub(r"[\s\-\(\)]", "", val.strip())
    if digits.startswith("+66"):
        digits = "0" + digits[3:]
    elif digits.startswith("66") and len(digits) in (10, 11):
        digits = "0" + digits[2:]
    if not re.match(r"^0[2689]\d{7,8}$", digits):
        raise ValueError("รูปแบบเบอร์โทรศัพท์ไทยไม่ถูกต้อง (เช่น 0808996645)")
    return digits


def _validate_license_plate(val: str) -> str:
    cleaned = _sanitize_text(val).upper()
    if len(cleaned) < 2 or len(cleaned) > 20:
        raise ValueError("กรุณาระบุทะเบียนรถให้ถูกต้อง (เช่น 1กข 1234 หรือ กข 1234)")
    if not re.match(r"^[0-9A-Zก-ฮ\s\-]+$", cleaned):
        raise ValueError("ทะเบียนรถประกอบด้วยตัวอักษรไทย อังกฤษ ตัวเลข หรือขีดเท่านั้น")
    # จัดรูปแบบมาตรฐาน เช่น "1กข1234" หรือ "1กข-1234" -> "1กข 1234"
    compact = re.sub(r"[\s\-]+", "", cleaned)
    m = re.match(r"^([0-9]?[ก-ฮA-Z]{1,3})([0-9]{1,4})$", compact)
    if m:
        return f"{m.group(1)} {m.group(2)}"
    return re.sub(r"[\s\-]+", " ", cleaned).strip()


def _validate_appointment_date_str(v: str) -> str:
    try:
        parsed = datetime.strptime(v.strip(), "%Y-%m-%d").date()
    except ValueError:
        raise ValueError("รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)")
    today_bkk = datetime.now(_BANGKOK_TZ).date()
    if parsed < today_bkk:
        raise ValueError("ไม่สามารถจองคิวย้อนหลังได้ กรุณาเลือกวันที่ตั้งแต่วันนี้เป็นต้นไป")
    if (parsed - today_bkk).days > 90:
        raise ValueError("สามารถจองคิวล่วงหน้าได้ไม่เกิน 90 วัน")
    if parsed.weekday() == 6:
        raise ValueError("อู่ปิดทำการวันอาทิตย์ กรุณาเลือกวันจันทร์–เสาร์")

    holidays = {
        h.strip()
        for h in os.getenv("WORKSHOP_HOLIDAYS", "").split(",")
        if h.strip()
    }
    date_str = parsed.strftime("%Y-%m-%d")
    if date_str in holidays:
        raise ValueError("วันที่เลือกเป็นวันหยุดทำการของอู่ กรุณาเลือกวันอื่น")
    return date_str


def _validate_appointment_time_str(v: str) -> str:
    raw = v.strip()[:5]
    try:
        parsed = datetime.strptime(raw, "%H:%M").time()
    except ValueError:
        raise ValueError("รูปแบบเวลาไม่ถูกต้อง (HH:MM)")
    if parsed < time(8, 30) or parsed > time(17, 30):
        raise ValueError("กรุณาเลือกเวลาภายในช่วงเวลาทำการ 08:30 - 17:30 น.")
    return parsed.strftime("%H:%M")


class CustomerCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    CustomerName:       str = Field(min_length=2, max_length=100)
    Address:            str | None = Field(default=None, max_length=500)
    PhoneNumber:        str = Field(min_length=9, max_length=20)
    Email:              str | None = Field(default=None, max_length=100)
    CustomerTier:       AllowedCustomerTier = "Standard"

    @field_validator("CustomerName")
    @classmethod
    def clean_name(cls, v: str) -> str:
        cleaned = _sanitize_text(v)
        if len(cleaned) < 2:
            raise ValueError("กรุณาระบุชื่อ-นามสกุลอย่างน้อย 2 ตัวอักษร")
        return cleaned

    @field_validator("PhoneNumber")
    @classmethod
    def clean_phone(cls, v: str) -> str:
        return _validate_thai_phone(v)

    @field_validator("Address")
    @classmethod
    def clean_address(cls, v: str | None) -> str | None:
        if v is None or not v.strip():
            return None
        return _sanitize_text(v)

    @field_validator("Email")
    @classmethod
    def clean_email(cls, v: str | None) -> str | None:
        if v is None or not v.strip():
            return None
        cleaned = v.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", cleaned):
            raise ValueError("รูปแบบอีเมลไม่ถูกต้อง")
        return cleaned


class VehicleCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    CustomerID:         int = Field(gt=0)
    CarBrand:           AllowedCarBrand
    CarNumber:          str = Field(min_length=2, max_length=20)
    CarModel:           str | None = Field(default=None, max_length=100)
    VINCODE:            str = Field(min_length=5, max_length=17)

    @field_validator("CarNumber")
    @classmethod
    def clean_plate(cls, v: str) -> str:
        return _validate_license_plate(v)

    @field_validator("CarModel")
    @classmethod
    def clean_model(cls, v: str | None) -> str | None:
        if v is None or not v.strip():
            return None
        return _sanitize_text(v)

    @field_validator("VINCODE")
    @classmethod
    def clean_vin(cls, v: str) -> str:
        cleaned = _sanitize_text(v).upper()
        if not re.match(r"^[A-Z0-9\-]{5,17}$", cleaned):
            raise ValueError("รูปแบบรหัสตัวถัง (VIN) ไม่ถูกต้อง")
        return cleaned


class AppointmentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    CustomerID:         int = Field(gt=0)
    VehicleID:          int = Field(gt=0)
    AppointmentDate:    date
    AppointmentTime:    time
    ServiceType:        AllowedServiceType
    Notes:              str | None = Field(default=None, max_length=500)

    @field_validator("Notes")
    @classmethod
    def clean_notes(cls, v: str | None) -> str | None:
        if v is None or not v.strip():
            return None
        return _sanitize_text(v)


class ServiceJobCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    AppointmentID:      int = Field(gt=0)
    MechanicName:       str = Field(min_length=2, max_length=100)
    JobStatus:          AllowedJobStatus = "In Progress"
    TotalCost:          float = Field(default=0.00, ge=0, le=10_000_000)

    @field_validator("MechanicName")
    @classmethod
    def clean_mechanic(cls, v: str) -> str:
        return _sanitize_text(v)


class ServiceItemCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    JobID:              int | None = Field(default=None, gt=0)
    ItemName:           str = Field(min_length=1, max_length=255)
    Quantity:           int = Field(default=1, ge=1, le=1000)
    UnitPrice:          float = Field(ge=0, le=10_000_000)

    @field_validator("ItemName")
    @classmethod
    def clean_item_name(cls, v: str) -> str:
        cleaned = _sanitize_text(v)
        if not cleaned:
            raise ValueError("กรุณาระบุชื่อรายการอะไหล่หรือค่าแรง")
        return cleaned


class BookingCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    CustomerName: str = Field(min_length=2, max_length=100)
    PhoneNumber: str = Field(min_length=9, max_length=20)
    LineID: str | None = Field(default=None, max_length=100)
    Email: str | None = Field(default=None, max_length=100)
    CarBrand: AllowedCarBrand
    CarModel: str = Field(min_length=1, max_length=100)
    CarYear: int | None = Field(default=None, ge=1970, le=2028)
    CarNumber: str = Field(min_length=2, max_length=20)
    Mileage: int | None = Field(default=None, ge=0, le=2_000_000)
    AppointmentDate: str = Field(min_length=10, max_length=10)
    AppointmentTime: str = Field(min_length=5, max_length=8)
    ServiceType: AllowedServiceType
    Notes: str | None = Field(default=None, max_length=500)
    PhotoURL: str | None = Field(default=None, max_length=120_000)
    Website: str | None = Field(default="", max_length=200)
    ConsentPDPA: bool = True
    ConsentVersion: str = Field(default="v1.0", max_length=20)
    IdempotencyKey: str | None = Field(default=None, max_length=64)

    @field_validator("CustomerName")
    @classmethod
    def validate_name(cls, v: str) -> str:
        cleaned = _sanitize_text(v)
        if len(cleaned) < 2:
            raise ValueError("กรุณาระบุชื่อ-นามสกุลให้ถูกต้อง")
        return cleaned

    @field_validator("PhoneNumber")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return _validate_thai_phone(v)

    @field_validator("LineID")
    @classmethod
    def validate_line_id(cls, v: str | None) -> str | None:
        if v is None or not v.strip():
            return None
        return _sanitize_text(v)

    @field_validator("Email")
    @classmethod
    def validate_email(cls, v: str | None) -> str | None:
        if v is None or not v.strip():
            return None
        cleaned = v.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", cleaned):
            raise ValueError("รูปแบบอีเมลไม่ถูกต้อง")
        return cleaned

    @field_validator("CarModel")
    @classmethod
    def validate_model(cls, v: str) -> str:
        cleaned = _sanitize_text(v)
        if not cleaned:
            raise ValueError("กรุณาระบุรุ่นรถยนต์")
        return cleaned

    @field_validator("CarNumber")
    @classmethod
    def validate_plate(cls, v: str) -> str:
        return _validate_license_plate(v)

    @field_validator("AppointmentDate")
    @classmethod
    def validate_date(cls, v: str) -> str:
        return _validate_appointment_date_str(v)

    @field_validator("AppointmentTime")
    @classmethod
    def validate_time(cls, v: str) -> str:
        return _validate_appointment_time_str(v)

    @field_validator("Notes")
    @classmethod
    def validate_notes(cls, v: str | None) -> str | None:
        if v is None or not v.strip():
            return None
        return _sanitize_text(v)

    @field_validator("PhotoURL")
    @classmethod
    def validate_photo(cls, v: str | None) -> str | None:
        if v is None or not v.strip():
            return None
        raw = v.strip()
        if raw.startswith("https://") or raw.startswith("data:image/jpeg;base64,") or raw.startswith("data:image/png;base64,") or raw.startswith("data:image/webp;base64,"):
            return raw
        raise ValueError("รูปภาพต้องเป็นไฟล์ JPG, PNG หรือ WebP เท่านั้น")

    @field_validator("ConsentPDPA")
    @classmethod
    def validate_consent(cls, v: bool) -> bool:
        if not v:
            raise ValueError("กรุณายินยอมนโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA) ก่อนทำการจองคิว")
        return v

    @field_validator("IdempotencyKey")
    @classmethod
    def validate_idem_key(cls, v: str | None) -> str | None:
        if v is None or not v.strip():
            return None
        cleaned = re.sub(r"[^a-zA-Z0-9\-_]", "", v.strip())
        return cleaned[:64] if cleaned else None


class BookingLookupRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    BookingRef: str = Field(min_length=1, max_length=30)
    PhoneNumber: str = Field(min_length=9, max_length=20)

    @field_validator("PhoneNumber")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return _validate_thai_phone(v)


class BookingRescheduleRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    BookingRef: str = Field(min_length=1, max_length=30)
    PhoneNumber: str = Field(min_length=9, max_length=20)
    AppointmentDate: str = Field(min_length=10, max_length=10)
    AppointmentTime: str = Field(min_length=5, max_length=8)

    @field_validator("PhoneNumber")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return _validate_thai_phone(v)

    @field_validator("AppointmentDate")
    @classmethod
    def validate_date(cls, v: str) -> str:
        return _validate_appointment_date_str(v)

    @field_validator("AppointmentTime")
    @classmethod
    def validate_time(cls, v: str) -> str:
        return _validate_appointment_time_str(v)


class StatusUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    Status: AllowedJobStatus
    InternalNotes: str | None = Field(default=None, max_length=1000)

    @field_validator("InternalNotes")
    @classmethod
    def clean_internal_notes(cls, v: str | None) -> str | None:
        if v is None:
            return None
        return _sanitize_text(v)


class AdminLoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    Password: str = Field(min_length=1, max_length=128)
