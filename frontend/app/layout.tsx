import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://the-sender-moto.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "The Sender Moto | ศูนย์บริการซ่อมและดูแลรักษารถยุโรปครบวงจร",
  description:
    "The Sender Moto อู่ซ่อมและดูแลรักษารถยุโรปเฉพาะทาง (Mercedes-Benz, BMW, Audi, Porsche, Volkswagen, Volvo, MINI, Land Rover) ประเมินราคาก่อนซ่อมชัดเจน นัดหมายคิวออนไลน์",
  alternates: {
    canonical: "/",
  },
  keywords: [
    "The Sender Moto",
    "อู่ซ่อมรถยุโรป",
    "เช็กระยะรถยุโรป",
    "ซ่อม BMW",
    "ซ่อม Mercedes-Benz",
    "ซ่อม Porsche",
    "ซ่อม Audi",
    "จองคิวซ่อมรถออนไลน์",
  ],
  openGraph: {
    title: "The Sender Moto | ศูนย์บริการซ่อมและดูแลรักษารถยุโรปครบวงจร",
    description:
      "นัดหมายคิวซ่อมและเช็กระยะรถยุโรปออนไลน์ มาตรฐานทีมช่างผู้เชี่ยวชาญ ประเมินราคาก่อนซ่อมชัดเจนครับ",
    url: siteUrl,
    siteName: "The Sender Moto",
    locale: "th_TH",
    type: "website",
  },
};

const autoRepairJsonLd = {
  "@context": "https://schema.org",
  "@type": "AutoRepair",
  name: "The Sender Moto",
  description:
    "อู่ซ่อมและดูแลรักษารถยนต์ยุโรปเฉพาะทาง (Mercedes-Benz, BMW, Audi, Porsche, Volkswagen, Volvo, MINI, Land Rover) ประเมินราคาก่อนซ่อมชัดเจน",
  url: siteUrl,
  telephone: "+66-80-899-6645",
  currenciesAccepted: "THB",
  priceRange: "฿฿",
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "08:30",
      closes: "17:30",
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${plusJakarta.variable} ${geistMono.variable} ${notoSansThai.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(autoRepairJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
