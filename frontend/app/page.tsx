"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

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

const SERVICE_DURATION_LABEL: Record<string, string> = {
  "General Maintenance": "เช็กระยะทั่วไป (ประมาณ 90 นาที)",
  "Engine Repair": "ซ่อมเครื่องยนต์ (ประมาณ 240 นาที)",
  "Suspension": "ช่วงล่างและเบรก (ประมาณ 180 นาที)",
  "Diagnostics": "ตรวจเช็กระบบไฟฟ้า (ประมาณ 60 นาที)",
};

interface ShowcaseSlide {
  brand: string;
  title: string;
  subtitle: string;
  image: string;
  popularModels: string;
  diagnosticTool: string;
  highlights: string[];
  recommendedService: string;
}

const LUXURY_SHOWCASE_SLIDES: ShowcaseSlide[] = [
  {
    brand: "Porsche",
    title: "Porsche Precision Care",
    subtitle: "การดูแลระดับวิศวกรรมเยอรมันสำหรับรถสปอร์ตและ SUV สมรรถนะสูง",
    image: "/cars/porsche-911.jpg",
    popularModels: "911 (991/992), Cayenne, Macan, Panamera, Taycan",
    diagnosticTool: "PIWIS Diagnostic Standard",
    highlights: [
      "บำรุงรักษาเครื่องยนต์ Boxer, V6/V8 Turbo และระบบเกียร์คลัตช์คู่ PDK",
      "ตรวจเช็กและซ่อมบำรุงช่วงล่างถุงลม PASM ระบบเบรกสมรรถนะสูง และระบบหล่อเย็น",
      "ตั้งค่าระบบอิเล็กทรอนิกส์ รีเซ็ตระยะเซอร์วิส และตรวจสอบแบตเตอรี่แรงดันสูง",
    ],
    recommendedService: "General Maintenance",
  },
  {
    brand: "Mercedes-Benz",
    title: "Mercedes-Benz & AMG Specialist",
    subtitle: "ความนุ่มนวลและเทคโนโลยีขั้นสูงที่ต้องดูแลด้วยเครื่องมือวิเคราะห์เฉพาะทาง",
    image: "/cars/mercedes-amg.jpg",
    popularModels: "C-Class, E-Class, S-Class, GLC, GLE, CLS, Mercedes-AMG",
    diagnosticTool: "XENTRY Diagnostics Standard",
    highlights: [
      "วิเคราะห์ระบบ Plug-in Hybrid (EQ Power), แบตเตอรี่ลูกเล็ก/ลูกใหญ่ และระบบแอร์",
      "ดูแลระบบเกียร์ 9G-Tronic, เครื่องยนต์เบนซิน/ดีเซลเทอร์โบ และจุดรั่วซึมซีลยาง",
      "ซ่อมบำรุงช่วงล่างถุงลม Airmatic โช้คอัพไฟฟ้า และชุดลูกหมากอะลูมิเนียม",
    ],
    recommendedService: "Diagnostics",
  },
  {
    brand: "BMW",
    title: "BMW & M Performance Atelier",
    subtitle: "คงสมรรถนะการขับขี่ที่เฉียบคมด้วยอะไหล่มาตรฐานและการวิเคราะห์ที่แม่นยำ",
    image: "/cars/bmw-m-series.jpg",
    popularModels: "Series 3, Series 5, Series 7, X1, X3, X5, Z4, M Sport",
    diagnosticTool: "ISTA Diagnostic System",
    highlights: [
      "ตรวจเช็กเครื่องยนต์ TwinPower Turbo ระบบวาล์วแปรผัน และระบบระบายความร้อนไฟฟ้า",
      "เปลี่ยนถ่ายน้ำมันเกียร์อัตโนมัติ ZF 8-Speed พร้อมอ่างเกียร์และไส้กรองแท้",
      "แก้ไขปัญหาไฟเตือนหน้าปัด เซนเซอร์ CBS ช่วงล่าง M Sport และแร็คพวงมาลัยไฟฟ้า",
    ],
    recommendedService: "Engine Repair",
  },
  {
    brand: "Audi",
    title: "Audi Quattro & RS Engineering",
    subtitle: "ดูแลระบบขับเคลื่อนสี่ล้อและเกียร์คลัตช์คู่อย่างเข้าใจถึงโครงสร้างวิศวกรรม",
    image: "/cars/audi-rs.jpg",
    popularModels: "A4, A5, A6, A7, Q3, Q5, Q7, Q8, TT, RS Series",
    diagnosticTool: "ODIS Diagnostic Interface",
    highlights: [
      "ดูแลเครื่องยนต์ TFSI / TDI ระบบเทอร์โบชาร์จ และระบบฉีดเชื้อเพลิงแรงดันสูง",
      "บำรุงรักษาเกียร์ S-Tronic / Tiptronic และระบบขับเคลื่อนสี่ล้อ Quattro",
      "ตรวจเช็กช่วงล่างมัลติลิงก์ บูชปีกนก โช้คอัพ และระบบเบรกไฟฟ้า EPB",
    ],
    recommendedService: "Suspension",
  },
  {
    brand: "Land Rover",
    title: "Range Rover, Volvo, MINI & VW Care",
    subtitle: "ครบเครื่องเรื่องรถยุโรประดับลักชัวรีทั้ง SUV ขนาดใหญ่และรถคอมแพกต์พรีเมียม",
    image: "/cars/range-rover.jpg",
    popularModels: "Range Rover, Evoque, Defender, Volvo XC60/XC90, MINI Cooper, VW",
    diagnosticTool: "Multi-Marque European Diagnostics",
    highlights: [
      "ซ่อมบำรุงระบบช่วงล่างถุงลมไฟฟ้า ปั๊มลม วาล์วบล็อก และการตั้งระดับความสูงรถ",
      "เช็กระยะตามตารางมาตรฐานยุโรปด้วยน้ำมันเครื่องสังเคราะห์แท้ตรงสเปกโรงงาน",
      "ตรวจสอบระบบความปลอดภัย เซนเซอร์รอบคัน ระบบแอร์ และระบบระบายความร้อน",
    ],
    recommendedService: "Suspension",
  },
];

const SERVICE_CARDS = [
  {
    code: "01",
    tag: "Periodic Maintenance",
    duration: "ประมาณ 90 นาที",
    serviceKey: "General Maintenance",
    title: "เช็กระยะและบำรุงรักษาตามกำหนด",
    description:
      "เปลี่ยนถ่ายน้ำมันเครื่องสังเคราะห์แท้มาตรฐานยุโรป ไส้กรอง และของเหลว พร้อมตรวจเช็กความสมบูรณ์รอบคันกว่า 30 รายการครับ",
    checklist: [
      "น้ำมันเครื่องสังเคราะห์แท้ + ไส้กรองน้ำมันเครื่องตรงรุ่น",
      "ตรวจเช็กผ้าเบรก จานเบรก ยาง และลูกหมากช่วงล่าง",
      "สแกนระบบไฟฟ้ารอบคันและรีเซ็ตไฟเตือนระยะเซอร์วิส",
    ],
  },
  {
    code: "02",
    tag: "Engine & Transmission",
    duration: "ประมาณ 240 นาที",
    serviceKey: "Engine Repair",
    title: "ซ่อมเครื่องยนต์และระบบเกียร์",
    description:
      "วิเคราะห์และแก้ไขอาการเครื่องยนต์สั่น กำลังตก น้ำมันรั่วซึม ความร้อนขึ้นสูง เทอร์โบ และระบบเกียร์อัตโนมัติรถยุโรปครับ",
    checklist: [
      "ตรวจเช็กกำลังอัด ระบบจุดระเบิด หัวฉีด และเทอร์โบชาร์จ",
      "เปลี่ยนซีลยาง ปะเก็น ปั๊มน้ำไฟฟ้า และวาล์วน้ำมาตรฐานแท้/OEM",
      "ฟลัชชิ่งและเปลี่ยนถ่ายน้ำมันเกียร์พร้อมอ่างเกียร์ตามระยะ",
    ],
  },
  {
    code: "03",
    tag: "Suspension & Braking",
    duration: "ประมาณ 180 นาที",
    serviceKey: "Suspension",
    title: "ช่วงล่าง ถุงลม และระบบเบรก",
    description:
      "คืนความนุ่มนวลและเสถียรภาพการยึดเกาะถนน ดูแลโช้คอัพ ถุงลมช่วงล่าง ปีกนกอะลูมิเนียม และระบบเบรกสมรรถนะสูงครับ",
    checklist: [
      "ซ่อมและเปลี่ยนโช้คอัพไฟฟ้า ถุงลมช่วงล่าง และปั๊มลม",
      "เปลี่ยนบูชปีกนก ลูกหมากกันโคลง ยางแท่นเครื่องและแท่นเกียร์",
      "เปลี่ยนผ้าเบรก จานเบรก เซนเซอร์เตือนผ้าเบรก และน้ำมันเบรก DOT 4/5.1",
    ],
  },
  {
    code: "04",
    tag: "Electrical & ECU Diagnostics",
    duration: "ประมาณ 60 นาที",
    serviceKey: "Diagnostics",
    title: "วิเคราะห์ระบบไฟฟ้าและกล่องควบคุม",
    description:
      "อ่านค่า Fault Code เชิงลึกด้วยเครื่องสแกนเฉพาะทาง แก้ไขปัญหาไฟโชว์หน้าปัด ระบบแอร์ไม่เย็น และระบบไฮบริดอย่างตรงจุดครับ",
    checklist: [
      "สแกนกล่องควบคุม ECU / TCM / ABS / Airbag ครบทุกโมดูล",
      "วิเคราะห์ระบบแบตเตอรี่ AGM แบตเตอรี่ไฮบริด และไดชาร์จ",
      "ตรวจเช็กระบบปรับอากาศ คอมเพรสเซอร์แอร์ และเซนเซอร์อัจฉริยะ",
    ],
  },
];

