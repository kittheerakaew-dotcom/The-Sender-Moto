-- ==============================================================================
-- The Sender Moto — Migration 002 (Phase C: Booking Flow, Slot Capacity, Status Lifecycle)
-- สคริปต์นี้ออกแบบให้ไม่ลบข้อมูลเดิม (Non-destructive) และรองรับทั้ง TiDB Cloud Starter และ MySQL 8
-- ==============================================================================

ALTER TABLE Customers ADD COLUMN IF NOT EXISTS LineID VARCHAR(100) DEFAULT NULL;
ALTER TABLE Vehicles ADD COLUMN IF NOT EXISTS CarYear INT DEFAULT NULL;

ALTER TABLE Appointments ADD COLUMN IF NOT EXISTS BookingRef VARCHAR(30) DEFAULT NULL;
ALTER TABLE Appointments ADD COLUMN IF NOT EXISTS EstimatedMinutes INT DEFAULT 90;
ALTER TABLE Appointments ADD COLUMN IF NOT EXISTS Mileage INT DEFAULT NULL;
ALTER TABLE Appointments ADD COLUMN IF NOT EXISTS InternalNotes TEXT;
ALTER TABLE Appointments ADD COLUMN IF NOT EXISTS PhotoURL MEDIUMTEXT DEFAULT NULL;

ALTER TABLE Service_Jobs ADD COLUMN IF NOT EXISTS InternalNotes TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_bookingref ON Appointments (BookingRef);
