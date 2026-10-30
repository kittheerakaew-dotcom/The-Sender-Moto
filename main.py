from fastapi import FastAPI
import mysql.connector
from database import get_data_connection
from schemas import CustomerCreate, VehicleCreate, AppointmentCreate, ServiceJobCreate, ServiceItemCreate, BookingCreate
import time

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def check_connection():
    connect = get_data_connection()
    if connect and connect.is_connected():
        connect.close()
        return {"connected database"}
    return {"failed to connect database"}
########################################################################################################
#   START Customer
########################################################################################################
@app.get("/customers")
def get_customers():
    connect = get_data_connection()
    if not connect:
        return ("failed to connect database")

    cursor = connect.cursor(dictionary = True)
    cursor.execute("SELECT * FROM Customers")
    result = cursor.fetchall()

    cursor.close()
    connect.close()
    return {"data": result}

@app.post("/customers")
def create_customer(customer: CustomerCreate):
    connect = get_data_connection()
    if not connect:
        return {"failed to create customer, Database connection error"}
    
    cursor = connect.cursor()
    sql = """
        INSERT INTO Customers (CustomerName, Address, PhoneNumber, Email, CustomerTier) 
        VALUES (%s, %s, %s, %s, %s)
    """
    val = (customer.CustomerName, customer.Address, customer.PhoneNumber, customer.Email, customer.CustomerTier)

    cursor.execute(sql, val)
    connect.commit()

    cursor.close()
    connect.close()
    return {f"Added customer {customer.CustomerName} successfully"}
########################################################################################################
#   END Customer
#------------------------------------------------------------------------------------------------------#
#   START Vehicles
########################################################################################################
@app.post("/vehicles")
def create_vehicle(vehicle: VehicleCreate):
    connect = get_data_connection()
    if not connect:
        return {"failed to create vehicle, Database connection error"}

    cursor = connect.cursor()
    sql = """
        INSERT INTO Vehicles (CustomerID, CarBrand, CarNumber, CarModel, VINCODE) 
        VALUES (%s, %s, %s, %s, %s)
    """
    val = (vehicle.CustomerID, vehicle.CarBrand, vehicle.CarNumber, vehicle.CarModel, vehicle.VINCODE)

    try:
        cursor.execute(sql, val)
        connect.commit()
        msg = "Success"
        detail = f"Added vehicle {vehicle.CarNumber} successfully"
    except mysql.connector.Error as e:
        msg = "Failed"
        detail = str(e)

    cursor.close()
    connect.close()
    return {"status": msg, "message": detail}

@app.get("/vehicles")
def get_vehivles():
    connect = get_data_connection()
    if not connect:
        return {"Database error can not show vehicle"}

    cursor = connect.cursor(dictionary = True)
    cursor.execute("SELECT * FROM Vehicles")
    result = cursor.fetchall()

    cursor.close()
    connect.close()
    return {"data": result}
########################################################################################################
#   END Vehicles
#------------------------------------------------------------------------------------------------------#
#   START Appointment
########################################################################################################
@app.post("/appointment")
def create_appointment(appointment: AppointmentCreate):
    connect = get_data_connection()
    if not connect:
        return {"failed to create appointment, Database connection error"}

    cursor = connect.cursor()
    sql = """
        INSERT INTO Appointments (CustomerID, VehicleID, AppointmentDate, AppointmentTime, ServiceType, Notes, Status) 
        VALUES (%s, %s, %s, %s, %s, %s, 'Pending')
    """
    val = (appointment.CustomerID, appointment.VehicleID, appointment.AppointmentDate, appointment.AppointmentTime, appointment.ServiceType, appointment.Notes)

    try:
        cursor.execute(sql, val)
        connect.commit()
        msg = "success"
        detail = "Appointment booked succesfully"

    except mysql.connector.Error as e:
        msg = "failed"
        detail = str(e)

    cursor.close()
    connect.close()
    return {"status": msg, "message": detail}

@app.get("/appointment")
def get_appointment():
    connect = get_data_connection()
    if not connect:
        return {"can not get data, Database connection error"}

    cursor = connect.cursor(dictionary = True)
    cursor.execute("SELECT * FROM Appointments")
    result = cursor.fetchall()

    for row in result:
        if 'AppointmentTime' in row and row['AppointmentTime'] is not None:
            row['AppointmentTime'] = str(row['AppointmentTime'])
        if 'AppointmentDate' in row and row['AppointmentDate'] is not None:
            row['AppointmentDate'] = str(row['AppointmentDate'])
    
    cursor.close()
    connect.close()
    return {"data": result}