const FAQ_ITEMS = [
  {
    q: "ควรจองคิวล่วงหน้ากี่วัน และสามารถเลื่อนหรือยกเลิกนัดเองได้ไหมครับ?",
    a: "แนะนำให้จองล่วงหน้าอย่างน้อย 1 ชั่วโมงถึง 90 วันครับ หลังจองสำเร็จท่านจะได้รับรหัสอ้างอิง (เช่น SM-261105-XXXX) สามารถกดปุ่ม 'เช็กคิว / เลื่อนนัด' บนหน้าเว็บไซต์เพื่อเลื่อนวัน-เวลา หรือยกเลิกคิวได้ด้วยตนเองตลอด 24 ชั่วโมงครับ",
  },
  {
    q: "ทางอู่มีขั้นตอนการประเมินราคาอย่างไร มีค่าใช้จ่ายแอบแฝงไหมครับ?",
    a: "เรายึดหลักความโปร่งใสเป็นสำคัญครับ เมื่อรถเข้าช่องซ่อม ทีมช่างจะตรวจเช็กอาการและจัดทำรายการอะไหล่พร้อมประเมินค่าใช้จ่ายแจ้งให้ท่านอนุมัติก่อนเริ่มซ่อมเสมอ จะไม่มีการเปลี่ยนอะไหล่หรือคิดค่าใช้จ่ายเพิ่มเติมโดยที่ลูกค้ายังไม่อนุมัติครับ",
  },
  {
    q: "สามารถแนบรูปไฟเตือนหน้าปัดหรืออาการรถให้ช่างดูล่วงหน้าได้ไหมครับ?",
    a: "ได้ครับ ในแบบฟอร์มจองคิวมีช่องสำหรับแนบรูปหน้าปัดหรือจุดที่พบอาการผิดปกติ (รองรับไฟล์ JPG, PNG, WebP) เพื่อให้ทีมช่างเตรียมเครื่องมือวิเคราะห์และอะไหล่ไว้รอล่วงหน้าได้แม่นยำขึ้นครับ",
  },
  {
    q: "ทางอู่ใช้อะไหล่ประเภทใดและมีการรับประกันงานซ่อมอย่างไรครับ?",
    a: "เราคัดสรรเฉพาะน้ำมันเครื่องสังเคราะห์แท้และอะไหล่แท้หรืออะไหล่มาตรฐาน OEM คุณภาพสูงสำหรับรถยุโรปโดยเฉพาะ พร้อมออกใบสรุปรายการซ่อมและใบเสร็จชัดเจนทุกครั้งครับ",
  },
];

function normalizePhoneInput(raw: string): string {
  let digits = raw.replace(/[\s\-()]/g, "").trim();
  if (digits.startsWith("+66")) digits = "0" + digits.slice(3);
  else if (digits.startsWith("66") && (digits.length === 10 || digits.length === 11)) {
    digits = "0" + digits.slice(2);
  }
  return digits;
}

function normalizePlateInput(raw: string): string {
  const cleaned = raw.replace(/[<>]/g, "").trim().toUpperCase();
  const compact = cleaned.replace(/[\s\-]+/g, "");
  const m = compact.match(/^([0-9]?[ก-ฮA-Z]{1,3})([0-9]{1,4})$/);
  if (m) return `${m[1]} ${m[2]}`;
  return cleaned.replace(/[\s\-]+/g, " ").trim();
}

async function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("ไม่สามารถประมวลผลรูปภาพได้"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = () => reject(new Error("ไฟล์รูปภาพไม่ถูกต้อง"));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์รูปภาพได้"));
    reader.readAsDataURL(file);
  });
}

interface LookupAppointment {
  AppointmentID: number;
  BookingRef: string;
  AppointmentDate: string;
  AppointmentTime: string;
  ServiceType: string;
  EstimatedMinutes?: number;
  Mileage?: number | null;
  Notes?: string | null;
  Status: string;
  CustomerName: string;
  PhoneNumber: string;
  CarBrand: string;
  CarModel: string;
  CarYear?: number | null;
  CarNumber: string;
}

