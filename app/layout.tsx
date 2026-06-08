import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import Header from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "FII LineGuard | Hệ thống Quản lý & Giám sát Dây chuyền Sản xuất Foxconn Industrial Internet",
  description: "Giám sát & Quản lý Dây chuyền Sản xuất Thông minh – Foxconn Industrial Internet. MKZ - MCKENZIE AUTO LINE",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[#F8F9FC] dark:bg-[#0A0E17] text-[#0F172A] dark:text-slate-200">
        <Header />
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