########################################################################################################
#   END Appointment
#------------------------------------------------------------------------------------------------------#
#   START Service_Job
########################################################################################################
@app.post("/service-jobs")
def create_service_job(job: ServiceJobCreate):
    connect = get_data_connection()
    if not connect:
        return {"can not create service, Database connection error"}

    cursor = connect.cursor()
    sql = """
        INSERT INTO Service_Jobs (AppointmentID, MechanicName, JobStatus, TotalCost) 
        VALUES (%s, %s, %s, %s)
    """
    val = (job.AppointmentID, job.MechanicName, job.JobStatus, job.TotalCost)

    try:
        cursor.execute(sql, val)
        connect.commit()
        msg = "successs"
        detail = f"Service job assigned to {job.MechanicName} successfully"

    except mysql.connector.Error as e:
        msg = "failed"
        detail = str(e)

    cursor.close()
    connect.close()
    return {"status": msg, "message": detail}

@app.get("/service-jobs")
def get_service_jobs():
    connect = get_data_connection()
    if not connect:
        return {"can not get service, Database connection error"}

    cursor = connect.cursor(dictionary = True)
    cursor.execute("SELECT * FROM Service_Jobs")
    result = cursor.fetchall()

    cursor.close()
    connect.close()
    return {"data": result}
########################################################################################################
#   END Service_Job
#------------------------------------------------------------------------------------------------------#
#   START ServiceItem
########################################################################################################
@app.post("/service-items")
def create_service_item(item: ServiceItemCreate):
    connect = get_data_connection()
    if not connect:
        return {"failed to create ServiceItem, Database connection error"}

    cursor = connect.cursor()
    sql = """
        INSERT INTO Service_Items (JobID, ItemName, Quantity, UnitPrice) 
        VALUES (%s, %s, %s, %s)
    """
    val = (item.JobID, item.ItemName, item.Quantity, item.UnitPrice)

    try:
        cursor.execute(sql, val)
        connect.commit()
        msg = "success"
        detail = f"Added item {item.ItemName} to job successfully"

    except mysql.connector.Error as e:
        msg = "Failed"
        detail = str(e)

    cursor.close()
    connect.close()
    return {"status": msg, "message": detail}

@app.get("/service-items")
def get_service_items():
    connect = get_data_connection()
    if not connect:
        return {"can not get service items, Database connection error"}

    cursor = connect.cursor(dictionary = True)
    cursor.execute("SELECT * FROM Service_Items")
    result = cursor.fetchall()

    cursor.close()
    connect.close()
    return {"data": result}
########################################################################################################
#   END Service_items
#------------------------------------------------------------------------------------------------------#
#   START booking
########################################################################################################
@app.post("/bookings")
def create_booking(booking: BookingCreate):
    connect = get_data_connection()
    if not connect:
        return {"failed to create booking, Database connection error"}

    cursor = connect.cursor()
    try:
        cursor.execute(
            "INSERT INTO Customers (CustomerName, PhoneNumber) VALUES (%s, %s)",
            (booking.CustomerName, booking.PhoneNumber)
        )
        customer_id = cursor.lastrowid

        temp_vincode = f"TEMP-{int(time.time())}"
        cursor.execute(
            "INSERT INTO Vehicles (CustomerID, CarBrand, CarNumber, CarModel, VINCODE) VALUES (%s, %s, %s, %s, %s)",
            (customer_id, booking.CarBrand, booking.CarNumber, booking.CarModel, temp_vincode)
        )
        vehicle_id = cursor.lastrowid

        cursor.execute(
            "INSERT INTO Appointments (CustomerID, VehicleID, AppointmentDate, AppointmentTime, ServiceType, Status) VALUES (%s, %s, %s, %s, %s, 'Pending')",
            (customer_id, vehicle_id, booking.AppointmentDate, booking.AppointmentTime, booking.ServiceType)
        )

        connect.commit()
        return {"status": "Success", "message": "จองคิวสำเร็จ"}

    except mysql.connector.Error as e:
        connect.rollback()
        return {"status": "Failed", "message": str(e)}
    finally:
        cursor.close()
        connect.close()
########################################################################################################
#   END booking
#------------------------------------------------------------------------------------------------------#
#   START get appointment
########################################################################################################
@app.get("/appointments")
def get_appointments():
    connect = get_data_connection()
    if not connect:
        return {"status": "Failed", "message": "Database connection error"}
    
    cursor = connect.cursor(dictionary=True)
    try:
        query = """
            SELECT a.AppointmentID, a.AppointmentDate, a.AppointmentTime, a.ServiceType, a.Status,
                   c.CustomerName, c.PhoneNumber,
                   v.CarBrand, v.CarModel, v.CarNumber
            FROM Appointments a
            JOIN Customers c ON a.CustomerID = c.CustomerID
            JOIN Vehicles v ON a.VehicleID = v.VehicleID
            ORDER BY a.AppointmentDate ASC, a.AppointmentTime ASC
        """
        cursor.execute(query)
        appointments = cursor.fetchall()

        for appt in appointments:
            appt['AppointmentDate'] = str(appt['AppointmentDate'])
            appt['AppointmentTime'] = str(appt['AppointmentTime'])
            
        return {"status": "Success", "data": appointments}
    except mysql.connector.Error as e:
        return {"status": "Failed", "message": str(e)}
    finally:
        cursor.close()
        connect.close()
