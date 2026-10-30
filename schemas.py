from pydantic import BaseModel, Field
from datetime import date, time

class CustomerCreate(BaseModel):
    CustomerName:       str
    Address:            str |   None    =   None
    PhoneNumber:        str
    Email:              str |   None    =   None
    CustomerTier:       str =   "Standard"

class VehicleCreate(BaseModel):
    CustomerID:         int
    CarBrand:           str
    CarNumber:          str
    CarModel:           str |   None    =   None
    VINCODE:            str

class AppointmentCreate(BaseModel):
    CustomerID:         int
    VehicleID:          int
    AppointmentDate:    date
    AppointmentTime:    time
    ServiceType:        str
    Notes:              str |   None    =   None

class ServiceJobCreate(BaseModel):
    AppointmentID:      int
    MechanicName:       str
    JobStatus:          str     =   "In Progress"
    TotalCost:          float   =   0.00

class ServiceItemCreate(BaseModel):
    JobID:              int |   None    =   None
    ItemName:           str
    Quantity:           int     =   Field(default=1, ge=1)
    UnitPrice:          float   =   Field(ge=0)

class BookingCreate(BaseModel):
    CustomerName: str
    PhoneNumber: str
    CarBrand: str
    CarModel: str
    CarNumber: str
    AppointmentDate: str
    AppointmentTime: str
    ServiceType: str
    Notes: str | None = None
    Website: str | None = ""
