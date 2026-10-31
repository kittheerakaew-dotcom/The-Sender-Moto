-- The Sender Moto - Database Schema (MySQL 8 / TiDB Cloud Starter compatible)
-- ออกแบบชนิดข้อมูล (Data Types) และ Constraint อย่างเข้มงวดเพื่อป้องกันข้อมูลผิดพลาดตั้งแต่ระดับฐานข้อมูล
CREATE DATABASE IF NOT EXISTS TheSenderMoto CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE TheSenderMoto;

CREATE TABLE IF NOT EXISTS Customers (
    CustomerID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    CustomerName VARCHAR(100) NOT NULL,
    Address VARCHAR(500) DEFAULT NULL,
    PhoneNumber CHAR(10) NOT NULL,
    Email VARCHAR(100) DEFAULT NULL,
    LineID VARCHAR(50) DEFAULT NULL,
    CustomerTier ENUM('Standard', 'Premium', 'VIP') NOT NULL DEFAULT 'Standard',
    UNIQUE INDEX idx_customers_phone (PhoneNumber),
    CONSTRAINT chk_customers_phone CHECK (PhoneNumber REGEXP '^0[0-9]{8,9}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Vehicles (
    VehicleID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    CustomerID INT UNSIGNED NOT NULL,
    CarBrand ENUM('Mercedes-Benz', 'BMW', 'Audi', 'Porsche', 'Volkswagen', 'Volvo', 'MINI', 'Land Rover') NOT NULL,
    CarNumber VARCHAR(15) NOT NULL,
    CarModel VARCHAR(80) NOT NULL DEFAULT '',
    CarYear SMALLINT UNSIGNED DEFAULT NULL,
    VINCODE CHAR(17) UNIQUE NOT NULL,
    INDEX idx_vehicles_carnumber (CarNumber),
    CONSTRAINT chk_vehicles_year CHECK (CarYear IS NULL OR (CarYear >= 1970 AND CarYear <= 2030)),
    FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Appointments (
    AppointmentID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    BookingRef CHAR(14) DEFAULT NULL,
    CustomerID INT UNSIGNED NOT NULL,
    VehicleID INT UNSIGNED NOT NULL,
    AppointmentDate DATE NOT NULL,
    AppointmentTime TIME NOT NULL,
    ServiceType ENUM('General Maintenance', 'Engine Repair', 'Suspension', 'Diagnostics') NOT NULL,
    EstimatedMinutes SMALLINT UNSIGNED NOT NULL DEFAULT 90,
    Mileage INT UNSIGNED DEFAULT NULL,
    Notes VARCHAR(500) DEFAULT NULL,
    InternalNotes VARCHAR(1000) DEFAULT NULL,
    PhotoURL MEDIUMTEXT DEFAULT NULL,
    Status ENUM('Pending', 'Confirmed', 'In Progress', 'Ready', 'Completed', 'Cancelled', 'No-Show') NOT NULL DEFAULT 'Pending',
    CreatedAtUTC DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ConsentAtUTC DATETIME DEFAULT NULL,
    ConsentVersion VARCHAR(10) NOT NULL DEFAULT 'v1.0',
    IdempotencyKey VARCHAR(64) DEFAULT NULL,
    NotificationStatus ENUM('Pending', 'Sent', 'Failed', 'Skipped') NOT NULL DEFAULT 'Pending',
    UNIQUE INDEX idx_appointments_bookingref (BookingRef),
    UNIQUE INDEX idx_appointments_idempotency (IdempotencyKey),
    INDEX idx_appointments_datetime (AppointmentDate, AppointmentTime),
    INDEX idx_appointments_notify_status (NotificationStatus),
    FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID) ON DELETE CASCADE,
    FOREIGN KEY (VehicleID) REFERENCES Vehicles(VehicleID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Service_Jobs (
    JobID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    AppointmentID INT UNSIGNED NOT NULL,
    MechanicName VARCHAR(100) NOT NULL DEFAULT 'ช่างประจำศูนย์',
    JobStatus ENUM('In Progress', 'Ready', 'Completed', 'Cancelled') NOT NULL DEFAULT 'In Progress',
    InternalNotes VARCHAR(1000) DEFAULT NULL,
    TotalCost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    CONSTRAINT chk_jobs_totalcost CHECK (TotalCost >= 0),
    FOREIGN KEY (AppointmentID) REFERENCES Appointments(AppointmentID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Service_Items (
    ItemID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    JobID INT UNSIGNED NOT NULL,
    ItemName VARCHAR(150) NOT NULL,
    Quantity SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    UnitPrice DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    CONSTRAINT chk_items_qty CHECK (Quantity >= 1 AND Quantity <= 1000),
    CONSTRAINT chk_items_price CHECK (UnitPrice >= 0),
    FOREIGN KEY (JobID) REFERENCES Service_Jobs(JobID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตารางเก็บ Rate Limit และ Login Throttling สำหรับ Serverless (ไม่ต้องพึ่ง In-Memory State)
CREATE TABLE IF NOT EXISTS Rate_Limits (
    RateKey VARCHAR(100) PRIMARY KEY,
    HitCount INT UNSIGNED NOT NULL DEFAULT 1,
    WindowStart BIGINT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
