"use client";

import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

interface Customer {
  CustomerID: number;
  CustomerName: string;
  PhoneNumber: string;
  Email?: string | null;
  LineID?: string | null;
  Address?: string | null;
  CustomerTier: "Standard" | "Premium" | "VIP";
  VehicleCount?: number;
  AppointmentCount?: number;
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

export default function CustomersAdminPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [maskPII, setMaskPII] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("ALL");

  // State สำหรับหน้าต่าง Modal เพิ่ม/แก้ไขลูกค้า
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    CustomerName: "",
    Address: "",
    PhoneNumber: "",
    Email: "",
    LineID: "",
    CustomerTier: "Standard",
  });

  const fetchCustomers = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const response = await axios.get(`${API_URL}/customers`);
      if (response.data && Array.isArray(response.data.data)) {
        setCustomers(response.data.data);
      } else {
        setCustomers([]);
      }
    } catch {
      setLoadError("ไม่สามารถดึงข้อมูลรายชื่อลูกค้าได้ในขณะนี้ครับ");
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    axios
      .get(`${API_URL}/customers`)
      .then((response) => {
        if (response.data && Array.isArray(response.data.data)) {
          setCustomers(response.data.data);
        } else {
          setCustomers([]);
        }
      })
      .catch(() => {
        setLoadError("ไม่สามารถดึงข้อมูลรายชื่อลูกค้าได้ในขณะนี้ครับ");
        setCustomers([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsModalOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  const openAddModal = () => {
    setEditingCustomerId(null);
    setFormError("");
    setFormData({
      CustomerName: "",
      Address: "",
      PhoneNumber: "",
      Email: "",
      LineID: "",
      CustomerTier: "Standard",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomerId(c.CustomerID);
    setFormError("");
    setFormData({
      CustomerName: c.CustomerName || "",
      Address: c.Address || "",
      PhoneNumber: cleanPhoneDigits(c.PhoneNumber || ""),
      Email: c.Email || "",
      LineID: c.LineID || "",
      CustomerTier: c.CustomerTier || "Standard",
    });
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormError("");
    if (name === "PhoneNumber") {
      setFormData({ ...formData, PhoneNumber: cleanPhoneDigits(value) });
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanPhone = cleanPhoneDigits(formData.PhoneNumber);
    if (!/^0[2689]\d{7,8}$/.test(cleanPhone)) {
      setFormError("กรุณากรอกเบอร์โทรศัพท์ไทย 9–10 หลักให้ถูกต้อง (เช่น 0808996645)");
      return;
    }
    if (formData.CustomerName.trim().length < 2) {
      setFormError("กรุณาระบุชื่อ-นามสกุลอย่างน้อย 2 ตัวอักษร");
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    try {
      const payload = {
        CustomerName: formData.CustomerName.trim(),
        PhoneNumber: cleanPhone,
        Email: formData.Email.trim() || undefined,
        LineID: formData.LineID.trim() || undefined,
        Address: formData.Address.trim() || undefined,
        CustomerTier: formData.CustomerTier,
      };
      const response =
        editingCustomerId !== null
          ? await axios.put(`${API_URL}/customers/${editingCustomerId}`, payload)
          : await axios.post(`${API_URL}/customers`, payload);

      if (response.data?.status && response.data.status !== "Success") {
        setFormError(response.data.message || "ไม่สามารถบันทึกข้อมูลได้ครับ");
        return;
      }
      setIsModalOpen(false);
      fetchCustomers();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        setFormError(error.response.data.message);
      } else {
        setFormError("เกิดข้อผิดพลาดในการบันทึกข้อมูลครับ");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (c: Customer) => {
    const confirmMsg = `ยืนยันการลบข้อมูลลูกค้า "${c.CustomerName}" (${c.PhoneNumber}) ?\n\nหมายเหตุ: ข้อมูลรถยนต์และประวัติคิวซ่อมที่ผูกกับลูกค้ารายนี้จะถูกลบออกจากระบบด้วยครับ`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await axios.delete(`${API_URL}/customers/${c.CustomerID}`);
      if (res.data?.status === "Success") {
        fetchCustomers();
      } else {
        alert(res.data?.message || "ไม่สามารถลบข้อมูลลูกค้าได้");
      }
    } catch {
      alert("ไม่สามารถเชื่อมต่อระบบเพื่อลบข้อมูลลูกค้าได้");
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/export/customers`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "the_sender_moto_customers.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("ไม่สามารถส่งออกไฟล์ CSV ได้ครับ");
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const matchTier = tierFilter === "ALL" || c.CustomerTier === tierFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      c.CustomerName.toLowerCase().includes(q) ||
      c.PhoneNumber.toLowerCase().includes(q) ||
      (c.Email || "").toLowerCase().includes(q) ||
      (c.LineID || "").toLowerCase().includes(q) ||
      String(c.CustomerID).includes(q);
    return matchTier && matchSearch;
  });

  const vipCount = customers.filter((c) => c.CustomerTier === "VIP").length;
  const premiumCount = customers.filter((c) => c.CustomerTier === "Premium").length;
  const standardCount = customers.filter((c) => c.CustomerTier === "Standard").length;

  return (
    <div className="min-h-full bg-slate-100 p-4 sm:p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* แถบสถิติภาพรวมลูกค้า (KPI Summary Cards) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
            <span className="text-xs font-semibold text-slate-500">ลูกค้าทั้งหมด</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              {customers.length} <span className="text-xs font-normal text-slate-400">ท่าน</span>
            </div>
          </div>
          <div className="bg-white border border-blue-200 rounded-2xl p-4 sm:p-5 shadow-xs">
            <span className="text-xs font-semibold text-blue-600">สมาชิกระดับ VIP</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-700 mt-1">
              {vipCount} <span className="text-xs font-normal text-slate-400">ท่าน</span>
            </div>
          </div>
          <div className="bg-white border border-indigo-200 rounded-2xl p-4 sm:p-5 shadow-xs">
            <span className="text-xs font-semibold text-indigo-600">สมาชิกระดับ Premium</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-700 mt-1">
              {premiumCount} <span className="text-xs font-normal text-slate-400">ท่าน</span>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
            <span className="text-xs font-semibold text-slate-600">สมาชิกระดับ Standard</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">
              {standardCount} <span className="text-xs font-normal text-slate-400">ท่าน</span>
            </div>
          </div>
        </div>

        {/* การ์ดหลักสำหรับตารางและเครื่องมือค้นหา */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200/80 overflow-hidden p-4 sm:p-6 md:p-8">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-6 pb-4 border-b border-slate-200">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">
                จัดการข้อมูลลูกค้า (Customers)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                เพิ่ม แก้ไข ค้นหา หรือลบรายชื่อลูกค้า (เบอร์โทรศัพท์ควบคุมด้วย CHAR(10) ป้องกันการกรอกผิดพลาด)
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={fetchCustomers}
                className="border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors"
              >
                รีเฟรชข้อมูล
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
                onClick={openAddModal}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-sm"
              >
                + เพิ่มลูกค้าใหม่
              </button>
            </div>
          </div>

          {/* แถบค้นหาและตัวกรอง */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="text"
              placeholder="ค้นหาชื่อลูกค้า, เบอร์โทรศัพท์ 10 หลัก, LINE ID, อีเมล หรือรหัส ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            >
              <option value="ALL">ทุกระดับสมาชิก ({customers.length})</option>
              <option value="VIP">VIP ({vipCount})</option>
              <option value="Premium">Premium ({premiumCount})</option>
              <option value="Standard">Standard ({standardCount})</option>
            </select>
          </div>

          {loadError && (
            <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex justify-between items-center">
              <span>{loadError}</span>
              <button
                type="button"
                onClick={fetchCustomers}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-500"
              >
                ลองใหม่
              </button>
            </div>
          )}

          {/* มุมมองการ์ดสำหรับหน้าจอมือถือ (Mobile Responsive Cards) */}
          <div className="md:hidden space-y-3">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.CustomerID}
                className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs text-slate-500">รหัส #{customer.CustomerID}</span>
                    <div className="font-bold text-slate-900 text-base">{customer.CustomerName}</div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                      customer.CustomerTier === "VIP"
                        ? "bg-blue-100 text-blue-800"
                        : customer.CustomerTier === "Premium"
                        ? "bg-indigo-100 text-indigo-800"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {customer.CustomerTier}
                  </span>
                </div>

                <div className="text-xs text-slate-700 space-y-1">
                  <div>
                    เบอร์โทรศัพท์:{" "}
                    <span className="font-mono font-semibold text-slate-900">
                      {maskPhone(customer.PhoneNumber, maskPII)}
                    </span>
                  </div>
                  {customer.LineID && <div className="text-emerald-700">LINE: {customer.LineID}</div>}
                  {customer.Email && <div>อีเมล: {customer.Email}</div>}
                  {customer.Address && <div>ที่อยู่: {customer.Address}</div>}
                  <div className="text-slate-500 pt-1">
                    รถที่ลงทะเบียน: <strong>{customer.VehicleCount || 0}</strong> คัน • ประวัติจองคิว:{" "}
                    <strong>{customer.AppointmentCount || 0}</strong> ครั้ง
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(customer)}
                    className="flex-1 min-h-9 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    แก้ไขข้อมูล
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomer(customer)}
                    className="min-h-9 px-3 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ตารางข้อมูลสำหรับแท็บเล็ตและคอมพิวเตอร์ */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-900 text-white text-sm">
                  <th className="p-4 border-b-2">ID</th>
                  <th className="p-4 border-b-2">ชื่อ-นามสกุล</th>
                  <th className="p-4 border-b-2">เบอร์โทรศัพท์ (10 หลัก)</th>
                  <th className="p-4 border-b-2">ช่องทางติดต่อ / ที่อยู่</th>
                  <th className="p-4 border-b-2 text-center">รถ / นัดหมาย</th>
                  <th className="p-4 border-b-2">ระดับสมาชิก</th>
                  <th className="p-4 border-b-2 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.CustomerID} className="hover:bg-slate-50 border-b transition-colors">
                    <td className="p-4 text-slate-500 font-mono">#{customer.CustomerID}</td>
                    <td className="p-4 font-bold text-slate-900">{customer.CustomerName}</td>
                    <td className="p-4 text-slate-800 font-mono font-semibold">
                      {maskPhone(customer.PhoneNumber, maskPII)}
                    </td>
                    <td className="p-4 text-xs text-slate-600">
                      {customer.LineID && <div className="text-emerald-700 font-medium">LINE: {customer.LineID}</div>}
                      {customer.Email && <div>Email: {customer.Email}</div>}
                      {customer.Address && (
                        <div className="text-slate-400 max-w-xs truncate" title={customer.Address}>
                          ที่อยู่: {customer.Address}
                        </div>
                      )}
                      {!customer.LineID && !customer.Email && !customer.Address && (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-4 text-center text-xs text-slate-600">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-semibold">
                        รถ {customer.VehicleCount || 0} คัน • นัด {customer.AppointmentCount || 0} ครั้ง
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          customer.CustomerTier === "VIP"
                            ? "bg-blue-100 text-blue-800"
                            : customer.CustomerTier === "Premium"
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {customer.CustomerTier}
                      </span>
                    </td>
                    <td className="p-4 text-center space-x-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(customer)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomer(customer)}
                        className="px-3 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors"
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
              กำลังโหลดข้อมูลลูกค้า กรุณารอสักครู่ครับ...
            </div>
          )}
          {!isLoading && filteredCustomers.length === 0 && (
            <div className="text-center p-10 text-slate-500 text-sm">
              ไม่พบข้อมูลลูกค้าตามเงื่อนไขที่ค้นหาครับ
            </div>
          )}
        </div>
      </div>

      {/* หน้าต่าง Pop-up (Modal) สำหรับเพิ่ม/แก้ไขข้อมูลลูกค้า */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[92dvh] flex flex-col overflow-hidden">
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-blue-400">
                {editingCustomerId !== null ? `แก้ไขข้อมูลลูกค้า #${editingCustomerId}` : "เพิ่มลูกค้าใหม่"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-300 hover:text-white text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label htmlFor="customer-name" className="block text-sm font-medium text-slate-700 mb-1">
                  ชื่อ-นามสกุล * <span className="text-xs text-slate-400">(สูงสุด 100 ตัวอักษร)</span>
                </label>
                <input
                  id="customer-name"
                  required
                  type="text"
                  maxLength={100}
                  name="CustomerName"
                  value={formData.CustomerName}
                  onChange={handleInputChange}
                  placeholder="เช่น คุณสมชาย ใจดี"
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label htmlFor="customer-phone" className="block text-sm font-medium text-slate-700 mb-1">
                  เบอร์โทรศัพท์ * <span className="text-xs text-blue-600 font-semibold">(ตัวเลข 10 หลัก CHAR(10))</span>
                </label>
                <input
                  id="customer-phone"
                  required
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  name="PhoneNumber"
                  value={formData.PhoneNumber}
                  onChange={handleInputChange}
                  placeholder="0808996645"
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-base sm:text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  ระบบรับเฉพาะตัวเลข 0 นำหน้า 9–10 หลัก ({formData.PhoneNumber.length}/10 หลัก)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="customer-line" className="block text-sm font-medium text-slate-700 mb-1">
                    LINE ID
                  </label>
                  <input
                    id="customer-line"
                    type="text"
                    maxLength={50}
                    name="LineID"
                    value={formData.LineID}
                    onChange={handleInputChange}
                    placeholder="เช่น @lineid"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label htmlFor="customer-tier" className="block text-sm font-medium text-slate-700 mb-1">
                    ระดับสมาชิก
                  </label>
                  <select
                    id="customer-tier"
                    name="CustomerTier"
                    value={formData.CustomerTier}
                    onChange={handleInputChange}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Premium">Premium</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="customer-email" className="block text-sm font-medium text-slate-700 mb-1">
                  อีเมล
                </label>
                <input
                  id="customer-email"
                  type="email"
                  maxLength={100}
                  name="Email"
                  value={formData.Email}
                  onChange={handleInputChange}
                  placeholder="name@example.com"
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label htmlFor="customer-address" className="block text-sm font-medium text-slate-700 mb-1">
                  ที่อยู่
                </label>
                <input
                  id="customer-address"
                  type="text"
                  maxLength={500}
                  name="Address"
                  value={formData.Address}
                  onChange={handleInputChange}
                  placeholder="ที่อยู่สำหรับออกใบเสร็จ (ไม่บังคับ)"
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-500 disabled:opacity-60 text-sm transition-colors"
                >
                  {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
