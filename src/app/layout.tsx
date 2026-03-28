import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InvoiceForge - 請求書作成システム",
  description: "治療院・サロン向けの請求書作成・管理・分析システム。消費税自動計算、PDF出力、売上分析機能搭載",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "InvoiceForge - 請求書作成システム",
    description: "治療院・サロン向けの請求書作成・管理・分析システム。消費税自動計算、PDF出力、売上分析機能搭載",
    type: "website",
    locale: "ja_JP",
    siteName: "InvoiceForge",
  },
  twitter: {
    card: "summary_large_image",
    title: "InvoiceForge - 請求書作成システム",
    description: "治療院・サロン向けの請求書作成・管理・分析システム。消費税自動計算、PDF出力、売上分析機能搭載",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
