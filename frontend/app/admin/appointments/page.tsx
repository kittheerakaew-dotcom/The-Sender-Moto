"use client";

import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

const ALL_STATUSES = [
  "Pending",
  "Confirmed",
  "In Progress",
  "Ready",
  "Completed",
  "Cancelled",
  "No-Show",
];

const EUROPEAN_BRANDS = [
  "Mercedes-Benz",
  "BMW",
  "Audi",
  "Porsche",
  "Volkswagen",
  "Volvo",
  "MINI",
  "Land Rover",
];

const SERVICE_TYPES = [
  { value: "General Maintenance", label: "General Maintenance (เช็กระยะ ~90 นาที)" },
  { value: "Diagnostics", label: "Diagnostics (วิเคราะห์ระบบไฟ ~60 นาที)" },
  { value: "Suspension", label: "Suspension (ช่วงล่าง/เบรก ~180 นาที)" },
  { value: "Engine Repair", label: "Engine Repair (ซ่อมเครื่อง/เกียร์ ~240 นาที)" },
];

const MORNING_SLOTS = ["08:30", "09:30", "10:30", "11:30"];
const AFTERNOON_SLOTS = ["13:00", "14:00", "15:00", "16:00", "17:00"];
const ALL_WORKSHOP_SLOTS = [...MORNING_SLOTS, ...AFTERNOON_SLOTS];

interface Appointment {
  AppointmentID: number;
  BookingRef?: string;
  AppointmentDate: string;
  AppointmentTime: string;
  ServiceType: string;
  EstimatedMinutes?: number | null;
  Mileage?: number | null;
  Notes?: string | null;
  InternalNotes?: string | null;
  PhotoURL?: string | null;
  Status: string;
  CreatedAtBangkok?: string | null;
  NotificationStatus?: string | null;
  CustomerName: string;
  PhoneNumber: string;
  Email?: string | null;
  LineID?: string | null;
  CarBrand: string;
  CarModel: string;
  CarYear?: number | null;
  CarNumber: string;
}

function maskPhone(phone: string, masked: boolean): string {
  if (!masked || !phone || phone.length < 7) return phone;
  return `${phone.slice(0, 3)}-XXX-${phone.slice(-4)}`;
}

function cleanPhoneDigits(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("66") && (digits.length === 11 || digits.length === 10)) {
    digits = "0" + digits.slice(2);
  }
  return digits.slice(0, 10);
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "Pending":
      return "bg-amber-100 text-amber-800";
    case "Confirmed":
      return "bg-indigo-100 text-indigo-800";
    case "In Progress":
      return "bg-blue-100 text-blue-800";
    case "Ready":
      return "bg-teal-100 text-teal-800";
    case "Completed":
      return "bg-emerald-100 text-emerald-800";
    case "Cancelled":
    case "No-Show":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

