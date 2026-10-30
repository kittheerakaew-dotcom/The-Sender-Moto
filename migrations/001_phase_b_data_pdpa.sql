-- ==============================================================================
-- The Sender Moto — Migration 001 (Phase B: Data, UTC, PDPA, Idempotency, Notification)
-- สคริปต์นี้ออกแบบให้ไม่ลบข้อมูลเดิม (Non-destructive) และรองรับทั้ง TiDB Cloud Starter และ MySQL 8
-- ==============================================================================

ALTER TABLE Appointments ADD COLUMN IF NOT EXISTS CreatedAtUTC DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE Appointments ADD COLUMN IF NOT EXISTS ConsentAtUTC DATETIME DEFAULT NULL;
ALTER TABLE Appointments ADD COLUMN IF NOT EXISTS ConsentVersion VARCHAR(20) DEFAULT 'v1.0';
ALTER TABLE Appointments ADD COLUMN IF NOT EXISTS IdempotencyKey VARCHAR(64) DEFAULT NULL;
ALTER TABLE Appointments ADD COLUMN IF NOT EXISTS NotificationStatus VARCHAR(30) DEFAULT 'Pending';

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_idempotency ON Appointments (IdempotencyKey);
CREATE INDEX IF NOT EXISTS idx_appointments_notify_status ON Appointments (NotificationStatus);

CREATE TABLE IF NOT EXISTS Rate_Limits (
    RateKey VARCHAR(100) PRIMARY KEY,
    HitCount INT NOT NULL DEFAULT 1,
    WindowStart BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
