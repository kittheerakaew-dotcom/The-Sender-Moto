CREATE DATABASE EuroCarcare;
USE EuroCarcare;

CREATE TABLE Customers (
    CustomerID INT AUTO_INCREMENT PRIMARY KEY,
    CustomerName VARCHAR(100) NOT NULL,
    Address TEXT,
    PhoneNumber VARCHAR(20) NOT NULL,
    Email VARCHAR(100),
    CustomerTier VARCHAR(50) DEFAULT 'Standard'
);

CREATE TABLE Vehicles (
    VehicleID INT AUTO_INCREMENT PRIMARY KEY,
    CustomerID INT NOT NULL,
    CarBrand VARCHAR(50) NOT NULL,
    CarNumber VARCHAR(20) NOT NULL,
    CarModel VARCHAR(100),
    VINCODE VARCHAR(17) UNIQUE NOT NULL,
    FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID) ON DELETE CASCADE
);

CREATE TABLE Appointments (
    AppointmentID INT AUTO_INCREMENT PRIMARY KEY,
    VehicleID INT NOT NULL,
    AppointmentDate DATETIME NOT NULL,
    Description TEXT,
    Status VARCHAR(50) DEFAULT 'Pending',
    FOREIGN KEY (VehicleID) REFERENCES Vehicles(VehicleID) ON DELETE CASCADE
);

CREATE TABLE Service_jobs (
    JobID INT AUTO_INCREMENT PRIMARY KEY,
    VehicleID INT NOT NULL,
    GetCarDate DATETIME NOT NULL,
    MechanicNote TEXT,
    JobStatus VARCHAR(50) DEFAULT 'Pending',
    FOREIGN KEY (VehicleID) REFERENCES Vehicles(VehicleID) ON DELETE CASCADE
);

CREATE TABLE Service_Items (
    ItemID INT AUTO_INCREMENT PRIMARY KEY,
    JobID INT NOT NULL,
    DetailMaintain VARCHAR(255) NOT NULL,
    PriceItem DECIMAL(10, 2) NOT NULL,
    Wage DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (JobID) REFERENCES Service_jobs(JobID) ON DELETE CASCADE
);