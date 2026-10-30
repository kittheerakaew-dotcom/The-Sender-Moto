-- The Sender Moto - Database Schema (MySQL / TiDB Cloud Starter compatible)
CREATE DATABASE IF NOT EXISTS EuroCarcare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE EuroCarcare;

CREATE TABLE IF NOT EXISTS Customers (
    CustomerID INT AUTO_INCREMENT PRIMARY KEY,
    CustomerName VARCHAR(100) NOT NULL,
    Address TEXT,
    PhoneNumber VARCHAR(20) NOT NULL,
    Email VARCHAR(100),
    CustomerTier VARCHAR(50) DEFAULT 'Standard',
    INDEX idx_customers_phone (PhoneNumber)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Vehicles (
    VehicleID INT AUTO_INCREMENT PRIMARY KEY,
    CustomerID INT NOT NULL,
    CarBrand VARCHAR(50) NOT NULL,
    CarNumber VARCHAR(20) NOT NULL,
    CarModel VARCHAR(100),
    VINCODE VARCHAR(17) UNIQUE NOT NULL,
    INDEX idx_vehicles_carnumber (CarNumber),
    FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Appointments (
    AppointmentID INT AUTO_INCREMENT PRIMARY KEY,
    CustomerID INT NOT NULL,
    VehicleID INT NOT NULL,
    AppointmentDate DATE NOT NULL,
    AppointmentTime TIME NOT NULL,
    ServiceType VARCHAR(100) NOT NULL,
    Notes TEXT,
    Status VARCHAR(50) DEFAULT 'Pending',
    INDEX idx_appointments_datetime (AppointmentDate, AppointmentTime),
    FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID) ON DELETE CASCADE,
    FOREIGN KEY (VehicleID) REFERENCES Vehicles(VehicleID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Service_Jobs (
    JobID INT AUTO_INCREMENT PRIMARY KEY,
    AppointmentID INT NOT NULL,
    MechanicName VARCHAR(100) NOT NULL,
    JobStatus VARCHAR(50) DEFAULT 'In Progress',
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