########################################################################################################
#   END get appointment
#------------------------------------------------------------------------------------------------------#
#   START change status
########################################################################################################
@app.put("/appointments/{appointment_id}/accept")
def accept_appointment(appointment_id: int):
    connect = get_data_connection()
    if not connect:
        return {"status": "Failed", "message": "Database connection error"}

    cursor = connect.cursor()
    try:
        cursor.execute(
            "UPDATE Appointments SET Status = 'In Progress' WHERE AppointmentID = %s",
            (appointment_id,)
        )

        cursor.execute(
            "INSERT INTO Service_Jobs (AppointmentID, MechanicName, JobStatus) VALUES (%s, %s, 'In Progress')",
            (appointment_id, 'ช่างประจำศูนย์')
        )

        connect.commit()
        return {"status": "Success", "message": "รับรถเข้าซ่อมสำเร็จ"}

    except mysql.connector.Error as e:
        connect.rollback()
        return {"status": "Failed", "message": str(e)}
    finally:
        cursor.close()
        connect.close()
########################################################################################################
#   END change status
#------------------------------------------------------------------------------------------------------#
#   START get jobs
########################################################################################################
@app.get("/jobs")
def get_jobs():
    connect = get_data_connection()
    if not connect:
        return {"status": "Failed", "message": "Database connection error"}

    cursor = connect.cursor(dictionary=True)
    try:
        query = """
            SELECT j.JobID, j.MechanicName, j.JobStatus, j.TotalCost,
                   v.CarBrand, v.CarModel, v.CarNumber, c.CustomerName
            FROM Service_Jobs j
            JOIN Appointments a ON j.AppointmentID = a.AppointmentID
            JOIN Vehicles v ON a.VehicleID = v.VehicleID
            JOIN Customers c ON a.CustomerID = c.CustomerID
            ORDER BY j.JobID DESC
        """
        cursor.execute(query)
        return {"status": "Success", "data": cursor.fetchall()}
    finally:
        cursor.close()
        connect.close()

@app.post("/jobs/{job_id}/items")
def add_job_item(job_id: int, item: ServiceItemCreate):
    connect = get_data_connection()
    if not connect:
        return {"status": "Failed", "message": "Database connection error"}

    cursor = connect.cursor()
    try:
        cursor.execute(
            "INSERT INTO Service_Items (JobID, ItemName, Quantity, UnitPrice) VALUES (%s, %s, %s, %s)",
            (job_id, item.ItemName, item.Quantity, item.UnitPrice)
        )
        cursor.execute(
            "UPDATE Service_Jobs SET TotalCost = TotalCost + %s WHERE JobID = %s",
            (item.Quantity * item.UnitPrice, job_id)
        )

        connect.commit()
        return {"status": "Success", "message": "เพิ่มรายการอะไหล่สำเร็จ"}

    except mysql.connector.Error as e:
        connect.rollback()
        return {"status": "Failed", "message": str(e)}
    finally:
        cursor.close()
        connect.close()
########################################################################################################
#   END get jobs
#------------------------------------------------------------------------------------------------------#
#   START get receipt
########################################################################################################
@app.get("/jobs/{job_id}/receipt")
def get_job_receipt(job_id: int):
    connect = get_data_connection()
    if not connect:
        return {"status": "Failed", "message": "Database connection error"}
    
    cursor = connect.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT j.JobID, j.TotalCost, 
                   v.CarBrand, v.CarModel, v.CarNumber,
                   c.CustomerName, c.PhoneNumber
            FROM Service_Jobs j
            JOIN Appointments a ON j.AppointmentID = a.AppointmentID
            JOIN Vehicles v ON a.VehicleID = v.VehicleID
            JOIN Customers c ON a.CustomerID = c.CustomerID
            WHERE j.JobID = %s
        """, (job_id,))
        job_info = cursor.fetchone()

        cursor.execute("SELECT ItemName, Quantity, UnitPrice FROM Service_Items WHERE JobID = %s", (job_id,))
        items = cursor.fetchall()

        if not job_info:
            return {"status": "Failed", "message": "ไม่พบข้อมูลใบงาน"}

        return {"status": "Success", "job_info": job_info, "items": items}
    except mysql.connector.Error as e:
        return {"status": "Failed", "message": str(e)}
    finally:
        cursor.close()
        connect.close()
########################################################################################################
#   END get receipt
#------------------------------------------------------------------------------------------------------#
#   START complete
########################################################################################################
@app.put("/jobs/{job_id}/complete")
def complete_job(job_id: int):
    connect = get_data_connection()
    if not connect:
        return {"status": "Failed", "message": "Database connection error"}
    
    cursor = connect.cursor()
    try:
        # อัปเดตสถานะใบงานเป็น Completed
        cursor.execute(
            "UPDATE Service_Jobs SET JobStatus = 'Completed' WHERE JobID = %s",
            (job_id,)
        )
        connect.commit()
        return {"status": "Success", "message": "ปิดงานซ่อมเรียบร้อยแล้ว"}
    except mysql.connector.Error as e:
        connect.rollback()
        return {"status": "Failed", "message": str(e)}
    finally:
        cursor.close()
        connect.close()
