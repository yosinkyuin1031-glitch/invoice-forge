import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InvoiceForge - BtoB請求書管理",
  description: "BtoB取引・物販向けの請求書作成管理ツール。取引先管理・商品マスター・売上分析・PDF出力対応。",
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