export default function LandingPage() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [todayStr, setTodayStr] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [slotInfo, setSlotInfo] = useState<{ maxPerSlot: number; bookedSlots: Record<string, number> } | null>(null);

  const [bookingResult, setBookingResult] = useState<{
    bookingId?: number;
    bookingRef?: string;
    estimatedMinutes?: number;
    customerName: string;
    phoneNumber: string;
    carBrand: string;
    carModel: string;
    carNumber: string;
    appointmentDate: string;
    appointmentTime: string;
    serviceType: string;
  } | null>(null);

  // State สำหรับหน้าต่างตรวจสอบ/เลื่อนนัด/ยกเลิกคิวของลูกค้า
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [lookupRef, setLookupRef] = useState("");
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lookupMsg, setLookupMsg] = useState("");
  const [foundBooking, setFoundBooking] = useState<LookupAppointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  // เตรียม State สำหรับเก็บข้อมูลที่ลูกค้าจะกรอก
  const [bookingData, setBookingData] = useState({
    CustomerName: "",
    PhoneNumber: "",
    LineID: "",
    Email: "",
    CarBrand: "Mercedes-Benz",
    CarModel: "",
    CarYear: "",
    CarNumber: "",
    Mileage: "",
    AppointmentDate: "",
    AppointmentTime: "",
    ServiceType: "General Maintenance",
    Notes: "",
    PhotoURL: "",
    Website: "",
    ConsentPDPA: false,
  });

  // เลื่อนสไลด์รูปรถหรูอัตโนมัติทุก 5.5 วินาที (หยุดชั่วคราวเมื่อเอาเมาส์วางหรือเปิด Modal)
  useEffect(() => {
    if (isCarouselPaused || isBookingOpen || isLookupOpen) return;
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % LUXURY_SHOWCASE_SLIDES.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [isCarouselPaused, isBookingOpen, isLookupOpen]);

  const prevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + LUXURY_SHOWCASE_SLIDES.length) % LUXURY_SHOWCASE_SLIDES.length);
  };

  const nextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % LUXURY_SHOWCASE_SLIDES.length);
  };

  const fetchSlotAvailability = async (dateVal: string) => {
    if (!dateVal || dateVal.length !== 10) {
      setSlotInfo(null);
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/slots/availability`, { params: { date: dateVal } });
      if (res.data?.status === "Success") {
        setSlotInfo({
          maxPerSlot: res.data.max_per_slot || 2,
          bookedSlots: res.data.booked_slots || {},
        });
      }
    } catch {
      setSlotInfo(null);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setErrorMessage("");
    const target = e.target;
    const name = target.name;
    const value =
      target instanceof HTMLInputElement && target.type === "checkbox"
        ? target.checked
        : target.value;

    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setBookingData({ ...bookingData, [name]: value });

    if (name === "AppointmentDate" && typeof value === "string") {
      fetchSlotAvailability(value);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setBookingData((prev) => ({ ...prev, PhotoURL: "" }));
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFieldErrors((prev) => ({ ...prev, PhotoURL: "รองรับเฉพาะไฟล์รูปภาพ JPG, PNG หรือ WebP เท่านั้นครับ" }));
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors((prev) => ({ ...prev, PhotoURL: "ขนาดไฟล์รูปภาพต้องไม่เกิน 5 MB ครับ" }));
      e.target.value = "";
      return;
    }
    try {
      const compressedDataUrl = await compressImageToDataUrl(file);
      setFieldErrors((prev) => ({ ...prev, PhotoURL: "" }));
      setBookingData((prev) => ({ ...prev, PhotoURL: compressedDataUrl }));
    } catch {
      setFieldErrors((prev) => ({ ...prev, PhotoURL: "ไม่สามารถอ่านไฟล์รูปภาพได้ กรุณาลองไฟล์อื่นครับ" }));
    }
  };

  const handlePhoneBlur = () => {
    if (!bookingData.PhoneNumber) return;
    const normalized = normalizePhoneInput(bookingData.PhoneNumber);
    setBookingData((prev) => ({ ...prev, PhoneNumber: normalized }));
    if (!/^0[2689]\d{7,8}$/.test(normalized)) {
      setFieldErrors((prev) => ({
        ...prev,
        PhoneNumber: "รูปแบบเบอร์โทรศัพท์ไทยไม่ถูกต้อง (เช่น 0808996645) ครับ",
      }));
    }
  };

  const handlePlateBlur = () => {
    if (!bookingData.CarNumber) return;
    const normalized = normalizePlateInput(bookingData.CarNumber);
    setBookingData((prev) => ({ ...prev, CarNumber: normalized }));
    if (normalized.length < 2 || !/^[0-9A-Zก-ฮ\s\-]+$/.test(normalized)) {
      setFieldErrors((prev) => ({
        ...prev,
        CarNumber: "กรุณาระบุทะเบียนรถให้ถูกต้อง เช่น 1กข 1234 หรือ กข 1234 ครับ",
      }));
    }
  };

  const validateFormClientSide = (): boolean => {
    const errors: Record<string, string> = {};
    const phone = normalizePhoneInput(bookingData.PhoneNumber);
    const plate = normalizePlateInput(bookingData.CarNumber);

    if (bookingData.CustomerName.trim().length < 2) {
      errors.CustomerName = "กรุณาระบุชื่อ-นามสกุลอย่างน้อย 2 ตัวอักษรครับ";
    }
    if (!/^0[2689]\d{7,8}$/.test(phone)) {
      errors.PhoneNumber = "รูปแบบเบอร์โทรศัพท์ไทยไม่ถูกต้อง (เช่น 0808996645) ครับ";
    }
    if (bookingData.Email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(bookingData.Email.trim())) {
      errors.Email = "รูปแบบอีเมลไม่ถูกต้องครับ";
    }
    if (!bookingData.CarModel.trim()) {
      errors.CarModel = "กรุณาระบุรุ่นรถยนต์ครับ";
    }
    if (bookingData.CarYear) {
      const yr = Number(bookingData.CarYear);
      if (Number.isNaN(yr) || yr < 1970 || yr > 2028) {
        errors.CarYear = "กรุณาระบุปี ค.ศ. ระหว่าง 1970 - 2028 ครับ";
      }
    }
    if (plate.length < 2 || !/^[0-9A-Zก-ฮ\s\-]+$/.test(plate)) {
      errors.CarNumber = "กรุณาระบุทะเบียนรถให้ถูกต้อง เช่น 1กข 1234 ครับ";
    }
    if (!bookingData.AppointmentDate) {
      errors.AppointmentDate = "กรุณาเลือกวันที่ต้องการนัดหมายครับ";
    } else {
      const selected = new Date(`${bookingData.AppointmentDate}T00:00:00+07:00`);
      if (selected.getUTCDay() === 0) {
        errors.AppointmentDate = "อู่ปิดทำการวันอาทิตย์ กรุณาเลือกวันจันทร์–เสาร์ครับ";
      }
    }
    if (!bookingData.AppointmentTime) {
      errors.AppointmentTime = "กรุณาเลือกเวลานัดหมาย (08:30 - 17:30 น.) ครับ";
    } else if (
      bookingData.AppointmentTime < "08:30" ||
      bookingData.AppointmentTime > "17:30"
    ) {
      errors.AppointmentTime = "กรุณาเลือกเวลาภายในช่วงเวลาทำการ 08:30 - 17:30 น. ครับ";
    }
    if (!bookingData.ConsentPDPA) {
      errors.ConsentPDPA = "กรุณาติ๊กยินยอมนโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA) ครับ";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openBookingModalWithPreset = (presetBrand?: string, presetService?: string) => {
    setTodayStr(
      new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Bangkok",
      })
    );
    setIdempotencyKey(
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    );
    if (presetBrand || presetService) {
      setBookingData((prev) => ({
        ...prev,
        CarBrand: presetBrand && EUROPEAN_BRANDS.includes(presetBrand) ? presetBrand : prev.CarBrand,
        ServiceType: presetService || prev.ServiceType,
      }));
    }
    setErrorMessage("");
    setFieldErrors({});
    setBookingResult(null);
    setIsMobileNavOpen(false);
    setIsBookingOpen(true);
  };

  const openBookingModal = () => {
    openBookingModalWithPreset();
  };

  const openLookupModal = async (prefillRef = "", prefillPhone = "") => {
    setTodayStr(
      new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Bangkok",
      })
    );
    setLookupRef(prefillRef);
    setLookupPhone(prefillPhone);
    setLookupError("");
    setLookupMsg("");
    setFoundBooking(null);
    setIsMobileNavOpen(false);
    setIsLookupOpen(true);

    if (prefillRef.trim() && prefillPhone.trim()) {
      setLookupLoading(true);
      try {
        const res = await axios.post(`${API_URL}/bookings/lookup`, {
          BookingRef: prefillRef.trim(),
          PhoneNumber: normalizePhoneInput(prefillPhone),
        });
        if (res.data?.status === "Success" && res.data.data) {
          setFoundBooking(res.data.data);
          setRescheduleDate(res.data.data.AppointmentDate);
          setRescheduleTime(res.data.data.AppointmentTime.slice(0, 5));
        }
      } catch {
        // หากค้นหาอัตโนมัติไม่สำเร็จ ให้ลูกค้ากดปุ่มค้นหาด้วยตนเองได้ตามปกติ
      } finally {
        setLookupLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validateFormClientSide()) return;

    const normalizedPhone = normalizePhoneInput(bookingData.PhoneNumber);
    const normalizedPlate = normalizePlateInput(bookingData.CarNumber);

    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const payload = {
        CustomerName: bookingData.CustomerName.trim(),
        PhoneNumber: normalizedPhone,
        LineID: bookingData.LineID.trim() || undefined,
        Email: bookingData.Email.trim() || undefined,
        CarBrand: bookingData.CarBrand,
        CarModel: bookingData.CarModel.trim(),
        CarYear: bookingData.CarYear ? Number(bookingData.CarYear) : undefined,
        CarNumber: normalizedPlate,
        Mileage: bookingData.Mileage ? Number(bookingData.Mileage) : undefined,
        AppointmentDate: bookingData.AppointmentDate,
        AppointmentTime: bookingData.AppointmentTime,
        ServiceType: bookingData.ServiceType,
        Notes: bookingData.Notes.trim() || undefined,
        PhotoURL: bookingData.PhotoURL || undefined,
        Website: bookingData.Website,
        ConsentPDPA: bookingData.ConsentPDPA,
        ConsentVersion: "v1.0",
        IdempotencyKey: idempotencyKey || undefined,
      };
      const response = await axios.post(`${API_URL}/bookings`, payload);
      if (response.data.status === "Success") {
        setBookingResult({
          bookingId: response.data.booking_id,
          bookingRef: response.data.booking_ref || `BK-${response.data.booking_id}`,
          estimatedMinutes: response.data.estimated_minutes || 90,
          customerName: bookingData.CustomerName,
          phoneNumber: normalizedPhone,
          carBrand: bookingData.CarBrand,
          carModel: bookingData.CarModel,
          carNumber: normalizedPlate,
          appointmentDate: bookingData.AppointmentDate,
          appointmentTime: bookingData.AppointmentTime,
          serviceType: bookingData.ServiceType,
        });
        setBookingData({
          CustomerName: "",
          PhoneNumber: "",
          LineID: "",
          Email: "",
          CarBrand: "Mercedes-Benz",
          CarModel: "",
          CarYear: "",
          CarNumber: "",
          Mileage: "",
          AppointmentDate: "",
          AppointmentTime: "",
          ServiceType: "General Maintenance",
          Notes: "",
          PhotoURL: "",
          Website: "",
          ConsentPDPA: false,
        });
      } else {
        setErrorMessage(response.data.message || "ไม่สามารถบันทึกคิวซ่อมได้ กรุณาตรวจสอบข้อมูลอีกครั้งครับ");
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        setErrorMessage(error.response.data.message);
      } else {
        setErrorMessage("ไม่สามารถเชื่อมต่อระบบได้ในขณะนี้ กรุณาลองใหม่อีกครั้งครับ");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lookupLoading) return;
    setLookupError("");
    setLookupMsg("");
    setLookupLoading(true);
    try {
      const res = await axios.post(`${API_URL}/bookings/lookup`, {
        BookingRef: lookupRef.trim(),
        PhoneNumber: normalizePhoneInput(lookupPhone),
      });
      if (res.data?.status === "Success" && res.data.data) {
        setFoundBooking(res.data.data);
        setRescheduleDate(res.data.data.AppointmentDate);
        setRescheduleTime(res.data.data.AppointmentTime.slice(0, 5));
      } else {
        setFoundBooking(null);
        setLookupError(res.data?.message || "ไม่พบข้อมูลการจองคิวครับ");
      }
    } catch (err) {
      setFoundBooking(null);
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setLookupError(err.response.data.message);
      } else {
        setLookupError("ไม่สามารถค้นหาข้อมูลได้ในขณะนี้ครับ");
      }
    } finally {
      setLookupLoading(false);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundBooking || lookupLoading) return;
    setLookupError("");
    setLookupMsg("");
    setLookupLoading(true);
    try {
      const res = await axios.put(`${API_URL}/bookings/reschedule`, {
        BookingRef: foundBooking.BookingRef,
        PhoneNumber: normalizePhoneInput(lookupPhone),
        AppointmentDate: rescheduleDate,
        AppointmentTime: rescheduleTime,
      });
      if (res.data?.status === "Success") {
        setLookupMsg(res.data.message);
        setFoundBooking({
          ...foundBooking,
          AppointmentDate: rescheduleDate,
          AppointmentTime: rescheduleTime,
        });
      } else {
        setLookupError(res.data?.message || "ไม่สามารถเลื่อนนัดหมายได้ครับ");
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setLookupError(err.response.data.message);
      } else {
        setLookupError("ไม่สามารถเลื่อนนัดหมายได้ครับ");
      }
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!foundBooking || lookupLoading) return;
    if (!confirm("ยืนยันการยกเลิกคิวนัดหมายนี้ครับ?")) return;

    setLookupError("");
    setLookupMsg("");
    setLookupLoading(true);
    try {
      const res = await axios.put(`${API_URL}/bookings/cancel`, {
        BookingRef: foundBooking.BookingRef,
        PhoneNumber: normalizePhoneInput(lookupPhone),
      });
      if (res.data?.status === "Success") {
        setLookupMsg(res.data.message);
        setFoundBooking({ ...foundBooking, Status: "Cancelled" });
      } else {
        setLookupError(res.data?.message || "ไม่สามารถยกเลิกนัดหมายได้ครับ");
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setLookupError(err.response.data.message);
      } else {
        setLookupError("ไม่สามารถยกเลิกนัดหมายได้ครับ");
      }
    } finally {
      setLookupLoading(false);
    }
  };

  const selectedTimeBooked =
    slotInfo && bookingData.AppointmentTime
      ? slotInfo.bookedSlots[bookingData.AppointmentTime.slice(0, 5)] || 0
      : 0;

  // รองรับการกดปุ่ม Escape บนคีย์บอร์ดเพื่อปิดหน้าต่าง Modal (WCAG 2.2 AA Keyboard Navigation)
  useEffect(() => {
    if (!isBookingOpen && !isLookupOpen && !isMobileNavOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsBookingOpen(false);
        setIsLookupOpen(false);
        setIsMobileNavOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isBookingOpen, isLookupOpen, isMobileNavOpen]);

  const currentShowcase = LUXURY_SHOWCASE_SLIDES[activeSlide];

  const navLinks = [
    { label: "หน้าแรก", href: "#home" },
    { label: "รถยุโรปที่รับดูแล", href: "#showcase" },
    { label: "บริการซ่อมบำรุง", href: "#services" },
    { label: "ขั้นตอน & มาตรฐาน", href: "#process" },
    { label: "คำถามที่พบบ่อย", href: "#faq" },
    { label: "ติดต่ออู่", href: "#contact" },
  ];

  return (
    <div id="home" className="min-h-screen bg-[#0b0f17] text-slate-50 font-sans selection:bg-blue-600 selection:text-white overflow-x-clip">
      {/* ลิงก์ข้ามไปยังเนื้อหาหลักสำหรับผู้ใช้คีย์บอร์ดและ Screen Reader (WCAG 2.2 AA) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:font-bold"
      >
        ข้ามไปยังเนื้อหาหลัก
      </a>

      {/* แถบข้อมูลด่วนด้านบนสุด (Top Executive Information Bar) */}
      <div className="hidden md:block bg-[#070a10] border-b border-slate-800/80 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-2.5 flex justify-between items-center">
          <div className="flex items-center gap-6 whitespace-nowrap">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              เวลาทำการ: <strong className="text-slate-200">จันทร์–เสาร์ 08:30 – 17:30 น.</strong>
            </span>
            <span>
              สายด่วนปรึกษาช่าง:{" "}
              <a href="tel:0808996645" className="text-blue-400 font-semibold hover:underline">
                080-899-6645
              </a>
            </span>
            <span className="hidden xl:inline text-slate-500">
              Independent European Automotive Specialist
            </span>
          </div>
          <div className="flex items-center gap-5 whitespace-nowrap">
            <button
              type="button"
              onClick={() => openLookupModal()}
              className="text-slate-300 hover:text-blue-400 transition-colors font-medium"
            >
              ค้นหาสถานะคิวซ่อมด้วยรหัส SM-...
            </button>
          </div>
        </div>
      </div>

      {/* แถบเมนูหลัก (Sticky Luxury Navbar — รองรับทุกขนาดหน้าจอตั้งแต่ 320px ถึงจอใหญ่) */}
      <nav
        aria-label="เมนูหลัก"
        className="sticky top-0 z-40 backdrop-blur-xl bg-[#0b0f17]/95 border-b border-slate-800/80 shadow-lg"
      >
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 md:px-10 h-16 sm:h-20 flex justify-between items-center gap-2 sm:gap-4">
          {/* โลโก้แบรนด์ */}
          <a href="#home" className="flex items-center gap-2.5 sm:gap-3 group shrink-0 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center font-extrabold text-white text-xs sm:text-sm shadow-[0_0_20px_rgba(37,99,235,0.45)] group-hover:scale-105 transition-transform shrink-0">
              SM
            </div>
            <div className="whitespace-nowrap">
              <div className="text-sm sm:text-lg font-extrabold tracking-wider text-blue-500 leading-none">
                THE SENDER <span className="text-white">MOTO</span>
              </div>
              <div className="hidden xs:block sm:block text-[9px] sm:text-[10px] tracking-[0.16em] text-slate-400 uppercase mt-1">
                European Auto Atelier
              </div>
            </div>
          </a>

          {/* ลิงก์เมนูสำหรับหน้าจอคอมพิวเตอร์ (บรรทัดเดียว ไม่เบียดกัน) */}
          <div className="hidden xl:flex items-center gap-6">
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="min-h-11 inline-flex items-center text-sm font-medium text-slate-300 hover:text-blue-400 transition-colors whitespace-nowrap"
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* ปุ่มกดด้านขวา (ปรับขนาดอัตโนมัติตามหน้าจอ มือถือ/แท็บเล็ต/คอม) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => openLookupModal()}
              className="hidden sm:inline-flex items-center justify-center min-h-10 text-xs sm:text-sm text-slate-200 hover:text-blue-400 border border-slate-700 hover:border-blue-500/60 bg-slate-900/80 px-3.5 sm:px-4 py-2 rounded-full transition-colors font-medium whitespace-nowrap"
            >
              เช็กคิว / เลื่อนนัด
            </button>
            <button
              type="button"
              onClick={openBookingModal}
              className="min-h-10 px-3.5 sm:px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] whitespace-nowrap"
            >
              จองคิวซ่อม
            </button>
            {/* ปุ่มเปิดเมนูบนมือถือ/แท็บเล็ต/โน้ตบุ๊กจอเล็ก */}
            <button
              type="button"
              aria-label="เปิดเมนูนำทาง"
              aria-expanded={isMobileNavOpen}
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              className="xl:hidden min-h-10 px-3 flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 hover:border-blue-500 text-xs font-semibold"
            >
              <span>{isMobileNavOpen ? "✕" : "☰"}</span>
              <span className="hidden sm:inline">เมนู</span>
            </button>
          </div>
        </div>

        {/* เมนูเลื่อนลงสำหรับมือถือ แท็บเล็ต และจอขนาดกลาง */}
        {isMobileNavOpen && (
          <div className="xl:hidden border-t border-slate-800 bg-[#0b0f17] px-4 sm:px-6 py-4 space-y-3 shadow-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
              {navLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileNavOpen(false)}
                  className="min-h-11 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-200 hover:bg-slate-900 hover:text-blue-400 flex items-center border border-transparent hover:border-slate-800"
                >
                  {item.label}
                </a>
              ))}
            </div>
            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openLookupModal()}
                  className="flex-1 sm:flex-initial min-h-10 px-4 py-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-xs font-semibold"
                >
                  ค้นหาสถานะ / เลื่อนนัด (SM-...)
                </button>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-400 px-1">
                <span>จันทร์–เสาร์ 08:30 – 17:30 น.</span>
                <a href="tel:0808996645" className="text-blue-400 font-bold">
                  โทร: 080-899-6645
                </a>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main id="main-content">
        {/* 1. Hero Section พร้อมภาพสไลด์รถหรูแบบล็อกความสูงคงที่ (ลูกศรตรงกันทุกภาพ 100% บนทุกอุปกรณ์) */}
        <header className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,#1e293b_0%,#0b0f17_65%)] border-b border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-12 md:py-16 lg:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              
              {/* คอลัมน์ซ้าย: ข้อความหลักที่จัดวรรคตอนภาษาไทยให้อ่านง่ายบนทุกขนาดจอ */}
              <div className="lg:col-span-6 text-left space-y-5 sm:space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 bg-blue-950/40 text-blue-400 text-xs sm:text-sm font-semibold">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <span className="truncate">The Sender Moto &bull; อู่ซ่อมรถยุโรปเฉพาะทาง</span>
                </div>

                <h1 className="text-2xl sm:text-4xl xl:text-[44px] font-extrabold leading-[1.38] text-white">
                  ศูนย์บริการและอู่ซ่อมรถยุโรป
                  <span className="block mt-1 sm:mt-1.5 text-transparent bg-clip-text bg-linear-to-r from-blue-300 via-blue-400 to-blue-500">
                    มาตรฐานวิศวกรรมที่คุณวางใจ
                  </span>
                </h1>

                <p className="text-sm sm:text-base md:text-lg text-slate-300 leading-[1.8] max-w-xl">
                  ดูแลรถยนต์ยุโรปครบวงจร ทั้งเช็กระยะตามกำหนด วิเคราะห์ระบบไฟฟ้าด้วยเครื่องสแกนเฉพาะทาง ซ่อมเครื่องยนต์ เกียร์ และช่วงล่างถุงลม{" "}
                  <strong className="text-white font-semibold">
                    ตรวจเช็กและแจ้งใบเสนอราคาให้ท่านอนุมัติก่อนเริ่มซ่อมทุกคันครับ
                  </strong>
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={openBookingModal}
                    className="min-h-12 px-6 sm:px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm sm:text-base transition-all shadow-[0_0_28px_rgba(37,99,235,0.45)] text-center whitespace-nowrap"
                  >
                    จองคิวเข้ารับบริการออนไลน์
                  </button>
                  <button
                    type="button"
                    onClick={() => openLookupModal()}
                    className="min-h-12 px-5 sm:px-6 py-3.5 border border-slate-700 hover:border-blue-500/60 bg-slate-900/90 text-slate-100 font-semibold rounded-xl text-sm sm:text-base transition-colors text-center whitespace-nowrap"
                  >
                    ตรวจสอบสถานะ / เลื่อนนัด
                  </button>
                </div>

                {/* ตัวเลขสรุปความเชื่อมั่น (2 คอลัมน์บนมือถือ, 4 คอลัมน์บนแท็บเล็ตและคอม) */}
                <div className="pt-2 sm:pt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-3 sm:p-3.5">
                    <div className="text-lg sm:text-xl font-extrabold text-white">8 แบรนด์</div>
                    <div className="text-xs text-slate-400 mt-0.5">รถยุโรปชั้นนำ</div>
                  </div>
                  <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-3 sm:p-3.5">
                    <div className="text-lg sm:text-xl font-extrabold text-blue-400">100%</div>
                    <div className="text-xs text-slate-400 mt-0.5">แจ้งราคาก่อนซ่อม</div>
                  </div>
                  <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-3 sm:p-3.5">
                    <div className="text-lg sm:text-xl font-extrabold text-white">OEM / แท้</div>
                    <div className="text-xs text-slate-400 mt-0.5">อะไหล่ตรงสเปก</div>
                  </div>
                  <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-3 sm:p-3.5">
                    <div className="text-lg sm:text-xl font-extrabold text-emerald-400">24 ชม.</div>
                    <div className="text-xs text-slate-400 mt-0.5">จองและเช็กคิวออนไลน์</div>
                  </div>
                </div>
              </div>

              {/* คอลัมน์ขวา: การ์ดสไลด์รูปรถยุโรปหรู (ล็อกความสูงคงที่ทั้งบนมือถือ แท็บเล็ต และคอม) */}
              <div
                className="lg:col-span-6 w-full min-w-0"
                onMouseEnter={() => setIsCarouselPaused(true)}
                onMouseLeave={() => setIsCarouselPaused(false)}
              >
                <div className="rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-700/80 bg-[#0f1623] shadow-[0_25px_60px_-15px_rgba(2,6,23,0.9)]">
                  {/* กรอบรูปภาพความสูงคงที่ตามขนาดหน้าจอ */}
                  <div className="relative h-[220px] sm:h-[310px] md:h-[360px] w-full overflow-hidden bg-slate-950 select-none">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentShowcase.image}
                      alt={currentShowcase.title}
                      className="w-full h-full object-cover object-center transition-opacity duration-300"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-[#0f1623] via-transparent to-black/40 pointer-events-none" />

                    {/* ป้ายกำกับด้านบนรูป */}
                    <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 flex justify-between items-center gap-2 pointer-events-none">
                      <span className="px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-[#0b0f17]/90 backdrop-blur-md border border-slate-700 text-[11px] sm:text-xs font-bold text-blue-400 whitespace-nowrap">
                        {currentShowcase.brand} Specialist
                      </span>
                      <span className="hidden sm:inline-block px-3 py-1.5 rounded-full bg-[#0b0f17]/85 backdrop-blur-md border border-slate-800 text-xs text-slate-200 whitespace-nowrap">
                        {currentShowcase.diagnosticTool}
                      </span>
                    </div>

                    {/* ปุ่มลูกศร SVG ซ้าย-ขวา กึ่งกลางแนวตั้งเท่ากันเป๊ะและไม่ขยับเมื่อเปลี่ยนรูป */}
                    <button
                      type="button"
                      aria-label="รูปรถก่อนหน้า"
                      onClick={prevSlide}
                      className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#0b0f17]/85 hover:bg-blue-600 text-white border border-slate-600/80 flex items-center justify-center transition-colors shadow-lg cursor-pointer"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-label="รูปรถถัดไป"
                      onClick={nextSlide}
                      className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#0b0f17]/85 hover:bg-blue-600 text-white border border-slate-600/80 flex items-center justify-center transition-colors shadow-lg cursor-pointer"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  </div>

                  {/* แถบข้อมูลด้านล่างสไลด์ ล็อกความสูงบรรทัดเดียว (truncate) เพื่อไม่ให้การ์ดยืด-หด */}
                  <div className="p-4 sm:p-6 bg-[#0f1623] border-t border-slate-800/90">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-base sm:text-xl font-bold text-white truncate">
                          {currentShowcase.title}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-400 mt-0.5 sm:mt-1 truncate">
                          รุ่นที่ดูแลประจำ: <span className="text-slate-200">{currentShowcase.popularModels}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          openBookingModalWithPreset(
                            currentShowcase.brand,
                            currentShowcase.recommendedService
                          )
                        }
                        className="w-full sm:w-auto min-h-10 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold transition-colors shrink-0 whitespace-nowrap text-center"
                      >
                        จองคิวซ่อม {currentShowcase.brand} &rarr;
                      </button>
                    </div>

                    {/* ปุ่มเลือกแบรนด์ใต้ภาพ ล็อกให้อยู่ในแถวเดียวเสมอ (เลื่อนซ้าย-ขวาได้บนจอมือถือเล็ก) */}
                    <div className="flex items-center justify-between gap-2 mt-4 pt-3.5 border-t border-slate-800/80">
                      <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
                        {LUXURY_SHOWCASE_SLIDES.map((s, idx) => (
                          <button
                            key={s.brand}
                            type="button"
                            onClick={() => setActiveSlide(idx)}
                            className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                              idx === activeSlide
                                ? "bg-blue-600 text-white shadow-xs"
                                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                            }`}
                          >
                            {s.brand}
                          </button>
                        ))}
                      </div>
                      <span className="text-xs text-slate-400 font-mono shrink-0 pl-1">
                        {activeSlide + 1}/{LUXURY_SHOWCASE_SLIDES.length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </header>

        {/* 2. รถยุโรปที่รับดูแล (จัดรูปแบบ Grid การ์ดดูง่าย เห็นครบทุกแบรนด์ในหน้าเดียว) */}
        <section id="showcase" className="max-w-7xl mx-auto px-5 sm:px-6 md:px-10 py-20 border-b border-slate-900">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-xs uppercase tracking-widest text-blue-400 font-semibold mb-2">
              European Marque Specialists
            </p>
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-3">
              รถยนต์ยุโรปที่เราเชี่ยวชาญเป็นพิเศษ
            </h2>
            <p className="text-sm md:text-base text-slate-400">
              คัดสรรเครื่องมือวิเคราะห์ระบบไฟฟ้าตรงรุ่นและอะไหล่มาตรฐานสำหรับรถยุโรปแต่ละแบรนด์ สามารถกดปุ่มเลือกแบรนด์รถของท่านเพื่อจองคิวได้ทันทีครับ
            </p>
          </div>

          {/* ตารางการ์ดรถยุโรป 5 กลุ่มหลัก ดูง่าย สบายตา */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {LUXURY_SHOWCASE_SLIDES.map((item) => (
              <div
                key={item.brand}
                className="bg-slate-900/85 border border-slate-800 hover:border-blue-500/50 rounded-2xl overflow-hidden flex flex-col justify-between transition-all shadow-lg"
              >
                <div>
                  <div className="relative h-48 w-full overflow-hidden bg-slate-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-slate-900 via-transparent to-black/30" />
                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#0b0f17]/90 border border-slate-700 text-xs font-bold text-blue-400">
                      {item.brand}
                    </span>
                    <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-[#0b0f17]/85 border border-slate-800 text-[11px] text-slate-300">
                      {item.diagnosticTool}
                    </span>
                  </div>

                  <div className="p-6 space-y-3">
                    <h3 className="text-lg font-bold text-white">{item.title}</h3>
                    <p className="text-xs text-slate-400">
                      <strong className="text-slate-200">รุ่นยอดนิยม:</strong> {item.popularModels}
                    </p>
                    <ul className="space-y-2 pt-2 border-t border-slate-800/80 text-xs sm:text-sm text-slate-300">
                      {item.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold mt-0.5">&#10003;</span>
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <button
                    type="button"
                    onClick={() => openBookingModalWithPreset(item.brand, item.recommendedService)}
                    className="w-full min-h-11 py-2.5 px-4 bg-blue-600/15 hover:bg-blue-600 border border-blue-500/40 text-blue-300 hover:text-white font-bold rounded-xl text-xs sm:text-sm transition-colors"
                  >
                    นัดหมายซ่อม {item.brand} &rarr;
                  </button>
                </div>
              </div>
            ))}

            {/* การ์ดที่ 6: แบรนด์ยุโรปอื่นๆ ที่รับดูแลครบวงจร */}
            <div className="bg-linear-to-br from-slate-900 to-[#0f172a] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-lg">
              <div className="space-y-4">
                <span className="inline-block px-3 py-1 rounded-full bg-blue-950/60 border border-blue-500/30 text-blue-400 text-xs font-bold">
                  All European Marques
                </span>
                <h3 className="text-lg font-bold text-white">
                  ครอบคลุมรถยนต์ยุโรปชั้นนำทุกรุ่น
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  ไม่ว่าจะเป็นรถยุโรปเครื่องยนต์เบนซิน ดีเซลเทอร์โบ หรือ Plug-in Hybrid สามารถเลือกแบรนด์รถของท่านเพื่อจองคิวตรวจเช็กได้ทันทีครับ
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {EUROPEAN_BRANDS.map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => openBookingModalWithPreset(brand)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#0b0f17] border border-slate-700 hover:border-blue-500 text-slate-200 hover:text-blue-400 text-xs font-semibold transition-colors"
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-800 space-y-3">
                <button
                  type="button"
                  onClick={openBookingModal}
                  className="w-full min-h-11 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs sm:text-sm transition-colors"
                >
                  เปิดแบบฟอร์มจองคิวซ่อม
                </button>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  หมายเหตุ: The Sender Moto เป็นอู่ซ่อมรถยุโรปเฉพาะทางอิสระ (Independent Specialist Workshop) มิใช่ตัวแทนจำหน่ายหรือศูนย์บริการอย่างเป็นทางการของแบรนด์รถยนต์ข้างต้นครับ
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. บริการหลักของเรา (Comprehensive Services Section) */}
        <section id="services" className="max-w-7xl mx-auto px-5 sm:px-6 md:px-12 py-20">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-widest text-blue-400 font-semibold mb-2">
              Our Specialized Services
            </p>
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-3">
              บริการหลักของ The Sender Moto
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base">
              ครอบคลุมตั้งแต่งานเช็กระยะตามตารางบำรุงรักษา ไปจนถึงงานวิเคราะห์ระบบไฟฟ้า เครื่องยนต์ และช่วงล่างซับซ้อนของรถยุโรปครับ
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SERVICE_CARDS.map((srv) => (
              <div
                key={srv.code}
                className="bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all shadow-lg"
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-blue-400 text-xs font-bold uppercase tracking-widest">
                      {srv.code} / {srv.tag}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-[#0b0f17] border border-slate-800 text-xs text-slate-300 font-medium">
                      เวลาประเมิน: {srv.duration}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{srv.title}</h3>
                  <p className="text-sm text-slate-300 leading-relaxed mb-5">
                    {srv.description}
                  </p>
                  <div className="bg-[#0b0f17] border border-slate-800/90 rounded-2xl p-4 space-y-2 mb-6">
                    <div className="text-xs font-semibold text-slate-400">
                      ขอบเขตการตรวจเช็กและปฏิบัติงาน:
                    </div>
                    <ul className="space-y-1.5 text-xs sm:text-sm text-slate-300">
                      {srv.checklist.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">&#8226;</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <span className="text-xs text-slate-400">
                    แจ้งใบเสนอราคาก่อนเริ่มงานซ่อมเสมอ
                  </span>
                  <button
                    type="button"
                    onClick={() => openBookingModalWithPreset(undefined, srv.serviceKey)}
                    className="min-h-11 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    เลือกจองบริการนี้ &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. ขั้นตอนการเข้ารับบริการ 4 ขั้นตอน (How It Works) */}
        <section id="process" className="bg-slate-900/40 border-y border-slate-800/80 py-20 px-5 sm:px-6 md:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-xs uppercase tracking-widest text-blue-400 font-semibold mb-2">
                Transparent Service Workflow
              </p>
              <h2 className="text-2xl md:text-4xl font-bold text-white mb-2">
                ขั้นตอนการเข้ารับบริการที่โปร่งใส ตรวจสอบได้ทุกขั้นตอน
              </h2>
              <p className="text-sm text-slate-400">
                ลดเวลารอคอยด้วยระบบจัดคิวตามช่องซ่อม (จำกัดสูงสุดไม่เกิน 2 คันต่อช่วงเวลา เพื่อความประณีตสูงสุด) ครับ
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
              <div className="bg-[#0b0f17] border border-slate-800 rounded-2xl p-6 relative">
                <span className="inline-block px-3 py-1 rounded-full bg-blue-950/60 text-blue-400 font-bold text-xs mb-3">
                  STEP 01
                </span>
                <h3 className="font-bold text-white text-lg mb-2">นัดหมายคิวออนไลน์</h3>
                <p className="text-slate-400 leading-relaxed">
                  เลือกวัน-เวลาที่สะดวก แนบรูปไฟเตือนหรืออาการรถเบื้องต้น และรับรหัสอ้างอิง (`SM-YYMMDD-XXXX`) ทันทีครับ
                </p>
              </div>
              <div className="bg-[#0b0f17] border border-slate-800 rounded-2xl p-6 relative">
                <span className="inline-block px-3 py-1 rounded-full bg-blue-950/60 text-blue-400 font-bold text-xs mb-3">
                  STEP 02
                </span>
                <h3 className="font-bold text-white text-lg mb-2">ตรวจเช็กและเสนอราคา</h3>
                <p className="text-slate-400 leading-relaxed">
                  ทีมช่างตรวจสอบอาการจริงด้วยเครื่องวิเคราะห์เฉพาะทาง และแจ้งใบเสนอราคาให้ท่านอนุมัติก่อนเริ่มซ่อมทุกครั้งครับ
                </p>
              </div>
              <div className="bg-[#0b0f17] border border-slate-800 rounded-2xl p-6 relative">
                <span className="inline-block px-3 py-1 rounded-full bg-blue-950/60 text-blue-400 font-bold text-xs mb-3">
                  STEP 03
                </span>
                <h3 className="font-bold text-white text-lg mb-2">ดำเนินการซ่อมบำรุง</h3>
                <p className="text-slate-400 leading-relaxed">
                  ซ่อมบำรุงด้วยความประณีต พร้อมอัปเดตสถานะงานซ่อม (`กำลังซ่อม` &rarr; `รถพร้อมรับ`) ให้เช็กออนไลน์ได้ตลอดเวลาครับ
                </p>
              </div>
              <div className="bg-[#0b0f17] border border-slate-800 rounded-2xl p-6 relative">
                <span className="inline-block px-3 py-1 rounded-full bg-blue-950/60 text-blue-400 font-bold text-xs mb-3">
                  STEP 04
                </span>
                <h3 className="font-bold text-white text-lg mb-2">ตรวจสอบและส่งมอบรถ</h3>
                <p className="text-slate-400 leading-relaxed">
                  ทดสอบความสมบูรณ์ก่อนส่งมอบรถ พร้อมใบสรุปรายการอะไหล่ ใบเสร็จรับเงินชัดเจน และคำแนะนำการดูแลรักษาครับ
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. มาตรฐานอู่ เครื่องมือ และนโยบายราคาโปร่งใส (Workshop & Standards) */}
        <section id="workshop" className="max-w-7xl mx-auto px-5 sm:px-6 md:px-12 py-20 space-y-12">
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-blue-400 font-semibold mb-2">
              Workshop &amp; Service Standards
            </p>
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-3">
              มาตรฐานอู่ ทีมช่าง และนโยบายราคาโปร่งใส
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base">
              เราดูแลรถยนต์ยุโรปทุกคันด้วยความระมัดระวัง หุ้มเบาะและพวงมาลัยป้องกันรอยเปื้อนทุกครั้ง และชี้แจงรายการซ่อมตามความเป็นจริงครับ
            </p>
          </div>

          {/* ภาพประกอบมาตรฐานการดูแลรักษารถยุโรป + หมายเหตุสำหรับเปลี่ยนเป็นรูปอู่จริง */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
              <div className="h-60 overflow-hidden bg-slate-950 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/cars/workshop-bay.jpg"
                  alt="ช่องซ่อมและเครื่องมือวิเคราะห์มาตรฐานรถยุโรป"
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#0b0f17]/85 border border-slate-700 text-blue-400 text-xs font-bold">
                  Diagnostic &amp; Service Bay
                </span>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold text-white mb-2">
                  บริเวณช่องซ่อมและเครื่องมือมาตรฐานสำหรับรถยุโรป
                </h3>
                <p className="text-xs text-slate-400">
                  [TODO: ใส่รูปภาพจริงของหน้าอู่ ช่องซ่อม และลิฟต์ยกรถของ The Sender Moto ก่อนเปิดใช้งานจริง]
                </p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
              <div className="h-60 overflow-hidden bg-slate-950 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/cars/engine-care.jpg"
                  alt="การตรวจสอบเครื่องยนต์และอะไหล่รถยุโรปอย่างละเอียด"
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#0b0f17]/85 border border-slate-700 text-blue-400 text-xs font-bold">
                  Precision Mechanical Care
                </span>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold text-white mb-2">
                  ทีมช่างผู้เชี่ยวชาญและเครื่องวิเคราะห์ระบบไฟฟ้าเฉพาะทาง
                </h3>
                <p className="text-xs text-slate-400">
                  [TODO: ใส่รูปภาพจริงของทีมช่างขณะปฏิบัติงานและเครื่องวิเคราะห์ระบบไฟฟ้าของ The Sender Moto]
                </p>
              </div>
            </div>
          </div>

          {/* นโยบายราคาโปร่งใส และการรับประกัน */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-7">
              <h3 className="text-lg font-bold text-blue-400 mb-3">
                นโยบายการประเมินราคาอย่างโปร่งใส (Transparent Pricing)
              </h3>
              <ul className="space-y-2.5 text-sm text-slate-300 list-disc list-inside">
                <li>ตรวจเช็กอาการด้วยเครื่องมือวิเคราะห์และแจ้งสาเหตุที่แท้จริงให้ลูกค้าทราบ</li>
                <li>แจกแจงราคาค่าอะไหล่และค่าแรงเป็นรายชิ้นอย่างชัดเจนก่อนเริ่มงานซ่อม</li>
                <li>เริ่มดำเนินการซ่อมเฉพาะเมื่อได้รับความยินยอมจากลูกค้าแล้วเท่านั้นครับ</li>
                <li>สามารถขอดูอะไหล่เก่าที่ถอดเปลี่ยนทุกชิ้นได้ในวันรับรถครับ</li>
              </ul>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-7">
              <h3 className="text-lg font-bold text-blue-400 mb-3">
                นโยบายอะไหล่และการรับประกันงานซ่อม (Warranty &amp; Policy)
              </h3>
              <ul className="space-y-2.5 text-sm text-slate-300 list-disc list-inside">
                <li>เลือกใช้อะไหล่แท้หรืออะไหล่ OEM มาตรฐานรถยุโรปตามงบประมาณที่ลูกค้าเลือก</li>
                <li>บันทึกประวัติการซ่อมบำรุงและเลขไมล์ลงในระบบทุกครั้งเพื่อใช้อ้างอิงในรอบถัดไป</li>
                <li>ออกใบสรุปรายการซ่อมและใบเสร็จรับเงินชัดเจนทุกใบงาน</li>
                <li>เงื่อนไขการรับประกัน: [TODO: ระบุระยะเวลารับประกันงานซ่อมและอะไหล่จริงของอู่]</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 6. เสียงตอบรับจากลูกค้า (Honest Placeholder — No Fake Reviews) */}
        <section id="reviews" className="bg-slate-900/30 border-y border-slate-800/80 py-16 px-5 sm:px-6 md:px-12">
          <div className="max-w-5xl mx-auto text-center">
            <p className="text-xs uppercase tracking-widest text-blue-400 font-semibold mb-2">
              Customer Feedback
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              เสียงตอบรับจากลูกค้าผู้ใช้บริการจริง
            </h2>
            <div className="bg-[#0b0f17] border border-dashed border-slate-700 rounded-2xl p-8 max-w-3xl mx-auto">
              <p className="text-sm text-slate-300 font-medium mb-2">
                พื้นที่สำหรับแสดงรีวิวจากลูกค้าจริงของ The Sender Moto
              </p>
              <p className="text-xs text-slate-400">
                [TODO: ใส่รีวิวจริงจากลูกค้าที่ใช้บริการจริง หรือฝังลิงก์รีวิวจาก Google Maps / Facebook Page ของอู่ — เว้นไว้เพื่อความซื่อสัตย์ ไม่ใช้รีวิวสมมติครับ]
              </p>
            </div>
          </div>
        </section>

        {/* 7. คำถามที่พบบ่อยแบบพับเปิด-ปิดได้ (Interactive Accordion FAQ) */}
        <section id="faq" className="max-w-4xl mx-auto px-5 sm:px-6 py-20">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-widest text-blue-400 font-semibold mb-2">
              Frequently Asked Questions
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              คำถามที่พบบ่อยเกี่ยวกับการจองคิวและรับบริการ
            </h2>
          </div>
          <div className="space-y-3.5">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full min-h-14 px-6 py-4 text-left flex justify-between items-center gap-4 hover:bg-slate-800/50 transition-colors"
                  >
                    <span className="text-base font-bold text-white">
                      Q: {item.q}
                    </span>
                    <span className="text-blue-400 font-bold text-xl shrink-0">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 pt-1 text-sm text-slate-300 leading-relaxed border-t border-slate-800/60">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 8. ติดต่ออู่ เวลาทำการ และแผนที่ (Contact & Location Section) */}
        <section id="contact" className="max-w-6xl mx-auto px-5 sm:px-6 pb-20">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center shadow-2xl">
            <div className="lg:col-span-7 space-y-4">
              <p className="text-xs uppercase tracking-widest text-blue-400 font-semibold">
                Contact &amp; Location
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                ติดต่ออู่ The Sender Moto
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                สามารถจองคิวผ่านเว็บไซต์ได้ตลอด 24 ชั่วโมง หรือติดต่อสอบถามอาการรถ ประเมินราคาเบื้องต้น และนัดหมายผ่านช่องทางด้านล่างครับ
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-sm text-slate-200">
                <div className="bg-[#0b0f17] border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 block mb-1">เวลาทำการ</span>
                  <span className="font-bold text-white">จันทร์–เสาร์ 08:30 – 17:30 น.</span>
                  <span className="text-xs text-slate-500 block mt-0.5">(หยุดวันอาทิตย์)</span>
                </div>
                <div className="bg-[#0b0f17] border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 block mb-1">โทรศัพท์สายตรง</span>
                  <a href="tel:0808996645" className="font-extrabold text-blue-400 text-lg hover:underline">
                    080-899-6645
                  </a>
                </div>
                <div className="bg-[#0b0f17] border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 block mb-1">สถานที่ตั้งอู่</span>
                  <span className="text-xs text-slate-300">
                    [TODO: ใส่ข้อมูลจริง - ที่อยู่อู่ The Sender Moto]
                  </span>
                </div>
                <div className="bg-[#0b0f17] border border-slate-800 rounded-xl p-4">
                  <span className="text-xs text-slate-400 block mb-1">LINE Official Account</span>
                  <span className="text-xs text-slate-300">
                    [TODO: ใส่ข้อมูลจริง - @LINE_ID]
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col gap-3.5 bg-[#0b0f17] border border-slate-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white">
                ต้องการนำรถเข้าตรวจเช็กหรือเช็กระยะ?
              </h3>
              <p className="text-xs text-slate-400">
                เลือกวันและเวลาที่สะดวก ระบบจะล็อกช่องซ่อมไว้ให้ท่านทันทีครับ
              </p>
              <button
                type="button"
                onClick={openBookingModal}
                className="w-full min-h-12 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors shadow-lg"
              >
                จองคิวซ่อมออนไลน์ทันที
              </button>
              <button
                type="button"
                onClick={() => openLookupModal()}
                className="w-full min-h-11 py-3 border border-slate-700 hover:border-blue-500 text-slate-200 font-semibold rounded-xl text-sm transition-colors"
              >
                เช็กสถานะคิว / เลื่อนวันนัดหมาย
              </button>
              <a
                href="tel:0808996645"
                className="w-full min-h-11 py-3 border border-slate-800 bg-slate-900 hover:border-blue-500 text-blue-400 font-semibold rounded-xl text-center text-sm flex items-center justify-center transition-colors"
              >
                โทรปรึกษาทีมช่าง: 080-899-6645
              </a>
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-400 text-center">
                แผนที่ Google Maps &amp; ปุ่มเพิ่มเพื่อน LINE: [TODO: ใส่ลิงก์ Google Maps และ LINE OA จริงก่อนเปิดใช้งาน]
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 9. ส่วนท้ายเว็บไซต์แบบมืออาชีพ (Multi-Column Executive Footer) */}
      <footer className="border-t border-slate-900 bg-[#070a10] px-6 md:px-12 pt-14 pb-28 md:pb-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-900">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-extrabold text-white text-xs">
                SM
              </div>
              <span className="text-lg font-extrabold tracking-widest text-blue-500">
                THE SENDER <span className="text-white">MOTO</span>
              </span>
            </div>
            <p className="text-slate-400 max-w-md leading-relaxed">
              อู่ซ่อมและดูแลรักษารถยนต์ยุโรปเฉพาะทางอิสระ (Mercedes-Benz, BMW, Audi, Porsche, Volkswagen, Volvo, MINI, Land Rover) ด้วยเครื่องมือวิเคราะห์มาตรฐานและราคายุติธรรมครับ
            </p>
            <p className="text-slate-500">
              เวลาทำการ: จันทร์–เสาร์ 08:30 – 17:30 น. &bull; โทร: 080-899-6645
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-white font-bold uppercase tracking-wider mb-3">
              เมนูนำทาง (Navigation)
            </div>
            <ul className="space-y-2">
              {navLinks.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="hover:text-blue-400 transition-colors">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <div className="text-white font-bold uppercase tracking-wider mb-3">
              บริการออนไลน์ &amp; ข้อมูลกฎหมาย
            </div>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={openBookingModal}
                  className="hover:text-blue-400 transition-colors"
                >
                  จองคิวซ่อมออนไลน์
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => openLookupModal()}
                  className="hover:text-blue-400 transition-colors"
                >
                  ตรวจสอบสถานะ / เลื่อนนัดหมาย
                </button>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-blue-400 transition-colors">
                  นโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-slate-500">
          <p>&copy; 2026 The Sender Moto. Independent European Automotive Service Workshop.</p>
          <p>Designed for Precision &amp; Trust &bull; Bangkok, Thailand</p>
        </div>
      </footer>

      {/* แถบปุ่มด่วนติดขอบล่างสำหรับหน้าจอมือถือ (Sticky Mobile CTA Bar: จองคิว / เช็กคิว / โทร) */}
      <div
        role="region"
        aria-label="ปุ่มลัดสำหรับมือถือ"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0b0f17]/95 backdrop-blur-md border-t border-slate-800 px-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] grid grid-cols-3 gap-2 shadow-[0_-8px_24px_rgba(2,6,23,0.75)]"
      >
        <button
          type="button"
          onClick={openBookingModal}
          className="min-h-11 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center shadow-md whitespace-nowrap"
        >
          จองคิวซ่อม
        </button>
        <button
          type="button"
          onClick={() => openLookupModal()}
          className="min-h-11 border border-slate-700 bg-slate-900 hover:border-blue-500 text-slate-100 font-semibold rounded-xl text-xs flex items-center justify-center whitespace-nowrap"
        >
          เช็กคิว / เลื่อนนัด
        </button>
        <a
          href="tel:0808996645"
          className="min-h-11 border border-emerald-600/60 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 font-semibold rounded-xl text-xs flex items-center justify-center whitespace-nowrap"
        >
          โทรหาอู่
        </a>
      </div>

      {/* Booking Form Modal (รองรับจอมือถือ แท็บเล็ต และคอมพิวเตอร์ครบถ้วน) */}
      {isBookingOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-modal-title"
        >
          <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-3xl max-h-[92dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl text-left">
            
            <div className="p-4 sm:p-6 border-b border-slate-800 flex justify-between items-center gap-3 bg-[#0b0f17] shrink-0">
              <h2 id="booking-modal-title" className="text-base sm:text-2xl font-bold text-blue-400 truncate">
                {bookingResult ? "ยืนยันการจองคิวสำเร็จครับ" : "แบบฟอร์มจองคิวซ่อม — The Sender Moto"}
              </h2>
              <button
                type="button"
                aria-label="ปิดหน้าต่าง"
                onClick={() => setIsBookingOpen(false)}
                className="w-9 h-9 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white flex items-center justify-center text-2xl leading-none shrink-0"
              >
                &times;
              </button>
            </div>

            {bookingResult ? (
              <div className="p-5 sm:p-8 space-y-5 text-slate-200 overflow-y-auto overscroll-contain">
                <div className="bg-emerald-950/40 border border-emerald-700/60 rounded-xl p-4 sm:p-5">
                  <p className="text-emerald-400 font-bold text-base sm:text-lg mb-1">
                    ระบบได้รับข้อมูลการนัดหมายของคุณเรียบร้อยแล้วครับ
                  </p>
                  <p className="text-xs sm:text-sm text-slate-300">
                    กรุณาจดหรือบันทึกหน้าจอรหัสอ้างอิงด้านล่างไว้สำหรับตรวจสอบสถานะ เลื่อนนัด หรือยกเลิกนัดหมายออนไลน์ครับ
                  </p>
                </div>

                <div className="bg-[#0b0f17] border border-slate-800 rounded-xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400 block text-xs">รหัสการจองอ้างอิง (Booking Ref)</span>
                    <span className="font-extrabold text-blue-400 text-lg tracking-wider">
                      {bookingResult.bookingRef}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">ชื่อลูกค้า</span>
                    <span className="font-semibold text-white">{bookingResult.customerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">รถยนต์ / ทะเบียน</span>
                    <span className="font-semibold text-white">
                      {bookingResult.carBrand} {bookingResult.carModel} ({bookingResult.carNumber})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">วันและเวลานัดหมาย</span>
                    <span className="font-semibold text-white">
                      {bookingResult.appointmentDate} เวลา {bookingResult.appointmentTime} น. (ประเมินเวลา ~{bookingResult.estimatedMinutes} นาที)
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const refCode = bookingResult.bookingRef || "";
                      const phoneCode = bookingResult.phoneNumber || "";
                      setBookingResult(null);
                      setIsBookingOpen(false);
                      openLookupModal(refCode, phoneCode);
                    }}
                    className="w-full sm:w-auto px-5 py-3 border border-slate-700 hover:border-blue-500 text-slate-200 font-semibold rounded-xl transition-colors"
                  >
                    ไปหน้าตรวจสอบ / เลื่อนนัด
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBookingResult(null);
                      setIsBookingOpen(false);
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors"
                  >
                    เสร็จสิ้น
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="p-4 sm:p-6 space-y-6 text-slate-300 overflow-y-auto overscroll-contain">
                {errorMessage && (
                  <div className="p-4 rounded-xl bg-red-950/60 border border-red-700 text-red-200 text-sm">
                    {errorMessage}
                  </div>
                )}

                {/* ช่องซ่อนสำหรับดักบอท (Honeypot) */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="booking-website">Website</label>
                  <input
                    id="booking-website"
                    type="text"
                    name="Website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={bookingData.Website}
                    onChange={handleInputChange}
                  />
                </div>

                {/* 1. ข้อมูลลูกค้า */}
                <div>
                  <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                    1. ข้อมูลลูกค้า (Customer)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="booking-customer-name" className="block text-sm mb-1 text-slate-300">
                        ชื่อ-นามสกุล *
                      </label>
                      <input
                        id="booking-customer-name"
                        required
                        type="text"
                        name="CustomerName"
                        maxLength={100}
                        placeholder="เช่น สมชาย ใจดี"
                        value={bookingData.CustomerName}
                        onChange={handleInputChange}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                      />
                      {fieldErrors.CustomerName && (
                        <p className="text-xs text-red-400 mt-1">{fieldErrors.CustomerName}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="booking-phone" className="block text-sm mb-1 text-slate-300">
                        เบอร์โทรศัพท์ (10 หลัก) *
                      </label>
                      <input
                        id="booking-phone"
                        required
                        type="tel"
                        inputMode="numeric"
                        name="PhoneNumber"
                        maxLength={10}
                        placeholder="เช่น 0808996645"
                        value={bookingData.PhoneNumber}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setFieldErrors((prev) => ({ ...prev, PhoneNumber: "" }));
                          setBookingData({ ...bookingData, PhoneNumber: digits });
                        }}
                        onBlur={handlePhoneBlur}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                      {fieldErrors.PhoneNumber && (
                        <p className="text-xs text-red-400 mt-1">{fieldErrors.PhoneNumber}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="booking-line" className="block text-sm mb-1 text-slate-300">
                        LINE ID (ไม่บังคับ)
                      </label>
                      <input
                        id="booking-line"
                        type="text"
                        name="LineID"
                        maxLength={100}
                        placeholder="ระบุ LINE ID เพื่อรับการติดต่อ"
                        value={bookingData.LineID}
                        onChange={handleInputChange}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="booking-email" className="block text-sm mb-1 text-slate-300">
                        อีเมล (ไม่บังคับ)
                      </label>
                      <input
                        id="booking-email"
                        type="email"
                        name="Email"
                        maxLength={100}
                        placeholder="name@example.com"
                        value={bookingData.Email}
                        onChange={handleInputChange}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                      />
                      {fieldErrors.Email && (
                        <p className="text-xs text-red-400 mt-1">{fieldErrors.Email}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. ข้อมูลรถยนต์ */}
                <div>
                  <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                    2. ข้อมูลรถยนต์ (Vehicle)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="booking-car-brand" className="block text-sm mb-1 text-slate-300">
                        แบรนด์รถยนต์ *
                      </label>
                      <select
                        id="booking-car-brand"
                        name="CarBrand"
                        value={bookingData.CarBrand}
                        onChange={handleInputChange}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                      >
                        {EUROPEAN_BRANDS.map((brand) => (
                          <option key={brand} value={brand}>
                            {brand}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="booking-car-model" className="block text-sm mb-1 text-slate-300">
                        รุ่นรถยนต์ *
                      </label>
                      <input
                        id="booking-car-model"
                        required
                        type="text"
                        name="CarModel"
                        maxLength={100}
                        placeholder="เช่น C350e, 320d, Cayenne"
                        value={bookingData.CarModel}
                        onChange={handleInputChange}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                      />
                      {fieldErrors.CarModel && (
                        <p className="text-xs text-red-400 mt-1">{fieldErrors.CarModel}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="booking-car-number" className="block text-sm mb-1 text-slate-300">
                        ทะเบียนรถ *
                      </label>
                      <input
                        id="booking-car-number"
                        required
                        type="text"
                        name="CarNumber"
                        maxLength={15}
                        placeholder="เช่น 1กข 1234"
                        value={bookingData.CarNumber}
                        onChange={handleInputChange}
                        onBlur={handlePlateBlur}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                      />
                      {fieldErrors.CarNumber && (
                        <p className="text-xs text-red-400 mt-1">{fieldErrors.CarNumber}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="booking-car-year" className="block text-sm mb-1 text-slate-300">
                        ปีรถ ค.ศ. (ไม่บังคับ)
                      </label>
                      <input
                        id="booking-car-year"
                        type="number"
                        inputMode="numeric"
                        min={1970}
                        max={2028}
                        name="CarYear"
                        placeholder="เช่น 2021"
                        value={bookingData.CarYear}
                        onChange={handleInputChange}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                      />
                      {fieldErrors.CarYear && (
                        <p className="text-xs text-red-400 mt-1">{fieldErrors.CarYear}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="booking-mileage" className="block text-sm mb-1 text-slate-300">
                        เลขไมล์ปัจจุบัน กม. (ไม่บังคับ)
                      </label>
                      <input
                        id="booking-mileage"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={2000000}
                        name="Mileage"
                        placeholder="เช่น 45000"
                        value={bookingData.Mileage}
                        onChange={handleInputChange}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. ข้อมูลการจองคิว */}
                <div>
                  <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                    3. นัดหมาย (Appointment)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="booking-date" className="block text-sm mb-1 text-slate-300">
                        วันที่เข้าซ่อม (จันทร์–เสาร์) *
                      </label>
                      <input
                        id="booking-date"
                        required
                        type="date"
                        min={todayStr}
                        name="AppointmentDate"
                        value={bookingData.AppointmentDate}
                        onChange={handleInputChange}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 scheme-dark"
                      />
                      {fieldErrors.AppointmentDate && (
                        <p className="text-xs text-red-400 mt-1">{fieldErrors.AppointmentDate}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="booking-time" className="block text-sm mb-1 text-slate-300">
                        เวลา (08:30 - 17:30) *
                      </label>
                      <input
                        id="booking-time"
                        required
                        type="time"
                        min="08:30"
                        max="17:30"
                        name="AppointmentTime"
                        value={bookingData.AppointmentTime}
                        onChange={handleInputChange}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 scheme-dark"
                      />
                      {fieldErrors.AppointmentTime && (
                        <p className="text-xs text-red-400 mt-1">{fieldErrors.AppointmentTime}</p>
                      )}
                      {slotInfo && bookingData.AppointmentTime && (
                        <p className={`text-xs mt-1 ${selectedTimeBooked >= slotInfo.maxPerSlot ? "text-red-400" : "text-emerald-400"}`}>
                          {selectedTimeBooked >= slotInfo.maxPerSlot
                            ? "ช่วงเวลานี้คิวเต็มแล้ว กรุณาเลือกเวลาอื่นครับ"
                            : `ช่องซ่อมว่าง ${slotInfo.maxPerSlot - selectedTimeBooked}/${slotInfo.maxPerSlot} ช่อง`}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="booking-service-type" className="block text-sm mb-1 text-slate-300">
                        บริการที่ต้องการ *
                      </label>
                      <select
                        id="booking-service-type"
                        name="ServiceType"
                        value={bookingData.ServiceType}
                        onChange={handleInputChange}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                      >
                        {Object.entries(SERVICE_DURATION_LABEL).map(([val, label]) => (
                          <option key={val} value={val}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label htmlFor="booking-notes" className="block text-sm mb-1 text-slate-300">
                        อาการเบื้องต้น / รายละเอียดเพิ่มเติม (ไม่บังคับ)
                      </label>
                      <input
                        id="booking-notes"
                        type="text"
                        name="Notes"
                        maxLength={500}
                        placeholder="เช่น ไฟเครื่องโชว์, มีเสียงดังล้อหน้า"
                        value={bookingData.Notes}
                        onChange={handleInputChange}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="booking-photo" className="block text-sm mb-1 text-slate-300">
                        แนบรูปหน้าปัด / อาการรถ (JPG, PNG, WebP ไม่บังคับ)
                      </label>
                      <input
                        id="booking-photo"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoChange}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-blue-600 file:text-white file:font-semibold"
                      />
                      {fieldErrors.PhotoURL && (
                        <p className="text-xs text-red-400 mt-1">{fieldErrors.PhotoURL}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. ความยินยอมตามกฎหมายคุ้มครองข้อมูลส่วนบุคคล (PDPA) */}
                <div className="bg-[#0b0f17] border border-slate-800 rounded-xl p-4">
                  <label htmlFor="booking-consent-pdpa" className="flex items-start gap-3 cursor-pointer text-sm text-slate-300">
                    <input
                      id="booking-consent-pdpa"
                      type="checkbox"
                      name="ConsentPDPA"
                      checked={bookingData.ConsentPDPA}
                      onChange={handleInputChange}
                      className="mt-1 h-4 w-4 accent-blue-600 rounded"
                    />
                    <span>
                      ข้าพเจ้ายินยอมให้ <strong>The Sender Moto</strong> จัดเก็บและใช้ข้อมูลชื่อ เบอร์โทรศัพท์ และข้อมูลรถยนต์เพื่อการนัดหมายคิวซ่อมและติดต่อประสานงานตาม{" "}
                      <Link href="/privacy" target="_blank" className="text-blue-400 hover:underline">
                        นโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)
                      </Link>{" "}
                      *
                    </span>
                  </label>
                  {fieldErrors.ConsentPDPA && (
                    <p className="text-xs text-red-400 mt-2">{fieldErrors.ConsentPDPA}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 mt-2 bg-blue-600 text-white font-bold text-lg rounded-xl hover:bg-blue-500 disabled:opacity-60 transition-colors shadow-lg"
                >
                  {isSubmitting ? "กำลังบันทึกคิวซ่อม..." : "ยืนยันการจองคิว"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal ตรวจสอบสถานะ / เลื่อนนัด / ยกเลิกคิวซ่อม (รองรับมือถือ แท็บเล็ต และคอมพิวเตอร์) */}
      {isLookupOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lookup-modal-title"
        >
          <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-xl max-h-[92dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl text-left">
            <div className="p-4 sm:p-6 border-b border-slate-800 flex justify-between items-center gap-3 bg-[#0b0f17] shrink-0">
              <h2 id="lookup-modal-title" className="text-base sm:text-xl font-bold text-blue-400 truncate">
                ตรวจสอบสถานะ / เลื่อนนัด / ยกเลิกคิวซ่อม
              </h2>
              <button
                type="button"
                aria-label="ปิดหน้าต่าง"
                onClick={() => setIsLookupOpen(false)}
                className="w-9 h-9 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white flex items-center justify-center text-2xl leading-none shrink-0"
              >
                &times;
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-5 text-slate-300 overflow-y-auto overscroll-contain">
              <form onSubmit={handleLookupSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label htmlFor="lookup-ref" className="block text-xs text-slate-400 mb-1">
                    รหัสการจอง (เช่น SM-261105-XXXX) *
                  </label>
                  <input
                    id="lookup-ref"
                    required
                    type="text"
                    value={lookupRef}
                    onChange={(e) => setLookupRef(e.target.value)}
                    placeholder="SM-XXXXXX-XXXX"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="lookup-phone" className="block text-xs text-slate-400 mb-1">
                    เบอร์โทรศัพท์ที่ใช้จอง (10 หลัก) *
                  </label>
                  <input
                    id="lookup-phone"
                    required
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={lookupPhone}
                    onChange={(e) => setLookupPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="0808996645"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={lookupLoading}
                  className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm transition-colors disabled:opacity-60"
                >
                  {lookupLoading ? "กำลังค้นหา..." : "ค้นหาคิวซ่อม"}
                </button>
              </form>

              {lookupError && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-700 text-red-200 text-sm">
                  {lookupError}
                </div>
              )}

              {lookupMsg && (
                <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-700 text-emerald-200 text-sm">
                  {lookupMsg}
                </div>
              )}

              {foundBooking && (
                <div className="bg-[#0b0f17] border border-slate-800 rounded-xl p-5 space-y-4 text-sm">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-xs text-slate-400 block">รหัสการจอง</span>
                      <span className="font-bold text-blue-400 text-base">{foundBooking.BookingRef}</span>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-blue-400 border border-slate-700">
                      สถานะ: {foundBooking.Status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 text-xs block">ลูกค้า</span>
                      <span className="text-white font-medium">{foundBooking.CustomerName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs block">รถยนต์</span>
                      <span className="text-white font-medium">
                        {foundBooking.CarBrand} {foundBooking.CarModel} ({foundBooking.CarNumber})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs block">บริการ</span>
                      <span className="text-white font-medium">{foundBooking.ServiceType}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs block">วันและเวลานัดหมาย</span>
                      <span className="text-white font-medium">
                        {foundBooking.AppointmentDate} เวลา {foundBooking.AppointmentTime} น.
                      </span>
                    </div>
                  </div>

                  {(foundBooking.Status === "Pending" || foundBooking.Status === "Confirmed") && (
                    <form onSubmit={handleRescheduleSubmit} className="pt-4 border-t border-slate-800 space-y-3">
                      <p className="text-xs font-semibold text-slate-300 uppercase">
                        ต้องการเลื่อนวัน-เวลานัดหมาย หรือยกเลิกคิว
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="resched-date" className="block text-xs text-slate-400 mb-1">
                            วันที่ใหม่ (จันทร์–เสาร์)
                          </label>
                          <input
                            id="resched-date"
                            type="date"
                            required
                            min={todayStr}
                            value={rescheduleDate}
                            onChange={(e) => setRescheduleDate(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm scheme-dark"
                          />
                        </div>
                        <div>
                          <label htmlFor="resched-time" className="block text-xs text-slate-400 mb-1">
                            เวลาใหม่ (08:30 - 17:30)
                          </label>
                          <input
                            id="resched-time"
                            type="time"
                            required
                            min="08:30"
                            max="17:30"
                            value={rescheduleTime}
                            onChange={(e) => setRescheduleTime(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm scheme-dark"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row justify-between gap-2 pt-2">
                        <button
                          type="button"
                          disabled={lookupLoading}
                          onClick={handleCancelBooking}
                          className="px-4 py-2 border border-red-800 text-red-300 hover:bg-red-950/60 rounded-lg text-xs font-semibold transition-colors"
                        >
                          ยกเลิกคิวนัดหมายนี้
                        </button>
                        <button
                          type="submit"
                          disabled={lookupLoading}
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-colors"
                        >
                          ยืนยันการเลื่อนนัดหมาย
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
