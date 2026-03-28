import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約 | InvoiceForge",
  description: "InvoiceForge（請求書作成システム）の利用規約",
};

export default function TermsPage() {
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
          <h1 className="text-2xl font-bold text-gray-800 mb-2">利用規約</h1>
          <p className="text-sm text-gray-500 mb-8">最終更新日：2025年4月1日</p>

          <div className="space-y-8 text-sm text-gray-700 leading-relaxed">

            <section>
              <h2 className="text-base font-bold text-gray-800 mb-3">第1条（適用）</h2>
              <p>
                本利用規約（以下「本規約」）は、株式会社ROLE OWL（以下「当社」）が提供するクラウド型請求書作成・管理サービス「InvoiceForge」（以下「本サービス」）の利用に関する条件を定めるものです。ユーザーは本規約に同意した上で本サービスを利用するものとします。
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-800 mb-3">第2条（定義）</h2>
              <ul className="space-y-1 list-disc list-inside">
                <li>「ユーザー」とは、本規約に同意し、本サービスのアカウントを登録した個人または法人を指します。</li>
                <li>「コンテンツ」とは、ユーザーが本サービスに登録・入力した請求書データ、取引先情報、商品情報、その他のデータ一切を指します。</li>
                <li>「本サービス」とは、当社が提供するInvoiceForgeおよびそれに付随するすべての機能・サポートを指します。</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-800 mb-3">第3条（アカウント登録）</h2>
              <ol className="space-y-2 list-decimal list-inside">
                <li>本サービスの利用を希望する方は、当社所定の方法でアカウント登録を行うものとします。</li>
                <li>ユーザーは、正確かつ最新の情報を登録する義務を負います。</li>
                <li>アカウントのIDおよびパスワードは自己の責任において管理するものとし、第三者への貸与・譲渡・売却は禁止します。</li>
                <li>アカウントが不正利用された場合、当社は一切の責任を負いません。</li>
              </ol>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-800 mb-3">第4条（料金・支払い）</h2>
              <ol className="space-y-2 list-decimal list-inside">
                <li>本サービスの利用料金は、当社が別途定める料金表に基づきます。</li>
                <li>ユーザーは当社が指定する方法により利用料金を支払うものとします。</li>
                <li>支払い済みの料金は、法令または本規約に定める場合を除き、返金しません。</li>
                <li>当社は30日前の告知をもって料金を変更することができます。</li>
              </ol>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-800 mb-3">第5条（禁止事項）</h2>
              <p className="mb-2">ユーザーは以下の行為を行ってはなりません。</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>法令または公序良俗に違反する行為</li>
                <li>当社または第三者の知的財産権、プライバシー権、名誉権その他の権利を侵害する行為</li>
                <li>本サービスのサーバーまたはネットワークに過度な負荷をかける行為</li>
                <li>本サービスを不正に複製・改ざん・リバースエンジニアリングする行為</li>
                <li>第三者になりすます行為</li>
                <li>その他、当社が不適切と判断する行為</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-800 mb-3">第6条（サービスの変更・中断・終了）</h2>
              <ol className="space-y-2 list-decimal list-inside">
                <li>当社は、事前通知なく本サービスの内容を変更・追加・削除することができます。</li>
                <li>当社は、システムメンテナンス、障害その他やむを得ない事情がある場合、本サービスを一時停止することができます。</li>
                <li>当社は、30日前の事前通知をもって本サービスを終了することができます。</li>
              </ol>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-800 mb-3">第7条（データの取り扱い）</h2>
              <ol className="space-y-2 list-decimal list-inside">
                <li>ユーザーが登録したコンテンツの著作権はユーザーに帰属します。</li>
                <li>当社はユーザーのコンテンツを本サービスの提供目的に限り使用します。第三者への提供は行いません。</li>
                <li>当社は適切なセキュリティ対策を講じますが、完全な安全性を保証するものではありません。</li>
                <li>アカウント解約後、当社はユーザーのデータを30日間保持した後、削除します。</li>
              </ol>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-800 mb-3">第8条（免責事項）</h2>
              <ol className="space-y-2 list-decimal list-inside">
                <li>当社は、本サービスの内容の正確性、完全性、有用性について保証しません。</li>
                <li>当社は、本サービスの利用により生じた損害について、当社に故意または重大な過失がある場合を除き、責任を負いません。</li>
                <li>当社の損害賠償責任は、問題となった月の利用料金を上限とします。</li>
              </ol>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-800 mb-3">第9条（規約の変更）</h2>
              <p>
                当社は、必要と判断した場合、ユーザーへの事前通知をもって本規約を変更することができます。変更後も本サービスを継続して利用した場合、ユーザーは変更後の規約に同意したものとみなします。
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-gray-800 mb-3">第10条（準拠法・管轄）</h2>
              <p>
                本規約は日本法に準拠します。本サービスに関する一切の紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
              </p>
            </section>

            <section className="pt-4 border-t">
              <p className="text-gray-500">
                <strong>運営者：</strong>株式会社ROLE OWL<br />
                お問い合わせ：<a href="mailto:info@roleowl.co.jp" className="text-blue-600 hover:underline">info@roleowl.co.jp</a>
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
