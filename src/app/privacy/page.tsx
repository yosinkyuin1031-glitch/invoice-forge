import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー | InvoiceForge",
  description: "InvoiceForge（請求書作成システム）のプライバシーポリシー",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-gray-800">
            InvoiceForge
          </Link>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            &larr; ログインへ戻る
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-xl border p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">プライバシーポリシー</h1>
          <p className="text-sm text-gray-500 mb-8">最終更新日：2025年4月1日</p>

          <div className="space-y-8 text-sm text-gray-700 leading-relaxed">

            <section>
              <h2 className="text-base font-bold text-gray-800 mb-3">1. 基本方針</h2>
              <p>
                株式会社ROLE OWL（以下「当社」）は、InvoiceForge（以下「本サービス」）において取得するユーザーの個人情報について、個人情報の保護に関する法律（個人情報保護法）その他の関連法令を遵守し、適切に取り扱います。
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-800 mb-3">2. 取得する情報</h2>
              <p className="mb-2">当社は以下の情報を取得します。</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>メールアドレス（アカウント登録時）</li>
                <li>請求書データ・取引先情報・商品情報（サービス利用時にユーザーが入力するデータ）</li>
                <li>ログイン日時・利用端末情報・IPアドレス（サービスの安全管理のため自動取得）</li>
                <li>支払い情報（決済代行事業者を通じて処理。当社は原則としてカード番号を保持しません）</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-800 mb-3">3. 利用目的</h2>
              <p className="mb-2">取得した情報は以下の目的で利用します。</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>本サービスの提供・運営・改善</li>
                <li>ユーザーへのサポート・お問い合わせ対応</li>
                <li>本サービスに関する重要なお知らせの送信</li>
                <li>不正利用の検知・防止</li>
                <li>利用状況の集計・分析（個人を特定しない形式での統計処理）</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-800 mb-3">4. 第三者提供</h2>
              <p className="mb-2">
                当社は、以下の場合を除き、ユーザーの個人情報を第三者に提供しません。
              </p>
              <ul className="space-y-1 list-disc list-inside">
                <li>ユーザーの同意がある場合</li>
                <li>法令に基づく場合（裁判所・捜査機関等からの要請等）</li>
                <li>人の生命・身体・財産の保護のために必要かつ緊急の場合</li>
                <li>本サービスの提供に必要な範囲での業務委託先への開示（守秘義務を課した上で）</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-800 mb-3">5. 利用するサービス・ツール</h2>
              <p className="mb-2">本サービスでは以下の外部サービスを利用しています。</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>
                  <strong>Supabase</strong>（データベース・認証）：
                  <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">プライバシーポリシー</a>
                </li>
                <li>
                  <strong>Vercel</strong>（ホスティング）：
                  <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">プライバシーポリシー</a>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-800 mb-3">6. セキュリティ</h2>
              <p>
                当社は、取得した個人情報の漏洩・滅失・毀損を防ぐため、合理的なセキュリティ対策を講じます。通信には暗号化（SSL/TLS）を使用し、データは適切なアクセス制御の下で管理します。ただし、インターネット上での完全なセキュリティを保証するものではありません。
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-800 mb-3">7. Cookieの利用</h2>
              <p>
                本サービスでは、セッション管理・認証状態の維持のためにCookieを使用します。ブラウザの設定によりCookieを無効にすることも可能ですが、その場合、本サービスの一部機能が正常に動作しない場合があります。
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-800 mb-3">8. 個人情報の開示・訂正・削除</h2>
              <p>
                ユーザーは当社に対し、保有する個人情報の開示・訂正・追加・削除・利用停止を請求することができます。お問い合わせ先（下記）よりご連絡ください。本人確認の上、合理的な期間内に対応します。
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-800 mb-3">9. 未成年者の利用</h2>
              <p>
                本サービスは成人を対象としています。18歳未満の方は保護者の同意を得た上でご利用ください。
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-800 mb-3">10. プライバシーポリシーの変更</h2>
              <p>
                当社は、法令の変更や本サービスの内容変更に伴い、本ポリシーを改訂することがあります。重要な変更がある場合はサービス上でお知らせします。
              </p>
            </section>

            <section className="pt-4 border-t">
              <p className="text-gray-500">
                <strong>運営者：</strong>株式会社ROLE OWL<br />
                <strong>お問い合わせ：</strong>
                <a href="mailto:info@roleowl.co.jp" className="text-blue-600 hover:underline ml-1">info@roleowl.co.jp</a>
              </p>
            </section>

          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-gray-400">
        <p>&copy; {new Date().getFullYear()} 株式会社ROLE OWL. All rights reserved.</p>
        <div className="mt-2 flex justify-center gap-4">
          <Link href="/terms" className="hover:underline">利用規約</Link>
          <Link href="/privacy" className="hover:underline">プライバシーポリシー</Link>
        </div>
      </footer>
    </div>
  );
}
