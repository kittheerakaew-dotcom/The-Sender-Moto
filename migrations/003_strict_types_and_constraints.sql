-- ==============================================================================
-- The Sender Moto — Migration 003 (Strict Column Types: CHAR(10), CHAR(17), ENUM, UNSIGNED)
-- สคริปต์นี้ออกแบบให้ไม่ลบข้อมูลเดิม (Non-destructive) และรองรับทั้ง TiDB Cloud Starter และ MySQL 8
-- ==============================================================================

-- 1. ทำความสะอาดเบอร์โทรศัพท์เดิมให้ไม่มีขีดหรือช่องว่าง และมีความยาวไม่เกิน 10 ตัวอักษร ก่อนเปลี่ยนเป็น CHAR(10)
UPDATE Customers
SET PhoneNumber = LEFT(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(PhoneNumber), '-', ''), ' ', ''), '(', ''), ')', ''), 10)
WHERE PhoneNumber IS NOT NULL;

-- 2. ปรับชนิดคอลัมน์ตาราง Customers ให้เข้มงวด (PhoneNumber CHAR(10), CustomerTier ENUM)
ALTER TABLE Customers MODIFY COLUMN CustomerName VARCHAR(100) NOT NULL;
ALTER TABLE Customers MODIFY COLUMN PhoneNumber CHAR(10) NOT NULL;
ALTER TABLE Customers MODIFY COLUMN Email VARCHAR(100) DEFAULT NULL;
ALTER TABLE Customers MODIFY COLUMN LineID VARCHAR(50) DEFAULT NULL;
ALTER TABLE Customers MODIFY COLUMN CustomerTier ENUM('Standard', 'Premium', 'VIP') NOT NULL DEFAULT 'Standard';

-- 3. ปรับชนิดคอลัมน์ตาราง Vehicles ให้เข้มงวด (CarNumber VARCHAR(15), VINCODE CHAR(17), CarYear SMALLINT UNSIGNED)
ALTER TABLE Vehicles MODIFY COLUMN CarNumber VARCHAR(15) NOT NULL;
ALTER TABLE Vehicles MODIFY COLUMN CarModel VARCHAR(80) DEFAULT '';
ALTER TABLE Vehicles MODIFY COLUMN CarYear SMALLINT UNSIGNED DEFAULT NULL;
ALTER TABLE Vehicles MODIFY COLUMN VINCODE CHAR(17) NOT NULL;

-- 4. ปรับชนิดคอลัมน์ตาราง Appointments ให้เข้มงวด (BookingRef CHAR(14), EstimatedMinutes SMALLINT UNSIGNED, Mileage INT UNSIGNED)
ALTER TABLE Appointments MODIFY COLUMN BookingRef CHAR(14) DEFAULT NULL;
ALTER TABLE Appointments MODIFY COLUMN EstimatedMinutes SMALLINT UNSIGNED NOT NULL DEFAULT 90;
ALTER TABLE Appointments MODIFY COLUMN Mileage INT UNSIGNED DEFAULT NULL;
ALTER TABLE Appointments MODIFY COLUMN ConsentVersion VARCHAR(10) NOT NULL DEFAULT 'v1.0';

-- 5. ปรับชนิดคอลัมน์ตาราง Service_Jobs และ Service_Items
ALTER TABLE Service_Jobs MODIFY COLUMN MechanicName VARCHAR(100) NOT NULL DEFAULT 'ช่างประจำศูนย์';
ALTER TABLE Service_Jobs MODIFY COLUMN TotalCost DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE Service_Items MODIFY COLUMN ItemName VARCHAR(150) NOT NULL;
ALTER TABLE Service_Items MODIFY COLUMN Quantity SMALLINT UNSIGNED NOT NULL DEFAULT 1;
ALTER TABLE Service_Items MODIFY COLUMN UnitPrice DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
