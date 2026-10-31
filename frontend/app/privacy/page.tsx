import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "นโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA) | The Sender Moto",
  description:
    "นโยบายความเป็นส่วนตัวและการคุ้มครองข้อมูลส่วนบุคคล (PDPA) สำหรับลูกค้าที่จองคิวซ่อมและใช้บริการที่อู่ The Sender Moto",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-200 font-sans">
      <nav className="border-b border-slate-800/80 px-6 md:px-12 py-5 flex justify-between items-center bg-[#0b0f17]/90 backdrop-blur-md sticky top-0 z-30">
        <Link href="/" className="text-xl font-extrabold tracking-widest text-blue-500">
          THE SENDER <span className="text-white">MOTO</span>
        </Link>
        <Link href="/" className="text-sm text-slate-400 hover:text-blue-400 transition-colors">
          &larr; กลับสู่หน้าแรก
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 md:py-16 space-y-8 leading-relaxed">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-blue-400 text-xs font-semibold mb-3">
            เวอร์ชันนโยบาย: v1.0
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white">
            นโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            สำหรับระบบนัดหมายคิวซ่อมและให้บริการรถยนต์ยุโรป The Sender Moto ครับ
          </p>
        </div>

        <section className="space-y-3 bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-blue-400">
            1. ข้อมูลส่วนบุคคลที่เราเก็บรวบรวม (Data Minimization)
          </h2>
          <p className="text-sm text-slate-300">
            The Sender Moto เก็บรวบรวมเฉพาะข้อมูลเท่าที่จำเป็นต่อการนัดหมายคิวซ่อม การติดต่อยืนยันคิว และการออกใบงาน/ใบเสร็จรับเงินเท่านั้นครับ ได้แก่:
          </p>
          <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
            <li>ชื่อ–นามสกุล หรือชื่อที่ใช้ติดต่อ</li>
            <li>หมายเลขโทรศัพท์ อีเมล หรือ LINE ID สำหรับติดต่อยืนยันคิวและแจ้งความคืบหน้างานซ่อม</li>
            <li>ข้อมูลรถยนต์ (ยี่ห้อ รุ่น ปีรถ หมายเลขทะเบียน เลขไมล์ อาการเบื้องต้น และรูปอาการรถที่แนบ)</li>
            <li>วันและเวลาที่ทำรายการพร้อมบันทึกเวลาการให้ความยินยอม (UTC Timestamp)</li>
          </ul>
        </section>

        <section className="space-y-3 bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-blue-400">
            2. วัตถุประสงค์ในการใช้ข้อมูล
          </h2>
          <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
            <li>เพื่อจัดตารางนัดหมาย เตรียมช่องซ่อม และประสานงานกับทีมช่าง</li>
            <li>เพื่อติดต่อแจ้งผลตรวจเช็ก ประเมินราคาก่อนซ่อม และแจ้งเมื่อรถพร้อมส่งมอบ</li>
            <li>เพื่อจัดทำประวัติการซ่อมบำรุงและใบแจ้งหนี้/ใบเสร็จรับเงินของรถคันดังกล่าว</li>
          </ul>
        </section>

        <section className="space-y-3 bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-blue-400">
            3. การรักษาความปลอดภัยและการเปิดเผยข้อมูล
          </h2>
          <p className="text-sm text-slate-300">
            ข้อมูลของท่านถูกจัดเก็บในฐานข้อมูลที่เข้ารหัสการเชื่อมต่อ (TLS) และจำกัดสิทธิ์การเข้าถึงเฉพาะเจ้าหน้าที่ของอู่ที่เกี่ยวข้องเท่านั้น เราไม่นำข้อมูลของท่านไปจำหน่ายหรือเปิดเผยแก่บุคคลภายนอกเพื่อการโฆษณาโดยเด็ดขาดครับ
          </p>
        </section>

        <section className="space-y-3 bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-blue-400">
            4. สิทธิของเจ้าของข้อมูลและช่องทางติดต่อ
          </h2>
          <p className="text-sm text-slate-300">
            ท่านมีสิทธิขอเข้าถึง แก้ไข ลบ หรือขอเพิกถอนความยินยอมเกี่ยวกับข้อมูลส่วนบุคคลของท่านได้ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 โดยติดต่อได้ที่:
          </p>
          <p className="text-sm text-white font-medium">
            The Sender Moto — โทรศัพท์:{" "}
            <a href="tel:0808996645" className="text-blue-400 hover:underline">
              080-899-6645
            </a>{" "}
            (จันทร์–เสาร์ 08:30 – 17:30 น.)
          </p>
        </section>
      </main>
    </div>
  );
}
