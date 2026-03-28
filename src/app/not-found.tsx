import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ページが見つかりません | InvoiceForge",
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6">
          <span className="text-blue-400 text-4xl font-bold select-none">?</span>
        </div>
        <h1 className="text-5xl font-bold text-gray-200 mb-4">404</h1>
        <h2 className="text-lg font-bold text-gray-800 mb-2">
          ページが見つかりません
        </h2>
        <p className="text-sm text-gray-500 mb-8">
          お探しのページは移動または削除された可能性があります。
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          トップへ戻る
        </Link>
        <div className="mt-6 flex justify-center gap-4 text-xs text-gray-400">
          <Link href="/terms" className="hover:underline">利用規約</Link>
          <Link href="/privacy" className="hover:underline">プライバシーポリシー</Link>
        </div>
      </div>
    </div>
  );
}
