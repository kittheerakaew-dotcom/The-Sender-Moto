-- The Sender Moto - Database Schema (MySQL / TiDB Cloud Starter compatible)
CREATE DATABASE IF NOT EXISTS TheSenderMoto CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE TheSenderMoto;

CREATE TABLE IF NOT EXISTS Customers (
    CustomerID INT AUTO_INCREMENT PRIMARY KEY,
    CustomerName VARCHAR(100) NOT NULL,
    Address TEXT,
    PhoneNumber VARCHAR(20) NOT NULL,
    Email VARCHAR(100),
    LineID VARCHAR(100) DEFAULT NULL,
    CustomerTier VARCHAR(50) DEFAULT 'Standard',
    INDEX idx_customers_phone (PhoneNumber)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Vehicles (
    VehicleID INT AUTO_INCREMENT PRIMARY KEY,
    CustomerID INT NOT NULL,
    CarBrand VARCHAR(50) NOT NULL,
    CarNumber VARCHAR(20) NOT NULL,
    CarModel VARCHAR(100),
    CarYear INT DEFAULT NULL,
    VINCODE VARCHAR(17) UNIQUE NOT NULL,
    INDEX idx_vehicles_carnumber (CarNumber),
    FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Appointments (
    AppointmentID INT AUTO_INCREMENT PRIMARY KEY,
    BookingRef VARCHAR(30) DEFAULT NULL,
    CustomerID INT NOT NULL,
    VehicleID INT NOT NULL,
    AppointmentDate DATE NOT NULL,
    AppointmentTime TIME NOT NULL,
    ServiceType VARCHAR(100) NOT NULL,
    EstimatedMinutes INT DEFAULT 90,
    Mileage INT DEFAULT NULL,
    Notes TEXT,
    InternalNotes TEXT,
    PhotoURL MEDIUMTEXT DEFAULT NULL,
    Status VARCHAR(50) DEFAULT 'Pending',
    CreatedAtUTC DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ConsentAtUTC DATETIME DEFAULT NULL,
    ConsentVersion VARCHAR(20) DEFAULT 'v1.0',
    IdempotencyKey VARCHAR(64) DEFAULT NULL,
    NotificationStatus VARCHAR(30) DEFAULT 'Pending',
    UNIQUE INDEX idx_appointments_bookingref (BookingRef),
    UNIQUE INDEX idx_appointments_idempotency (IdempotencyKey),
    INDEX idx_appointments_datetime (AppointmentDate, AppointmentTime),
    INDEX idx_appointments_notify_status (NotificationStatus),
    FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID) ON DELETE CASCADE,
    FOREIGN KEY (VehicleID) REFERENCES Vehicles(VehicleID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Service_Jobs (
    JobID INT AUTO_INCREMENT PRIMARY KEY,
    AppointmentID INT NOT NULL,
    MechanicName VARCHAR(100) NOT NULL,
    JobStatus VARCHAR(50) DEFAULT 'In Progress',
    InternalNotes TEXT,
    TotalCost DECIMAL(10, 2) DEFAULT 0.00,
    FOREIGN KEY (AppointmentID) REFERENCES Appointments(AppointmentID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Service_Items (
    ItemID INT AUTO_INCREMENT PRIMARY KEY,
    JobID INT NOT NULL,
    ItemName VARCHAR(255) NOT NULL,
    Quantity INT DEFAULT 1,
    UnitPrice DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (JobID) REFERENCES Service_Jobs(JobID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตารางเก็บ Rate Limit และ Login Throttling สำหรับ Serverless (ไม่ต้องพึ่ง In-Memory State)
CREATE TABLE IF NOT EXISTS Rate_Limits (
    RateKey VARCHAR(100) PRIMARY KEY,
    HitCount INT NOT NULL DEFAULT 1,
    WindowStart BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;