export default function AppointmentsDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [maskPII, setMaskPII] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [todayBkk] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })
  );

  // State สำหรับแก้ไขคิวนัดหมาย สถานะ วัน-เวลา เลขไมล์ และโน้ตช่าง
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [editStatus, setEditStatus] = useState("Pending");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editServiceType, setEditServiceType] = useState("General Maintenance");
  const [editMileage, setEditMileage] = useState("");
  const [editMechanic, setEditMechanic] = useState("ช่างประจำศูนย์");
  const [editInternalNotes, setEditInternalNotes] = useState("");
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  // State สำหรับแอดมินเพิ่มคิวนัดหมายใหม่ (Walk-in / โทรจอง)
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [isCreatingWalkIn, setIsCreatingWalkIn] = useState(false);
  const [walkInError, setWalkInError] = useState("");
  const [walkInData, setWalkInData] = useState({
    CustomerName: "",
    PhoneNumber: "",
    LineID: "",
    CarBrand: "Mercedes-Benz",
    CarModel: "",
    CarYear: "",
    CarNumber: "",
    Mileage: "",
    AppointmentDate: "",
    AppointmentTime: "09:00",
    ServiceType: "General Maintenance",
    Notes: "",
  });

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/appointments`);
      if (response.data.status === "Success") {
        setAppointments(response.data.data);
      }
    } catch {
      // แสดงตารางว่างเมื่อไม่สามารถเชื่อมต่อ API ได้
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    axios
      .get(`${API_URL}/appointments`)
      .then((response) => {
        if (response.data.status === "Success") {
          setAppointments(response.data.data);
        }
      })
      .catch(() => {
        // แสดงตารางว่างเมื่อไม่สามารถเชื่อมต่อ API ได้
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!editingAppt && !isWalkInOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditingAppt(null);
        setIsWalkInOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingAppt, isWalkInOpen]);

  // ฟังก์ชันสำหรับกดรับรถเข้าซ่อมด่วน
  const handleAcceptCar = async (appointmentID: number) => {
    if (acceptingId !== null) return;
    if (!confirm("ยืนยันการรับรถเข้าซ่อม และเปิดใบงานให้ช่าง?")) return;

    setAcceptingId(appointmentID);
    try {
      const response = await axios.put(`${API_URL}/appointments/${appointmentID}/accept`);
      if (response.data.status === "Success") {
        fetchAppointments();
      } else {
        alert("เกิดข้อผิดพลาด: " + response.data.message);
      }
    } catch {
      alert("ไม่สามารถเชื่อมต่อระบบได้");
    } finally {
      setAcceptingId(null);
    }
  };

  // ฟังก์ชันสำหรับลบคิวนัดหมายถาวร (สำหรับคิวที่กรอกผิดพลาดหรือคิวทดสอบ)
  const handleDeleteAppointment = async (appt: Appointment) => {
    const refLabel = appt.BookingRef || `#${appt.AppointmentID}`;
    const confirmMsg =
      `ยืนยันการลบคิวซ่อม ${refLabel} ของคุณ ${appt.CustomerName} (${appt.CarNumber}) ออกจากฐานข้อมูลถาวร?\n\n` +
      `คำแนะนำ:\n` +
      `• หากลูกค้าขอยกเลิกนัดปกติ แนะนำให้กดปุ่ม "จัดการ/แก้ไข" แล้วเปลี่ยนสถานะเป็น "Cancelled" เพื่อเก็บประวัติและคืนช่องซ่อม\n` +
      `• กด "ตกลง (OK)" เฉพาะเมื่อต้องการลบคิวที่กรอกผิดพลาดหรือคิวทดสอบออกจากฐานข้อมูลถาวรครับ`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await axios.delete(`${API_URL}/appointments/${appt.AppointmentID}`);
      if (res.data?.status === "Success") {
        if (editingAppt?.AppointmentID === appt.AppointmentID) {
          setEditingAppt(null);
        }
        fetchAppointments();
      } else {
        alert("เกิดข้อผิดพลาด: " + (res.data?.message || "ไม่สามารถลบคิวนัดหมายได้"));
      }
    } catch {
      alert("ไม่สามารถลบคิวนัดหมายได้");
    }
  };

  const openEditModal = (appt: Appointment) => {
    setEditingAppt(appt);
    setEditStatus(appt.Status);
    setEditDate(appt.AppointmentDate);
    setEditTime(appt.AppointmentTime.slice(0, 5));
    setEditServiceType(appt.ServiceType);
    setEditMileage(appt.Mileage ? String(appt.Mileage) : "");
    setEditMechanic("ช่างประจำศูนย์");
    setEditInternalNotes(appt.InternalNotes || "");
  };

  const handleSaveStatusAndNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppt || isSavingStatus) return;

    setIsSavingStatus(true);
    try {
      const res = await axios.put(`${API_URL}/appointments/${editingAppt.AppointmentID}/status`, {
        Status: editStatus,
        InternalNotes: editInternalNotes,
        AppointmentDate: editDate || undefined,
        AppointmentTime: editTime || undefined,
        ServiceType: editServiceType || undefined,
        Mileage: editMileage ? Number(editMileage) : undefined,
        MechanicName: editMechanic || undefined,
      });
      if (res.data?.status === "Success") {
        setEditingAppt(null);
        fetchAppointments();
      } else {
        alert("เกิดข้อผิดพลาด: " + (res.data?.message || "ไม่สามารถบันทึกได้"));
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        alert("เกิดข้อผิดพลาด: " + err.response.data.message);
      } else {
        alert("ไม่สามารถอัปเดตข้อมูลนัดหมายได้");
      }
    } finally {
      setIsSavingStatus(false);
    }
  };

  const openWalkInModal = () => {
    const defaultDate = todayBkk || new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
    setWalkInError("");
    setWalkInData({
      CustomerName: "",
      PhoneNumber: "",
      LineID: "",
      CarBrand: "Mercedes-Benz",
      CarModel: "",
      CarYear: "",
      CarNumber: "",
      Mileage: "",
      AppointmentDate: defaultDate,
      AppointmentTime: "09:30",
      ServiceType: "General Maintenance",
      Notes: "",
    });
    setIsWalkInOpen(true);
  };

  const handleCreateWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingWalkIn) return;

    const cleanPhone = cleanPhoneDigits(walkInData.PhoneNumber);
    if (!/^0[2689]\d{7,8}$/.test(cleanPhone)) {
      setWalkInError("กรุณากรอกเบอร์โทรศัพท์ไทย 9–10 หลักให้ถูกต้อง (เช่น 0808996645)");
      return;
    }

    setIsCreatingWalkIn(true);
    setWalkInError("");
    try {
      const res = await axios.post(`${API_URL}/bookings`, {
        CustomerName: walkInData.CustomerName.trim(),
        PhoneNumber: cleanPhone,
        LineID: walkInData.LineID.trim() || undefined,
        CarBrand: walkInData.CarBrand,
        CarModel: walkInData.CarModel.trim(),
        CarYear: walkInData.CarYear ? Number(walkInData.CarYear) : undefined,
        CarNumber: walkInData.CarNumber.trim(),
        Mileage: walkInData.Mileage ? Number(walkInData.Mileage) : undefined,
        AppointmentDate: walkInData.AppointmentDate,
        AppointmentTime: walkInData.AppointmentTime,
        ServiceType: walkInData.ServiceType,
        Notes: walkInData.Notes.trim() || undefined,
        ConsentPDPA: true,
        ConsentVersion: "v1.0",
      });

      if (res.data?.status === "Success") {
        setIsWalkInOpen(false);
        fetchAppointments();
      } else {
        setWalkInError(res.data?.message || "ไม่สามารถสร้างคิวนัดหมายได้");
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setWalkInError(err.response.data.message);
      } else {
        setWalkInError("ไม่สามารถสร้างคิวนัดหมายได้");
      }
    } finally {
      setIsCreatingWalkIn(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/export/appointments`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "the_sender_moto_appointments.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("ไม่สามารถส่งออกไฟล์ CSV ได้");
    }
  };

  const filteredAppointments = appointments.filter((appt) => {
    if (statusFilter !== "ALL" && appt.Status !== statusFilter) return false;
    if (dateFilter && appt.AppointmentDate !== dateFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      appt.CustomerName.toLowerCase().includes(q) ||
      appt.PhoneNumber.toLowerCase().includes(q) ||
      appt.CarNumber.toLowerCase().includes(q) ||
      appt.CarBrand.toLowerCase().includes(q) ||
      (appt.CarModel || "").toLowerCase().includes(q) ||
      (appt.BookingRef || "").toLowerCase().includes(q) ||
      String(appt.AppointmentID).includes(q)
    );
  });

  // สถิติสรุปสำหรับแอดมิน
  const todayCount = appointments.filter((a) => a.AppointmentDate === todayBkk && a.Status !== "Cancelled").length;
  const pendingOrConfirmedCount = appointments.filter((a) => a.Status === "Pending" || a.Status === "Confirmed").length;
  const inServiceCount = appointments.filter((a) => a.Status === "In Progress" || a.Status === "Ready").length;
  const doneOrCancelledCount = appointments.filter(
    (a) => a.Status === "Completed" || a.Status === "Cancelled" || a.Status === "No-Show"
  ).length;

  // จัดกลุ่มตามวันที่สำหรับโหมดปฏิทิน (Calendar View)
  const groupedByDate = filteredAppointments.reduce<Record<string, Appointment[]>>((acc, appt) => {
    const d = appt.AppointmentDate;
    if (!acc[d]) acc[d] = [];
    acc[d].push(appt);
    return acc;
  }, {});

  return (
    <div className="min-h-full bg-slate-100 p-4 sm:p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* แถบสถิติภาพรวมคิวซ่อม (KPI Summary Cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">คิวทั้งหมดในระบบ</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{appointments.length}</div>
          </div>
          <div className="bg-white border border-blue-200 rounded-2xl p-4 shadow-xs">
            <span className="text-xs font-semibold text-blue-600">นัดหมายวันนี้</span>
            <div className="text-2xl font-extrabold text-blue-700 mt-1">{todayCount}</div>
          </div>
          <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-xs">
            <span className="text-xs font-semibold text-amber-600">รอยืนยัน / นัดไว้</span>
            <div className="text-2xl font-extrabold text-amber-700 mt-1">{pendingOrConfirmedCount}</div>
          </div>
          <div className="bg-white border border-indigo-200 rounded-2xl p-4 shadow-xs">
            <span className="text-xs font-semibold text-indigo-600">กำลังซ่อม / พร้อมรับ</span>
            <div className="text-2xl font-extrabold text-indigo-700 mt-1">{inServiceCount}</div>
          </div>
          <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-xs col-span-2 sm:col-span-1">
            <span className="text-xs font-semibold text-emerald-600">เสร็จสิ้น / ยกเลิก</span>
            <div className="text-2xl font-extrabold text-emerald-700 mt-1">{doneOrCancelledCount}</div>
          </div>
        </div>

        {/* การ์ดหลักสำหรับจัดการตารางนัดหมาย */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 overflow-hidden p-4 sm:p-6 md:p-8">
          <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 mb-6 border-b border-slate-200 pb-4">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">
                ตารางนัดหมาย (Appointments) — The Sender Moto
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                รับรถเข้าซ่อม แก้ไขวัน-เวลานัดหมาย เปลี่ยนสถานะ หรือลบคิวที่กรอกผิดพลาด
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={fetchAppointments}
                className="border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors"
              >
                รีเฟรช
              </button>
              <button
                type="button"
                onClick={() => setViewMode(viewMode === "table" ? "calendar" : "table")}
                className="border border-blue-600 bg-blue-50 text-blue-900 hover:bg-blue-100 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
              >
                {viewMode === "table" ? "มุมมองปฏิทินรายวัน" : "มุมมองตาราง"}
              </button>
              <button
                type="button"
                onClick={() => setMaskPII(!maskPII)}
                className="border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors"
              >
                {maskPII ? "แสดงเบอร์โทรเต็ม" : "ซ่อนเบอร์โทร (PDPA)"}
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="border border-slate-700 text-slate-800 hover:bg-slate-50 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
              >
                ส่งออก CSV
              </button>
              <button
                type="button"
                onClick={openWalkInModal}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-sm"
              >
                + เพิ่มคิวนัดหมาย (Walk-in / โทรจอง)
              </button>
            </div>
          </div>

          {/* แถบค้นหา กรองสถานะ และกรองวันที่ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="sm:col-span-2">
              <label htmlFor="appt-search" className="sr-only">ค้นหานัดหมาย</label>
              <input
                id="appt-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อลูกค้า, ทะเบียนรถ, รุ่นรถ, เบอร์โทร หรือรหัสจอง SM-..."
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label htmlFor="appt-status-filter" className="sr-only">กรองตามสถานะ</label>
              <select
                id="appt-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="ALL">สถานะทั้งหมด ({appointments.length})</option>
                {ALL_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDateFilter("")}
                  className="px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-600 hover:bg-slate-50"
                >
                  ล้างวัน
                </button>
              )}
            </div>
          </div>

          {viewMode === "calendar" ? (
            <div className="space-y-6">
              {Object.keys(groupedByDate).length === 0 ? (
                <div className="text-center p-10 text-slate-500">ไม่พบรายการนัดหมายตามเงื่อนไขที่เลือก</div>
              ) : (
                Object.entries(groupedByDate).map(([dateStr, dayAppts]) => (
                  <div key={dateStr} className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
                      <span className="font-bold text-sm sm:text-base">วันที่นัดหมาย: {dateStr}</span>
                      <span className="text-xs bg-blue-600 text-white font-bold px-3 py-0.5 rounded-full">
                        {dayAppts.length} คัน
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-slate-50">
                      {dayAppts.map((appt) => (
                        <div key={appt.AppointmentID} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-slate-900 text-base">
                              {appt.AppointmentTime.slice(0, 5)} น.
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadgeClass(appt.Status)}`}>
                              {appt.Status}
                            </span>
                          </div>
                          <div className="text-xs text-blue-700 font-bold">{appt.BookingRef}</div>
                          <div className="text-sm font-bold text-slate-800">
                            {appt.CarBrand} {appt.CarModel} ({appt.CarNumber})
                          </div>
                          <div className="text-xs text-slate-600">
                            ลูกค้า: {appt.CustomerName} ({maskPhone(appt.PhoneNumber, maskPII)})
                          </div>
                          <div className="text-xs text-slate-500">
                            บริการ: {appt.ServiceType} {appt.EstimatedMinutes ? `(~${appt.EstimatedMinutes} นาที)` : ""}
                          </div>
                          <div className="pt-2 flex justify-end gap-2">
                            {(appt.Status === "Pending" || appt.Status === "Confirmed") && (
                              <button
                                type="button"
                                disabled={acceptingId === appt.AppointmentID}
                                onClick={() => handleAcceptCar(appt.AppointmentID)}
                                className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-semibold"
                              >
                                รับรถเข้าซ่อม
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditModal(appt)}
                              className="text-xs px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-semibold"
                            >
                              จัดการ / แก้ไข
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAppointment(appt)}
                              className="text-xs px-2.5 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-semibold"
                            >
                              ลบ
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div>
              {/* มุมมองการ์ดสำหรับหน้าจอมือถือ (Mobile Responsive Cards) */}
              <div className="md:hidden space-y-4">
                {filteredAppointments.map((appt) => (
                  <div
                    key={appt.AppointmentID}
                    className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-2.5"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="font-extrabold text-blue-700 text-sm">
                          {appt.BookingRef || `#${appt.AppointmentID}`}
                        </span>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {appt.AppointmentDate} • {appt.AppointmentTime.slice(0, 5)} น.
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(appt.Status)}`}>
                        {appt.Status}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-slate-900">
                      {appt.CarBrand} {appt.CarModel} {appt.CarYear ? `(${appt.CarYear})` : ""} • {appt.CarNumber}
                    </div>
                    <div className="text-xs text-slate-700">
                      ลูกค้า: <span className="font-semibold">{appt.CustomerName}</span> ({maskPhone(appt.PhoneNumber, maskPII)})
                    </div>
                    <div className="text-xs text-slate-600">
                      บริการ: <span className="font-medium text-slate-800">{appt.ServiceType}</span>
                    </div>
                    {appt.Notes && (
                      <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200">
                        อาการ: {appt.Notes}
                      </div>
                    )}
                    {appt.InternalNotes && (
                      <div className="text-xs text-indigo-700 bg-indigo-50 p-2 rounded border border-indigo-100">
                        โน้ตช่าง: {appt.InternalNotes}
                      </div>
                    )}

                    <div className="pt-2 flex flex-wrap gap-2">
                      {(appt.Status === "Pending" || appt.Status === "Confirmed") && (
                        <button
                          type="button"
                          disabled={acceptingId === appt.AppointmentID}
                          onClick={() => handleAcceptCar(appt.AppointmentID)}
                          className="flex-1 min-h-10 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                        >
                          {acceptingId === appt.AppointmentID ? "กำลังเปิดใบงาน..." : "รับรถเข้าซ่อม"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditModal(appt)}
                        className="flex-1 min-h-10 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                      >
                        จัดการ / แก้ไข
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAppointment(appt)}
                        className="min-h-10 px-3 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors"
                      >
                        ลบคิว
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ตารางข้อมูลสำหรับแท็บเล็ตและคอมพิวเตอร์ */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="p-4 border-b-2">รหัสจอง</th>
                      <th className="p-4 border-b-2">วัน-เวลาที่นัด</th>
                      <th className="p-4 border-b-2">ลูกค้า / เบอร์โทร</th>
                      <th className="p-4 border-b-2">รถยนต์ / ทะเบียน</th>
                      <th className="p-4 border-b-2">บริการ / อาการ</th>
                      <th className="p-4 border-b-2">สถานะ</th>
                      <th className="p-4 border-b-2 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAppointments.map((appt) => (
                      <tr key={appt.AppointmentID} className="hover:bg-slate-50 border-b transition-colors">
                        <td className="p-4 text-slate-600">
                          <div className="font-bold text-blue-700">{appt.BookingRef || `#${appt.AppointmentID}`}</div>
                          {appt.CreatedAtBangkok && (
                            <div className="text-[11px] text-slate-400">
                              จองเมื่อ: {appt.CreatedAtBangkok.slice(0, 16)}
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-semibold text-slate-800">
                          {appt.AppointmentDate} <br />
                          <span className="text-xs text-slate-500 font-normal">
                            {appt.AppointmentTime.slice(0, 5)} น. {appt.EstimatedMinutes ? `(~${appt.EstimatedMinutes} นาที)` : ""}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{appt.CustomerName}</div>
                          <div className="text-xs text-slate-600 font-mono">
                            {maskPhone(appt.PhoneNumber, maskPII)}
                          </div>
                          {appt.LineID && <div className="text-xs text-emerald-700">LINE: {appt.LineID}</div>}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-800">
                            {appt.CarBrand} {appt.CarModel} {appt.CarYear ? `(${appt.CarYear})` : ""}
                          </div>
                          <div className="text-xs text-slate-500">
                            ทะเบียน: <strong className="text-slate-700">{appt.CarNumber}</strong>{" "}
                            {appt.Mileage ? `• ${Number(appt.Mileage).toLocaleString()} กม.` : ""}
                          </div>
                        </td>
                        <td className="p-4 text-slate-600">
                          <div className="font-semibold text-slate-800">{appt.ServiceType}</div>
                          {appt.Notes && (
                            <div className="text-xs text-slate-500 mt-0.5 max-w-xs truncate" title={appt.Notes}>
                              อาการ: {appt.Notes}
                            </div>
                          )}
                          {appt.InternalNotes && (
                            <div className="text-xs text-indigo-600 mt-0.5 max-w-xs truncate" title={appt.InternalNotes}>
                              โน้ตช่าง: {appt.InternalNotes}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadgeClass(appt.Status)}`}>
                            {appt.Status}
                          </span>
                        </td>
                        <td className="p-4 text-center space-x-1.5">
                          {(appt.Status === "Pending" || appt.Status === "Confirmed") && (
                            <button
                              type="button"
                              disabled={acceptingId === appt.AppointmentID}
                              onClick={() => handleAcceptCar(appt.AppointmentID)}
                              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-xs"
                            >
                              {acceptingId === appt.AppointmentID ? "กำลังเปิด..." : "รับรถเข้าซ่อม"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditModal(appt)}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-xs"
                          >
                            จัดการ / แก้ไข
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAppointment(appt)}
                            className="border border-red-300 text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                            title="ลบคิวซ่อมออกจากฐานข้อมูล"
                          >
                            ลบคิว
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isLoading && (
                <div className="text-center p-10 text-slate-500 text-sm">
                  กำลังโหลดตารางนัดหมาย กรุณารอสักครู่ครับ...
                </div>
              )}
              {!isLoading && filteredAppointments.length === 0 && (
                <div className="text-center p-10 text-slate-500 text-sm">
                  ไม่พบข้อมูลการจองคิวตามเงื่อนไขที่ค้นหาครับ
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal จัดการ/แก้ไขคิวนัดหมาย เปลี่ยนสถานะ เลื่อนวัน-เวลา และบันทึกโน้ตช่าง */}
      {editingAppt && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[92dvh] flex flex-col overflow-hidden">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-blue-400">
                  จัดการนัดหมาย {editingAppt.BookingRef || `#${editingAppt.AppointmentID}`}
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  {editingAppt.CustomerName} • {editingAppt.CarBrand} {editingAppt.CarModel} ({editingAppt.CarNumber})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAppt(null)}
                className="text-slate-300 hover:text-white text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveStatusAndNotes} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              <div>
                <label htmlFor="edit-appt-status" className="block text-sm font-semibold text-slate-700 mb-1">
                  สถานะคิวซ่อม (Status Lifecycle)
                </label>
                <select
                  id="edit-appt-status"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  {ALL_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-appt-date" className="block text-sm font-medium text-slate-700 mb-1">
                    วันที่นัดหมาย
                  </label>
                  <input
                    id="edit-appt-date"
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="edit-appt-time" className="block text-sm font-medium text-slate-700 mb-1">
                    เวลานัดหมาย (ช่วงเช้า / ช่วงบ่าย)
                  </label>
                  <select
                    id="edit-appt-time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    {editTime && !ALL_WORKSHOP_SLOTS.includes(editTime) && (
                      <option value={editTime}>{editTime} น. (เวลาเดิม)</option>
                    )}
                    <optgroup label="☀️ ช่วงเช้า (08:30 – 11:30 น.)">
                      {MORNING_SLOTS.map((t) => (
                        <option key={t} value={t}>
                          {t} น. (ช่วงเช้า)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🌤️ ช่วงบ่าย (13:00 – 17:00 น.)">
                      {AFTERNOON_SLOTS.map((t) => (
                        <option key={t} value={t}>
                          {t} น. (ช่วงบ่าย)
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-appt-service" className="block text-sm font-medium text-slate-700 mb-1">
                    ประเภทบริการ
                  </label>
                  <select
                    id="edit-appt-service"
                    value={editServiceType}
                    onChange={(e) => setEditServiceType(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    {SERVICE_TYPES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.value}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-appt-mileage" className="block text-sm font-medium text-slate-700 mb-1">
                    เลขไมล์รถ (กม.)
                  </label>
                  <input
                    id="edit-appt-mileage"
                    type="number"
                    min={0}
                    max={2000000}
                    value={editMileage}
                    onChange={(e) => setEditMileage(e.target.value)}
                    placeholder="เช่น 45000"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-appt-notes" className="block text-sm font-medium text-slate-700 mb-1">
                  หมายเหตุภายในสำหรับช่าง / แอดมิน (Internal Notes)
                </label>
                <textarea
                  id="edit-appt-notes"
                  rows={3}
                  maxLength={1000}
                  value={editInternalNotes}
                  onChange={(e) => setEditInternalNotes(e.target.value)}
                  placeholder="เช่น รออะไหล่แท้จากศูนย์, ลูกค้าขอรับรถไม่เกิน 16:00 น."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              {editingAppt.PhotoURL && (
                <div>
                  <span className="block text-xs font-medium text-slate-600 mb-1">
                    รูปภาพอาการรถที่ลูกค้าแนบมา:
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={editingAppt.PhotoURL}
                    alt="รูปอาการรถของลูกค้า"
                    className="max-h-40 rounded-lg border border-slate-200 object-contain"
                  />
                </div>
              )}

              <div className="flex flex-wrap justify-between items-center gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => handleDeleteAppointment(editingAppt)}
                  className="px-3.5 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold"
                >
                  ลบคิวนี้ถาวร
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingAppt(null)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingStatus}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-60"
                  >
                    {isSavingStatus ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal เพิ่มคิวนัดหมายใหม่สำหรับแอดมิน (Walk-in / โทรจอง) */}
      {isWalkInOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-xl max-h-[92dvh] flex flex-col overflow-hidden">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex justify-between items-center shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-blue-400">
                + เพิ่มคิวนัดหมายใหม่ (Walk-in / ลูกค้าโทรจอง)
              </h2>
              <button
                type="button"
                onClick={() => setIsWalkInOpen(false)}
                className="text-slate-300 hover:text-white text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateWalkIn} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              {walkInError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
                  {walkInError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="walkin-name" className="block text-sm font-medium text-slate-700 mb-1">
                    ชื่อลูกค้า *
                  </label>
                  <input
                    id="walkin-name"
                    required
                    type="text"
                    maxLength={100}
                    value={walkInData.CustomerName}
                    onChange={(e) => setWalkInData({ ...walkInData, CustomerName: e.target.value })}
                    placeholder="เช่น คุณสมชาย ใจดี"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="walkin-phone" className="block text-sm font-medium text-slate-700 mb-1">
                    เบอร์โทรศัพท์ * <span className="text-xs text-blue-600">(10 หลัก CHAR(10))</span>
                  </label>
                  <input
                    id="walkin-phone"
                    required
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={walkInData.PhoneNumber}
                    onChange={(e) =>
                      setWalkInData({ ...walkInData, PhoneNumber: cleanPhoneDigits(e.target.value) })
                    }
                    placeholder="0808996645"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="walkin-brand" className="block text-sm font-medium text-slate-700 mb-1">
                    ยี่ห้อรถ *
                  </label>
                  <select
                    id="walkin-brand"
                    value={walkInData.CarBrand}
                    onChange={(e) => setWalkInData({ ...walkInData, CarBrand: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    {EUROPEAN_BRANDS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="walkin-model" className="block text-sm font-medium text-slate-700 mb-1">
                    รุ่นรถ *
                  </label>
                  <input
                    id="walkin-model"
                    required
                    type="text"
                    maxLength={80}
                    value={walkInData.CarModel}
                    onChange={(e) => setWalkInData({ ...walkInData, CarModel: e.target.value })}
                    placeholder="เช่น C350e, 320d"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="walkin-plate" className="block text-sm font-medium text-slate-700 mb-1">
                    ทะเบียนรถ *
                  </label>
                  <input
                    id="walkin-plate"
                    required
                    type="text"
                    maxLength={15}
                    value={walkInData.CarNumber}
                    onChange={(e) => setWalkInData({ ...walkInData, CarNumber: e.target.value })}
                    placeholder="เช่น 1กข 1234"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="walkin-date" className="block text-sm font-medium text-slate-700 mb-1">
                    วันที่นัด *
                  </label>
                  <input
                    id="walkin-date"
                    required
                    type="date"
                    min={todayBkk}
                    value={walkInData.AppointmentDate}
                    onChange={(e) => setWalkInData({ ...walkInData, AppointmentDate: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="walkin-time" className="block text-sm font-medium text-slate-700 mb-1">
                    เวลา (ช่วงเช้า / ช่วงบ่าย) *
                  </label>
                  <select
                    id="walkin-time"
                    required
                    value={walkInData.AppointmentTime}
                    onChange={(e) => setWalkInData({ ...walkInData, AppointmentTime: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <optgroup label="☀️ ช่วงเช้า (08:30 – 11:30 น.)">
                      {MORNING_SLOTS.map((t) => (
                        <option key={t} value={t}>
                          {t} น. (ช่วงเช้า)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🌤️ ช่วงบ่าย (13:00 – 17:00 น.)">
                      {AFTERNOON_SLOTS.map((t) => (
                        <option key={t} value={t}>
                          {t} น. (ช่วงบ่าย)
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label htmlFor="walkin-mileage" className="block text-sm font-medium text-slate-700 mb-1">
                    เลขไมล์ (กม.)
                  </label>
                  <input
                    id="walkin-mileage"
                    type="number"
                    min={0}
                    max={2000000}
                    value={walkInData.Mileage}
                    onChange={(e) => setWalkInData({ ...walkInData, Mileage: e.target.value })}
                    placeholder="เช่น 50000"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="walkin-service" className="block text-sm font-medium text-slate-700 mb-1">
                  ประเภทบริการ *
                </label>
                <select
                  id="walkin-service"
                  value={walkInData.ServiceType}
                  onChange={(e) => setWalkInData({ ...walkInData, ServiceType: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  {SERVICE_TYPES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="walkin-notes" className="block text-sm font-medium text-slate-700 mb-1">
                  อาการเบื้องต้น / รายละเอียดเพิ่มเติม
                </label>
                <input
                  id="walkin-notes"
                  type="text"
                  maxLength={500}
                  value={walkInData.Notes}
                  onChange={(e) => setWalkInData({ ...walkInData, Notes: e.target.value })}
                  placeholder="ระบุอาการที่ลูกค้าแจ้ง"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsWalkInOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isCreatingWalkIn}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold disabled:opacity-60"
                >
                  {isCreatingWalkIn ? "กำลังบันทึก..." : "บันทึกคิวนัดหมาย"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
