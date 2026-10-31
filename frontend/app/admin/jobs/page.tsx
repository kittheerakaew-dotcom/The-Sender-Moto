"use client";

import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

const JOB_STATUSES = [
  "In Progress",
  "Ready",
  "Completed",
  "Cancelled",
];

interface Job {
  JobID: number;
  AppointmentID?: number;
  BookingRef?: string;
  AppointmentDate?: string;
  ServiceType?: string;
  MechanicName: string;
  JobStatus: string;
  InternalNotes?: string | null;
  TotalCost: string | number;
  CarBrand: string;
  CarModel: string;
  CarYear?: number | null;
  CarNumber: string;
  CustomerName: string;
  PhoneNumber?: string;
}

interface ReceiptItem {
  ItemID?: number;
  ItemName: string;
  Quantity: number;
  UnitPrice: number | string;
}

interface ReceiptData {
  job_info: {
    JobID: number;
    MechanicName?: string;
    JobStatus?: string;
    BookingRef?: string;
    AppointmentDate?: string;
    ServiceType?: string;
    TotalCost: number | string;
    CarBrand: string;
    CarModel: string;
    CarNumber: string;
    CustomerName: string;
    PhoneNumber: string;
  };
  items: ReceiptItem[];
}

export default function JobsDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State สำหรับจัดการรายการอะไหล่/ค่าแรงในใบงาน (เพิ่ม + ดู + ลบรายการที่คีย์ผิด)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobItems, setJobItems] = useState<ReceiptItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [itemData, setItemData] = useState({ ItemName: "", Quantity: 1, UnitPrice: 0 });
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);

  // State สำหรับค้นหา กรอง และแก้ไขข้อมูลใบงาน/ช่าง/หมายเหตุช่าง
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editJobStatus, setEditJobStatus] = useState("In Progress");
  const [editMechanicName, setEditMechanicName] = useState("ช่างประจำศูนย์");
  const [editInternalNotes, setEditInternalNotes] = useState("");
  const [isSavingJob, setIsSavingJob] = useState(false);

  // State สำหรับระบบใบเสร็จรับเงิน
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/jobs`);
      if (response.data.status === "Success") setJobs(response.data.data);
    } catch {
      // แสดงตารางว่างเมื่อไม่สามารถเชื่อมต่อ API ได้
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    axios
      .get(`${API_URL}/jobs`)
      .then((response) => {
        if (response.data.status === "Success") setJobs(response.data.data);
      })
      .catch(() => {
        // แสดงตารางว่างเมื่อไม่สามารถเชื่อมต่อ API ได้
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!editingJob && !selectedJob && !isReceiptOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditingJob(null);
        setSelectedJob(null);
        setIsReceiptOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingJob, selectedJob, isReceiptOpen]);

  const loadJobItems = async (jobID: number) => {
    setIsLoadingItems(true);
    try {
      const res = await axios.get(`${API_URL}/jobs/${jobID}/receipt`);
      if (res.data?.status === "Success") {
        setJobItems(res.data.items || []);
      }
    } catch {
      setJobItems([]);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const openItemsModal = (job: Job) => {
    setSelectedJob(job);
    setItemData({ ItemName: "", Quantity: 1, UnitPrice: 0 });
    loadJobItems(job.JobID);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingItem || selectedJob === null) return;

    setIsSubmittingItem(true);
    try {
      const response = await axios.post(`${API_URL}/jobs/${selectedJob.JobID}/items`, itemData);
      if (response.data.status !== "Success") {
        alert("เกิดข้อผิดพลาด: " + (response.data.message || "ไม่สามารถเพิ่มรายการได้"));
        return;
      }
      setItemData({ ItemName: "", Quantity: 1, UnitPrice: 0 });
      await loadJobItems(selectedJob.JobID);
      fetchJobs();
    } catch {
      alert("เกิดข้อผิดพลาดในการบันทึกรายการอะไหล่");
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleDeleteItem = async (itemID?: number, itemName?: string) => {
    if (!selectedJob || !itemID) return;
    if (!confirm(`ยืนยันการลบรายการ "${itemName}" ออกจากใบงาน JOB-${selectedJob.JobID} ?`)) return;

    try {
      const res = await axios.delete(`${API_URL}/jobs/${selectedJob.JobID}/items/${itemID}`);
      if (res.data?.status === "Success") {
        await loadJobItems(selectedJob.JobID);
        fetchJobs();
      } else {
        alert(res.data?.message || "ไม่สามารถลบรายการได้");
      }
    } catch {
      alert("ไม่สามารถลบรายการอะไหล่ได้");
    }
  };

  const handleViewReceipt = async (jobID: number) => {
    try {
      const response = await axios.get(`${API_URL}/jobs/${jobID}/receipt`);
      if (response.data.status === "Success") {
        setReceiptData(response.data);
        setIsReceiptOpen(true);
      }
    } catch {
      alert("ไม่สามารถดึงข้อมูลใบเสร็จได้");
    }
  };

  // ฟังก์ชันสำหรับปิดงานซ่อม
  const handleCompleteJob = async (jobID: number) => {
    if (!confirm("ยืนยันว่าชำระเงินและส่งมอบรถเรียบร้อยแล้ว?")) return;
    try {
      const response = await axios.put(`${API_URL}/jobs/${jobID}/complete`);
      if (response.data.status === "Success") {
        fetchJobs();
      } else {
        alert("เกิดข้อผิดพลาด: " + response.data.message);
      }
    } catch {
      alert("ไม่สามารถเชื่อมต่อระบบได้");
    }
  };

  // ฟังก์ชันสำหรับลบใบงานซ่อมที่เปิดผิดพลาด
  const handleDeleteJob = async (job: Job) => {
    const confirmMsg = `ยืนยันการลบใบงาน JOB-${job.JobID} (${job.CarBrand} ${job.CarModel} • ${job.CarNumber}) ?\n\nหมายเหตุ: รายการอะไหล่ในใบงานนี้จะถูกลบออก และสถานะคิวนัดหมายจะถูกปรับกลับเป็น Confirmed อัตโนมัติครับ`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await axios.delete(`${API_URL}/jobs/${job.JobID}`);
      if (res.data?.status === "Success") {
        if (editingJob?.JobID === job.JobID) setEditingJob(null);
        fetchJobs();
      } else {
        alert(res.data?.message || "ไม่สามารถลบใบงานได้");
      }
    } catch {
      alert("ไม่สามารถลบใบงานซ่อมได้");
    }
  };

  const openEditJobModal = (job: Job) => {
    setEditingJob(job);
    setEditJobStatus(job.JobStatus);
    setEditMechanicName(job.MechanicName || "ช่างประจำศูนย์");
    setEditInternalNotes(job.InternalNotes || "");
  };

  const handleSaveJobStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob || isSavingJob) return;

    setIsSavingJob(true);
    try {
      const res = await axios.put(`${API_URL}/jobs/${editingJob.JobID}/status`, {
        Status: editJobStatus,
        MechanicName: editMechanicName.trim() || "ช่างประจำศูนย์",
        InternalNotes: editInternalNotes,
      });
      if (res.data?.status === "Success") {
        setEditingJob(null);
        fetchJobs();
      } else {
        alert("เกิดข้อผิดพลาด: " + (res.data?.message || "ไม่สามารถอัปเดตได้"));
      }
    } catch {
      alert("ไม่สามารถอัปเดตสถานะใบงานได้");
    } finally {
      setIsSavingJob(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/export/jobs`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "the_sender_moto_jobs.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("ไม่สามารถส่งออกไฟล์ CSV ได้");
    }
  };

  const filteredJobs = jobs.filter((job) => {
    if (statusFilter !== "ALL" && job.JobStatus !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      `job-${job.JobID}`.includes(q) ||
      (job.BookingRef || "").toLowerCase().includes(q) ||
      job.CustomerName.toLowerCase().includes(q) ||
      job.CarNumber.toLowerCase().includes(q) ||
      job.CarBrand.toLowerCase().includes(q) ||
      (job.CarModel || "").toLowerCase().includes(q) ||
      (job.MechanicName || "").toLowerCase().includes(q) ||
      (job.InternalNotes || "").toLowerCase().includes(q)
    );
  });

  // สรุปสถิติใบงานซ่อมและรายได้
  const inProgressCount = jobs.filter((j) => j.JobStatus === "In Progress").length;
  const readyCount = jobs.filter((j) => j.JobStatus === "Ready").length;
  const totalRevenue = jobs
    .filter((j) => j.JobStatus !== "Cancelled")
    .reduce((sum, j) => sum + Number(j.TotalCost || 0), 0);

  const currentItemsTotal = jobItems.reduce(
    (sum, item) => sum + Number(item.Quantity) * Number(item.UnitPrice),
    0
  );

  return (
    <div className="min-h-full bg-slate-100 p-4 sm:p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6 print:hidden">
        
        {/* แถบสถิติภาพรวมใบงานซ่อม (KPI Summary Cards) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">ใบงานซ่อมทั้งหมด</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{jobs.length}</div>
          </div>
          <div className="bg-white border border-blue-200 rounded-2xl p-4 sm:p-5 shadow-xs">
            <span className="text-xs font-semibold text-blue-600">กำลังซ่อม (In Progress)</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-700 mt-1">{inProgressCount}</div>
          </div>
          <div className="bg-white border border-teal-200 rounded-2xl p-4 sm:p-5 shadow-xs">
            <span className="text-xs font-semibold text-teal-600">รถพร้อมส่งมอบ (Ready)</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-teal-700 mt-1">{readyCount}</div>
          </div>
          <div className="bg-white border border-emerald-200 rounded-2xl p-4 sm:p-5 shadow-xs">
            <span className="text-xs font-semibold text-emerald-600">ยอดรวมค่าซ่อมสะสม (บาท)</span>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1 truncate">
              {totalRevenue.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* การ์ดหลักสำหรับตารางใบงานซ่อม */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 overflow-hidden p-4 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b border-slate-200 pb-4">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">
                ใบงานซ่อม (Service Jobs) — The Sender Moto
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                เพิ่ม/ลบรายการอะไหล่ กำหนดช่างผู้รับผิดชอบ บันทึกโน้ตช่าง ปิดงานซ่อม และพิมพ์ใบเสร็จรับเงิน
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={fetchJobs}
                className="border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors"
              >
                รีเฟรช
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
              >
                ส่งออก CSV
              </button>
            </div>
          </div>

          {/* แถบค้นหาและตัวกรองสถานะใบงาน */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <div className="md:col-span-2">
              <label htmlFor="job-search" className="sr-only">ค้นหาใบงานซ่อม</label>
              <input
                id="job-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหารหัส JOB-..., รหัสจอง SM-..., ชื่อลูกค้า, ทะเบียนรถ, ชื่อช่าง หรือโน้ตช่าง..."
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label htmlFor="job-status-filter" className="sr-only">กรองตามสถานะใบงาน</label>
              <select
                id="job-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="ALL">สถานะทั้งหมด ({jobs.length})</option>
                {JOB_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* มุมมองการ์ดสำหรับหน้าจอมือถือ (Mobile Responsive Cards) */}
          <div className="md:hidden space-y-4">
            {filteredJobs.map((job) => (
              <div
                key={job.JobID}
                className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-2.5"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="font-extrabold text-slate-900 text-base">JOB-{job.JobID}</span>
                    {job.BookingRef && (
                      <span className="ml-2 text-xs text-blue-700 font-semibold">{job.BookingRef}</span>
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      job.JobStatus === "Completed"
                        ? "bg-emerald-100 text-emerald-800"
                        : job.JobStatus === "Ready"
                        ? "bg-teal-100 text-teal-800"
                        : job.JobStatus === "Cancelled"
                        ? "bg-red-100 text-red-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {job.JobStatus}
                  </span>
                </div>

                <div className="text-sm font-bold text-slate-800">
                  {job.CarBrand} {job.CarModel} ({job.CarNumber})
                </div>
                <div className="text-xs text-slate-600">
                  ลูกค้า: <strong>{job.CustomerName}</strong> • ช่าง: <strong>{job.MechanicName}</strong>
                </div>
                {job.InternalNotes && (
                  <div className="text-xs text-indigo-700 bg-indigo-50 p-2 rounded border border-indigo-100">
                    โน้ตช่าง: {job.InternalNotes}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-xs text-slate-500">ยอดรวมสุทธิ:</span>
                  <span className="font-extrabold text-emerald-600 text-base">
                    {Number(job.TotalCost).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  {job.JobStatus !== "Completed" && job.JobStatus !== "Cancelled" && (
                    <>
                      <button
                        type="button"
                        onClick={() => openItemsModal(job)}
                        className="min-h-10 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                      >
                        จัดการอะไหล่ / ค่าแรง
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCompleteJob(job.JobID)}
                        className="min-h-10 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                      >
                        ✓ ปิดงานซ่อม
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => openEditJobModal(job)}
                    className="min-h-10 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                  >
                    สถานะ / ช่าง / โน้ต
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewReceipt(job.JobID)}
                    className="min-h-10 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors"
                  >
                    ใบเสร็จ / พิมพ์
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
                  <th className="p-4 border-b-2">รหัสงาน</th>
                  <th className="p-4 border-b-2">ลูกค้า / รถยนต์</th>
                  <th className="p-4 border-b-2">ช่างผู้รับผิดชอบ</th>
                  <th className="p-4 border-b-2">สถานะ / โน้ตช่าง</th>
                  <th className="p-4 border-b-2 text-right">ยอดรวม (บาท)</th>
                  <th className="p-4 border-b-2 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => (
                  <tr key={job.JobID} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-semibold text-slate-800">
                      <div className="font-extrabold text-slate-900">JOB-{job.JobID}</div>
                      {job.BookingRef && <div className="text-xs text-blue-700 font-semibold">{job.BookingRef}</div>}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{job.CustomerName}</div>
                      <div className="text-xs text-slate-500">
                        {job.CarBrand} {job.CarModel} ({job.CarNumber})
                      </div>
                    </td>
                    <td className="p-4 text-slate-700 font-medium">{job.MechanicName || "ช่างประจำศูนย์"}</td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          job.JobStatus === "Completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : job.JobStatus === "Ready"
                            ? "bg-teal-100 text-teal-800"
                            : job.JobStatus === "Cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {job.JobStatus}
                      </span>
                      {job.InternalNotes && (
                        <div className="text-xs text-indigo-600 mt-1 max-w-xs truncate" title={job.InternalNotes}>
                          โน้ตช่าง: {job.InternalNotes}
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-extrabold text-emerald-600 text-right">
                      {Number(job.TotalCost).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center space-x-1.5">
                      {job.JobStatus !== "Completed" && job.JobStatus !== "Cancelled" && (
                        <>
                          <button
                            type="button"
                            onClick={() => openItemsModal(job)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-xs"
                          >
                            อะไหล่ / ค่าแรง
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCompleteJob(job.JobID)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-xs"
                          >
                            ✓ ปิดงานซ่อม
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditJobModal(job)}
                        className="border border-slate-300 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                      >
                        สถานะ / ช่าง
                      </button>
                      <button
                        type="button"
                        onClick={() => handleViewReceipt(job.JobID)}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-xs"
                      >
                        ใบเสร็จ
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteJob(job)}
                        className="border border-red-300 text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        title="ลบใบงานซ่อมที่เปิดผิดพลาด"
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isLoading && (
            <div className="text-center p-10 text-slate-500 text-sm">
              กำลังโหลดข้อมูลใบงานซ่อม กรุณารอสักครู่ครับ...
            </div>
          )}
          {!isLoading && filteredJobs.length === 0 && (
            <div className="text-center p-10 text-slate-500 text-sm">
              ไม่พบข้อมูลใบงานซ่อมตามเงื่อนไขที่ค้นหาครับ
            </div>
          )}
        </div>
      </div>

      {/* หน้าต่าง Pop-up สำหรับแก้ไขสถานะใบงาน ชื่อช่าง และโน้ตช่าง */}
      {editingJob && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 print:hidden">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[92dvh] flex flex-col overflow-hidden">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-lg font-bold text-blue-400">
                  จัดการใบงาน (JOB-{editingJob.JobID})
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  {editingJob.CarBrand} {editingJob.CarModel} ({editingJob.CarNumber})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingJob(null)}
                className="text-slate-300 hover:text-white text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveJobStatus} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              <div>
                <label htmlFor="job-status-select" className="block text-sm font-medium text-slate-700 mb-1">
                  สถานะใบงานซ่อม
                </label>
                <select
                  id="job-status-select"
                  value={editJobStatus}
                  onChange={(e) => setEditJobStatus(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  {JOB_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="job-mechanic-name" className="block text-sm font-medium text-slate-700 mb-1">
                  ชื่อช่างผู้รับผิดชอบ *
                </label>
                <input
                  id="job-mechanic-name"
                  required
                  type="text"
                  maxLength={100}
                  value={editMechanicName}
                  onChange={(e) => setEditMechanicName(e.target.value)}
                  placeholder="เช่น ช่างเอก (หัวหน้าช่างยุโรป)"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label htmlFor="job-internal-notes" className="block text-sm font-medium text-slate-700 mb-1">
                  บันทึกหมายเหตุภายในสำหรับช่าง (Internal Notes)
                </label>
                <textarea
                  id="job-internal-notes"
                  rows={3}
                  maxLength={1000}
                  value={editInternalNotes}
                  onChange={(e) => setEditInternalNotes(e.target.value)}
                  placeholder="เช่น เปลี่ยนผ้าเบรกหน้าแล้ว รอตั้งศูนย์ล้อ..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => handleDeleteJob(editingJob)}
                  className="px-3 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold"
                >
                  ลบใบงานนี้
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingJob(null)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingJob}
                    className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-semibold disabled:opacity-60"
                  >
                    {isSavingJob ? "กำลังบันทึก..." : "บันทึก"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* หน้าต่าง Pop-up สำหรับจัดการรายการอะไหล่และค่าแรง (ดูรายการ + เพิ่ม + ลบรายการที่คีย์ผิด) */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 print:hidden">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[92dvh] flex flex-col overflow-hidden">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-lg font-bold text-blue-400">
                  จัดการรายการอะไหล่ / ค่าแรง (JOB-{selectedJob.JobID})
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  {selectedJob.CustomerName} • {selectedJob.CarBrand} {selectedJob.CarModel} ({selectedJob.CarNumber})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="text-slate-300 hover:text-white text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
              {/* ตารางแสดงรายการอะไหล่ที่มีอยู่ในใบงานนี้ พร้อมปุ่มลบกรณีคีย์ผิด */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    รายการที่บันทึกไว้ ({jobItems.length} รายการ)
                  </span>
                  <span className="text-sm font-extrabold text-emerald-600">
                    รวม: {currentItemsTotal.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท
                  </span>
                </div>

                {isLoadingItems ? (
                  <div className="text-xs text-slate-400 py-4 text-center">กำลังโหลดรายการ...</div>
                ) : jobItems.length === 0 ? (
                  <div className="text-xs text-slate-400 py-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    ยังไม่มีรายการอะไหล่หรือค่าแรงในใบงานนี้ครับ
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200 max-h-48 overflow-y-auto">
                    {jobItems.map((it, idx) => (
                      <div key={it.ItemID || idx} className="p-3 bg-slate-50/70 flex justify-between items-center gap-2 text-xs">
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-800 truncate">{it.ItemName}</div>
                          <div className="text-slate-500">
                            จำนวน {it.Quantity} x {Number(it.UnitPrice).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="font-bold text-slate-900">
                            {(it.Quantity * Number(it.UnitPrice)).toLocaleString("th-TH", { minimumFractionDigits: 2 })} ฿
                          </span>
                          {it.ItemID && (
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(it.ItemID, it.ItemName)}
                              className="px-2 py-1 rounded bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 font-semibold"
                            >
                              ลบ
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ฟอร์มเพิ่มรายการใหม่ */}
              <form onSubmit={handleAddItem} className="space-y-4 pt-3 border-t border-slate-200">
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  + เพิ่มรายการอะไหล่ / ค่าแรงใหม่
                </div>
                <div>
                  <label htmlFor="item-name" className="block text-sm font-medium text-slate-700 mb-1">
                    ชื่อรายการอะไหล่ / ค่าแรง * <span className="text-xs text-slate-400">(สูงสุด 150 ตัวอักษร)</span>
                  </label>
                  <input
                    id="item-name"
                    required
                    type="text"
                    maxLength={150}
                    value={itemData.ItemName}
                    placeholder="เช่น น้ำมันเครื่องสังเคราะห์แท้ MB 229.5 (ลิตร)"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
                    onChange={(e) => setItemData({ ...itemData, ItemName: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="item-qty" className="block text-sm font-medium text-slate-700 mb-1">
                      จำนวน (1 - 1,000) *
                    </label>
                    <input
                      id="item-qty"
                      required
                      type="number"
                      min="1"
                      max="1000"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
                      value={itemData.Quantity}
                      onChange={(e) => setItemData({ ...itemData, Quantity: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label htmlFor="item-price" className="block text-sm font-medium text-slate-700 mb-1">
                      ราคาต่อหน่วย (บาท) *
                    </label>
                    <input
                      id="item-price"
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
                      value={itemData.UnitPrice}
                      onChange={(e) => setItemData({ ...itemData, UnitPrice: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-slate-500">
                    เป็นเงินรายการนี้:{" "}
                    <strong className="text-slate-900">
                      {(itemData.Quantity * itemData.UnitPrice).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท
                    </strong>
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedJob(null)}
                      className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm"
                    >
                      ปิดหน้าต่าง
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingItem}
                      className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 text-sm"
                    >
                      {isSubmittingItem ? "กำลังเพิ่ม..." : "+ บันทึกรายการ"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* หน้าต่าง Pop-up สำหรับใบเสร็จรับเงิน (รองรับการ Print) */}
      {isReceiptOpen && receiptData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 print:p-0 print:bg-white print:static">
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92dvh] overflow-y-auto print:max-h-none print:shadow-none print:w-full">
            <div className="text-center mb-6 sm:mb-8 border-b pb-4">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-wider">THE SENDER MOTO</h2>
              <p className="text-slate-600 text-sm mt-1">ใบแจ้งหนี้ / ใบเสร็จรับเงิน (Invoice / Receipt)</p>
              <p className="text-slate-400 text-xs mt-1">[TODO: ใส่ข้อมูลจริง - ที่อยู่อู่ เบอร์โทร และเลขประจำตัวผู้เสียภาษี]</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm text-slate-700">
              <div>
                <p>
                  <span className="font-semibold">รหัสใบงาน:</span> JOB-{receiptData.job_info.JobID}{" "}
                  {receiptData.job_info.BookingRef ? `(${receiptData.job_info.BookingRef})` : ""}
                </p>
                <p><span className="font-semibold">ลูกค้า:</span> {receiptData.job_info.CustomerName}</p>
                <p><span className="font-semibold">เบอร์โทรศัพท์:</span> {receiptData.job_info.PhoneNumber}</p>
              </div>
              <div className="sm:text-right">
                <p><span className="font-semibold">รถยนต์:</span> {receiptData.job_info.CarBrand} {receiptData.job_info.CarModel}</p>
                <p><span className="font-semibold">ทะเบียน:</span> {receiptData.job_info.CarNumber}</p>
                {receiptData.job_info.MechanicName && (
                  <p><span className="font-semibold">ช่างผู้ดูแล:</span> {receiptData.job_info.MechanicName}</p>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm mb-6 border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-800 text-slate-800">
                    <th className="py-2">รายการ (Description)</th>
                    <th className="py-2 text-center">จำนวน (Qty)</th>
                    <th className="py-2 text-right">ราคาต่อหน่วย (Unit)</th>
                    <th className="py-2 text-right">รวม (Amount)</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptData.items.map((item: ReceiptItem, index: number) => (
                    <tr key={index} className="border-b border-slate-200 text-slate-800">
                      <td className="py-3">{item.ItemName}</td>
                      <td className="py-3 text-center">{item.Quantity}</td>
                      <td className="py-3 text-right">{Number(item.UnitPrice).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 text-right">{(item.Quantity * Number(item.UnitPrice)).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  {receiptData.items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">
                        ยังไม่มีรายการอะไหล่หรือค่าแรงในใบงานนี้
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end text-base sm:text-lg">
              <div className="w-full sm:w-1/2">
                <div className="flex justify-between font-bold text-slate-900 bg-slate-100 p-3.5 rounded-xl">
                  <span>ยอดชำระสุทธิ (Total):</span>
                  <span>{Number(receiptData.job_info.TotalCost).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท</span>
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3 print:hidden">
              <button
                type="button"
                onClick={() => setIsReceiptOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm"
              >
                ปิดหน้าต่าง
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-500 transition-colors shadow-md text-sm"
              >
                สั่งพิมพ์ใบเสร็จ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
