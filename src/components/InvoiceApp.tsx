"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Invoice,
  InvoiceItem,
  ClinicSettings,
  MenuTemplate,
  DEFAULT_SETTINGS,
} from "@/lib/types";
import {
  getInvoices,
  saveInvoice,
  deleteInvoice,
  getSettings,
  saveSettings,
  getTemplates,
  saveTemplates,
  generateInvoiceNumber,
} from "@/lib/storage";

type View = "list" | "create" | "edit" | "preview" | "settings";

export default function InvoiceApp() {
  const [view, setView] = useState<View>("list");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<ClinicSettings>(DEFAULT_SETTINGS);
  const [templates, setTemplates] = useState<MenuTemplate[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "sent" | "paid">("all");
  const [loaded, setLoaded] = useState(false);

  // Load data
  useEffect(() => {
    setInvoices(getInvoices());
    setSettings(getSettings());
    setTemplates(getTemplates());
    setLoaded(true);
  }, []);

  // Create new invoice
  const handleNewInvoice = useCallback(() => {
    const now = new Date();
    const invoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: generateInvoiceNumber(),
      issueDate: now.toISOString().split("T")[0],
      dueDate: new Date(now.getTime() + 30 * 86400000).toISOString().split("T")[0],
      clinicName: settings.clinicName,
      clinicAddress: settings.clinicAddress,
      clinicPhone: settings.clinicPhone,
      clinicEmail: settings.clinicEmail,
      clinicLogo: settings.clinicLogo,
      clinicStamp: settings.clinicStamp,
      clientName: "",
      clientAddress: "",
      items: [{ id: `item-${Date.now()}`, name: "", quantity: 1, unitPrice: 0, taxRate: 0.1 }],
      notes: "",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      status: "draft",
    };
    setCurrentInvoice(invoice);
    setView("create");
  }, [settings]);

  // Edit invoice
  const handleEditInvoice = useCallback((inv: Invoice) => {
    setCurrentInvoice({ ...inv, items: inv.items.map((i) => ({ ...i })) });
    setView("edit");
  }, []);

  // Preview invoice
  const handlePreviewInvoice = useCallback((inv: Invoice) => {
    setCurrentInvoice(inv);
    setView("preview");
  }, []);

  // Save invoice
  const handleSaveInvoice = useCallback(() => {
    if (!currentInvoice) return;
    const updated = { ...currentInvoice, updatedAt: new Date().toISOString() };
    saveInvoice(updated);
    setInvoices(getInvoices());
    setView("list");
    setCurrentInvoice(null);
  }, [currentInvoice]);

  // Delete invoice
  const handleDeleteInvoice = useCallback((id: string) => {
    if (!confirm("この請求書を削除しますか？")) return;
    deleteInvoice(id);
    setInvoices(getInvoices());
  }, []);

  // Duplicate invoice
  const handleDuplicateInvoice = useCallback((inv: Invoice) => {
    const newInv: Invoice = {
      ...inv,
      id: `inv-${Date.now()}`,
      invoiceNumber: generateInvoiceNumber(),
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: inv.items.map((i) => ({ ...i, id: `item-${Date.now()}-${Math.random()}` })),
    };
    saveInvoice(newInv);
    setInvoices(getInvoices());
  }, []);

  // Filter invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchSearch =
      !searchQuery ||
      inv.clientName.includes(searchQuery) ||
      inv.invoiceNumber.includes(searchQuery) ||
      inv.items.some((i) => i.name.includes(searchQuery));
    const matchStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Calculations
  const calcSubtotal = (items: InvoiceItem[]) =>
    items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const calcTax = (items: InvoiceItem[]) =>
    items.reduce((sum, i) => sum + Math.floor(i.quantity * i.unitPrice * i.taxRate), 0);
  const calcTotal = (items: InvoiceItem[]) => calcSubtotal(items) + calcTax(items);
  const formatCurrency = (n: number) => `¥${n.toLocaleString()}`;

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ===== LIST VIEW =====
  if (view === "list") {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-800">InvoiceForge</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setView("settings")}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                設定
              </button>
              <button
                onClick={handleNewInvoice}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                + 新規作成
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Search & Filter */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="検索（顧客名・番号・施術名）"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-3 py-2 border rounded-lg text-sm bg-white"
            >
              <option value="all">全て</option>
              <option value="draft">下書き</option>
              <option value="sent">送付済</option>
              <option value="paid">入金済</option>
            </select>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white rounded-xl p-3 border">
              <p className="text-xs text-gray-500">総件数</p>
              <p className="text-xl font-bold text-gray-800">{invoices.length}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border">
              <p className="text-xs text-gray-500">未入金</p>
              <p className="text-xl font-bold text-orange-600">
                {invoices.filter((i) => i.status !== "paid").length}
              </p>
            </div>
            <div className="bg-white rounded-xl p-3 border">
              <p className="text-xs text-gray-500">今月売上</p>
              <p className="text-sm font-bold text-green-600">
                {formatCurrency(
                  invoices
                    .filter((i) => i.status === "paid" && i.issueDate.startsWith(new Date().toISOString().slice(0, 7)))
                    .reduce((sum, i) => sum + calcTotal(i.items), 0)
                )}
              </p>
            </div>
          </div>

          {/* Invoice List */}
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">📄</p>
              <p className="text-gray-500 text-sm">
                {invoices.length === 0
                  ? "請求書がまだありません"
                  : "条件に一致する請求書がありません"}
              </p>
              {invoices.length === 0 && (
                <button
                  onClick={handleNewInvoice}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                >
                  最初の請求書を作成
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-white rounded-xl border p-4 hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-800">
                        {inv.clientName || "（顧客名未入力）"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {inv.invoiceNumber} / {inv.issueDate}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        inv.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : inv.status === "sent"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {inv.status === "paid" ? "入金済" : inv.status === "sent" ? "送付済" : "下書き"}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-gray-800 mb-3">
                    {formatCurrency(calcTotal(inv.items))}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handlePreviewInvoice(inv)}
                      className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                    >
                      プレビュー
                    </button>
                    <button
                      onClick={() => handleEditInvoice(inv)}
                      className="px-3 py-1 text-xs bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDuplicateInvoice(inv)}
                      className="px-3 py-1 text-xs bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                      複製
                    </button>
                    <button
                      onClick={() => handleDeleteInvoice(inv.id)}
                      className="px-3 py-1 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== CREATE / EDIT VIEW =====
  if ((view === "create" || view === "edit") && currentInvoice) {
    return (
      <InvoiceEditor
        invoice={currentInvoice}
        templates={templates}
        onUpdate={setCurrentInvoice}
        onSave={handleSaveInvoice}
        onCancel={() => { setView("list"); setCurrentInvoice(null); }}
        calcSubtotal={calcSubtotal}
        calcTax={calcTax}
        calcTotal={calcTotal}
        formatCurrency={formatCurrency}
        isNew={view === "create"}
      />
    );
  }

  // ===== PREVIEW VIEW =====
  if (view === "preview" && currentInvoice) {
    return (
      <InvoicePreview
        invoice={currentInvoice}
        calcSubtotal={calcSubtotal}
        calcTax={calcTax}
        calcTotal={calcTotal}
        formatCurrency={formatCurrency}
        bankInfo={settings.bankInfo}
        onBack={() => { setView("list"); setCurrentInvoice(null); }}
        onEdit={() => handleEditInvoice(currentInvoice)}
        onStatusChange={(status) => {
          const updated = { ...currentInvoice, status, updatedAt: new Date().toISOString() };
          saveInvoice(updated);
          setInvoices(getInvoices());
          setCurrentInvoice(updated);
        }}
      />
    );
  }

  // ===== SETTINGS VIEW =====
  if (view === "settings") {
    return (
      <SettingsView
        settings={settings}
        templates={templates}
        onSaveSettings={(s) => { saveSettings(s); setSettings(s); }}
        onSaveTemplates={(t) => { saveTemplates(t); setTemplates(t); }}
        onBack={() => setView("list")}
      />
    );
  }

  return null;
}

// ===== INVOICE EDITOR COMPONENT =====
function InvoiceEditor({
  invoice,
  templates,
  onUpdate,
  onSave,
  onCancel,
  calcSubtotal,
  calcTax,
  calcTotal,
  formatCurrency,
  isNew,
}: {
  invoice: Invoice;
  templates: MenuTemplate[];
  onUpdate: (inv: Invoice) => void;
  onSave: () => void;
  onCancel: () => void;
  calcSubtotal: (items: InvoiceItem[]) => number;
  calcTax: (items: InvoiceItem[]) => number;
  calcTotal: (items: InvoiceItem[]) => number;
  formatCurrency: (n: number) => string;
  isNew: boolean;
}) {
  const [showTemplates, setShowTemplates] = useState(false);

  const updateField = <K extends keyof Invoice>(key: K, value: Invoice[K]) => {
    onUpdate({ ...invoice, [key]: value });
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    onUpdate({
      ...invoice,
      items: invoice.items.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    });
  };

  const addItem = () => {
    onUpdate({
      ...invoice,
      items: [...invoice.items, { id: `item-${Date.now()}`, name: "", quantity: 1, unitPrice: 0, taxRate: 0.1 }],
    });
  };

  const removeItem = (id: string) => {
    if (invoice.items.length <= 1) return;
    onUpdate({ ...invoice, items: invoice.items.filter((i) => i.id !== id) });
  };

  const addFromTemplate = (t: MenuTemplate) => {
    onUpdate({
      ...invoice,
      items: [...invoice.items, { id: `item-${Date.now()}-${Math.random()}`, name: t.name, quantity: 1, unitPrice: t.unitPrice, taxRate: t.taxRate }],
    });
    setShowTemplates(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={onCancel} className="text-sm text-gray-600 hover:text-gray-800">
            &larr; 戻る
          </button>
          <h2 className="text-sm font-bold text-gray-800">
            {isNew ? "新規請求書" : "請求書編集"}
          </h2>
          <button
            onClick={onSave}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            保存
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Invoice Info */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">請求書情報</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">請求書番号</label>
              <input
                type="text"
                value={invoice.invoiceNumber}
                onChange={(e) => updateField("invoiceNumber", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">ステータス</label>
              <select
                value={invoice.status}
                onChange={(e) => updateField("status", e.target.value as Invoice["status"])}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1 bg-white"
              >
                <option value="draft">下書き</option>
                <option value="sent">送付済</option>
                <option value="paid">入金済</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">発行日</label>
              <input
                type="date"
                value={invoice.issueDate}
                onChange={(e) => updateField("issueDate", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">支払期限</label>
              <input
                type="date"
                value={invoice.dueDate}
                onChange={(e) => updateField("dueDate", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              />
            </div>
          </div>
        </div>

        {/* Client Info */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">請求先</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500">顧客名</label>
              <input
                type="text"
                value={invoice.clientName}
                onChange={(e) => updateField("clientName", e.target.value)}
                placeholder="例: 山田 太郎 様"
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">住所</label>
              <input
                type="text"
                value={invoice.clientAddress}
                onChange={(e) => updateField("clientAddress", e.target.value)}
                placeholder="例: 東京都渋谷区..."
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-700">明細</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="px-3 py-1 text-xs bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
              >
                テンプレから追加
              </button>
              <button
                onClick={addItem}
                className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
              >
                + 行追加
              </button>
            </div>
          </div>

          {/* Template Selector */}
          {showTemplates && (
            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-green-700 font-medium mb-2">施術メニューテンプレート</p>
              <div className="flex flex-wrap gap-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => addFromTemplate(t)}
                    className="px-3 py-1.5 text-xs bg-white border border-green-300 rounded-lg hover:bg-green-100 transition"
                  >
                    {t.name}（{formatCurrency(t.unitPrice)}）
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {invoice.items.map((item, idx) => (
              <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-medium">#{idx + 1}</span>
                  {invoice.items.length > 1 && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      削除
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(item.id, "name", e.target.value)}
                  placeholder="施術名・項目名"
                  className="w-full px-3 py-2 border rounded-lg text-sm mb-2"
                />
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-gray-400">数量</label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border rounded-lg text-sm mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">単価</label>
                    <input
                      type="number"
                      min={0}
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, "unitPrice", parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-lg text-sm mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">税率</label>
                    <select
                      value={item.taxRate}
                      onChange={(e) => updateItem(item.id, "taxRate", parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg text-sm mt-0.5 bg-white"
                    >
                      <option value={0.1}>10%</option>
                      <option value={0.08}>8%</option>
                      <option value={0}>0%</option>
                    </select>
                  </div>
                </div>
                <p className="text-right text-sm font-medium text-gray-700 mt-1">
                  {formatCurrency(item.quantity * item.unitPrice)}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-4 pt-3 border-t space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">小計</span>
              <span>{formatCurrency(calcSubtotal(invoice.items))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">消費税</span>
              <span>{formatCurrency(calcTax(invoice.items))}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>合計</span>
              <span className="text-blue-600">{formatCurrency(calcTotal(invoice.items))}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">備考</h3>
          <textarea
            value={invoice.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            placeholder="備考・メッセージなど"
            rows={3}
            className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
          />
        </div>

        {/* Save Button (bottom) */}
        <button
          onClick={onSave}
          className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition"
        >
          保存する
        </button>
      </div>
    </div>
  );
}

// ===== INVOICE PREVIEW / PDF COMPONENT =====
function InvoicePreview({
  invoice,
  calcSubtotal,
  calcTax,
  calcTotal,
  formatCurrency,
  bankInfo,
  onBack,
  onEdit,
  onStatusChange,
}: {
  invoice: Invoice;
  calcSubtotal: (items: InvoiceItem[]) => number;
  calcTax: (items: InvoiceItem[]) => number;
  calcTotal: (items: InvoiceItem[]) => number;
  formatCurrency: (n: number) => string;
  bankInfo: string;
  onBack: () => void;
  onEdit: () => void;
  onStatusChange: (status: Invoice["status"]) => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Controls (hidden on print) */}
      <header className="bg-white border-b sticky top-0 z-10 print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={onBack} className="text-sm text-gray-600 hover:text-gray-800">
            &larr; 一覧へ
          </button>
          <div className="flex gap-2">
            <select
              value={invoice.status}
              onChange={(e) => onStatusChange(e.target.value as Invoice["status"])}
              className="px-3 py-1.5 text-xs border rounded-lg bg-white"
            >
              <option value="draft">下書き</option>
              <option value="sent">送付済</option>
              <option value="paid">入金済</option>
            </select>
            <button
              onClick={onEdit}
              className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              編集
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              PDF / 印刷
            </button>
          </div>
        </div>
      </header>

      {/* Invoice Document */}
      <div className="max-w-4xl mx-auto px-4 py-6 print:px-0 print:py-0 print:max-w-none">
        <div
          ref={printRef}
          className="bg-white rounded-xl shadow-sm border p-8 print:shadow-none print:border-none print:rounded-none print:p-12"
          style={{ fontFamily: "'Noto Sans JP', sans-serif" }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 tracking-widest">請 求 書</h1>
          </div>

          {/* Top Section */}
          <div className="flex justify-between mb-8">
            {/* Client */}
            <div className="flex-1">
              <div className="border-b-2 border-gray-800 pb-1 mb-2 inline-block">
                <p className="text-lg font-bold">{invoice.clientName || "（宛名未入力）"}</p>
              </div>
              <p className="text-xs text-gray-500">{invoice.clientAddress}</p>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg inline-block">
                <p className="text-sm text-gray-600">ご請求金額</p>
                <p className="text-2xl font-bold text-blue-700">
                  {formatCurrency(calcTotal(invoice.items))}
                </p>
              </div>
            </div>

            {/* Clinic */}
            <div className="text-right">
              {invoice.clinicLogo && (
                <img
                  src={invoice.clinicLogo}
                  alt="Logo"
                  className="w-20 h-20 object-contain ml-auto mb-2"
                />
              )}
              <p className="font-bold text-sm">{invoice.clinicName}</p>
              <p className="text-xs text-gray-500">{invoice.clinicAddress}</p>
              <p className="text-xs text-gray-500">{invoice.clinicPhone}</p>
              <p className="text-xs text-gray-500">{invoice.clinicEmail}</p>
              {invoice.clinicStamp && (
                <img
                  src={invoice.clinicStamp}
                  alt="印影"
                  className="w-16 h-16 object-contain ml-auto mt-2 opacity-80"
                />
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="flex gap-8 mb-6 text-sm">
            <div>
              <span className="text-gray-500">請求書番号: </span>
              <span className="font-medium">{invoice.invoiceNumber}</span>
            </div>
            <div>
              <span className="text-gray-500">発行日: </span>
              <span className="font-medium">{invoice.issueDate}</span>
            </div>
            <div>
              <span className="text-gray-500">支払期限: </span>
              <span className="font-medium">{invoice.dueDate}</span>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full mb-6 text-sm">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="py-2 px-3 text-left font-medium">項目</th>
                <th className="py-2 px-3 text-center font-medium w-16">数量</th>
                <th className="py-2 px-3 text-right font-medium w-24">単価</th>
                <th className="py-2 px-3 text-center font-medium w-16">税率</th>
                <th className="py-2 px-3 text-right font-medium w-28">金額</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr key={item.id} className={idx % 2 === 0 ? "bg-gray-50" : ""}>
                  <td className="py-2 px-3">{item.name || "（未入力）"}</td>
                  <td className="py-2 px-3 text-center">{item.quantity}</td>
                  <td className="py-2 px-3 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-2 px-3 text-center">{Math.round(item.taxRate * 100)}%</td>
                  <td className="py-2 px-3 text-right font-medium">
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64">
              <div className="flex justify-between py-1 text-sm">
                <span className="text-gray-500">小計</span>
                <span>{formatCurrency(calcSubtotal(invoice.items))}</span>
              </div>
              <div className="flex justify-between py-1 text-sm">
                <span className="text-gray-500">消費税</span>
                <span>{formatCurrency(calcTax(invoice.items))}</span>
              </div>
              <div className="flex justify-between py-2 text-lg font-bold border-t-2 border-gray-800 mt-1">
                <span>合計</span>
                <span>{formatCurrency(calcTotal(invoice.items))}</span>
              </div>
            </div>
          </div>

          {/* Bank Info */}
          {bankInfo && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs font-bold text-gray-600 mb-1">振込先</p>
              <p className="text-sm whitespace-pre-line">{bankInfo}</p>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="mb-6">
              <p className="text-xs font-bold text-gray-600 mb-1">備考</p>
              <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== SETTINGS VIEW =====
function SettingsView({
  settings,
  templates,
  onSaveSettings,
  onSaveTemplates,
  onBack,
}: {
  settings: ClinicSettings;
  templates: MenuTemplate[];
  onSaveSettings: (s: ClinicSettings) => void;
  onSaveTemplates: (t: MenuTemplate[]) => void;
  onBack: () => void;
}) {
  const [localSettings, setLocalSettings] = useState<ClinicSettings>({ ...settings });
  const [localTemplates, setLocalTemplates] = useState<MenuTemplate[]>(templates.map((t) => ({ ...t })));
  const [saved, setSaved] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onSaveSettings(localSettings);
    onSaveTemplates(localTemplates);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleImageUpload = (field: "clinicLogo" | "clinicStamp", file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setLocalSettings((prev) => ({ ...prev, [field]: e.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const addTemplate = () => {
    setLocalTemplates((prev) => [
      ...prev,
      { id: `t-${Date.now()}`, name: "", unitPrice: 0, taxRate: 0.1 },
    ]);
  };

  const removeTemplate = (id: string) => {
    setLocalTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const updateTemplate = (id: string, field: keyof MenuTemplate, value: string | number) => {
    setLocalTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={onBack} className="text-sm text-gray-600 hover:text-gray-800">
            &larr; 戻る
          </button>
          <h2 className="text-sm font-bold text-gray-800">設定</h2>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            {saved ? "保存済!" : "保存"}
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Clinic Info */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">院情報</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500">院名</label>
              <input
                type="text"
                value={localSettings.clinicName}
                onChange={(e) => setLocalSettings((p) => ({ ...p, clinicName: e.target.value }))}
                placeholder="例: 大口神経整体院"
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">住所</label>
              <input
                type="text"
                value={localSettings.clinicAddress}
                onChange={(e) => setLocalSettings((p) => ({ ...p, clinicAddress: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">電話番号</label>
                <input
                  type="tel"
                  value={localSettings.clinicPhone}
                  onChange={(e) => setLocalSettings((p) => ({ ...p, clinicPhone: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">メール</label>
                <input
                  type="email"
                  value={localSettings.clinicEmail}
                  onChange={(e) => setLocalSettings((p) => ({ ...p, clinicEmail: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Logo & Stamp */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">ロゴ・印影</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-2">ロゴ画像</label>
              {localSettings.clinicLogo ? (
                <div className="relative inline-block">
                  <img src={localSettings.clinicLogo} alt="Logo" className="w-24 h-24 object-contain border rounded-lg" />
                  <button
                    onClick={() => setLocalSettings((p) => ({ ...p, clinicLogo: "" }))}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                  >
                    x
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-400 transition"
                >
                  +
                </button>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleImageUpload("clinicLogo", e.target.files[0]); }}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-2">印影画像</label>
              {localSettings.clinicStamp ? (
                <div className="relative inline-block">
                  <img src={localSettings.clinicStamp} alt="Stamp" className="w-24 h-24 object-contain border rounded-lg" />
                  <button
                    onClick={() => setLocalSettings((p) => ({ ...p, clinicStamp: "" }))}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                  >
                    x
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => stampInputRef.current?.click()}
                  className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-400 transition"
                >
                  +
                </button>
              )}
              <input
                ref={stampInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleImageUpload("clinicStamp", e.target.files[0]); }}
              />
            </div>
          </div>
        </div>

        {/* Invoice Settings */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">請求書設定</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">番号プレフィックス</label>
              <input
                type="text"
                value={localSettings.invoicePrefix}
                onChange={(e) => setLocalSettings((p) => ({ ...p, invoicePrefix: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">次の番号</label>
              <input
                type="number"
                min={1}
                value={localSettings.nextInvoiceNumber}
                onChange={(e) => setLocalSettings((p) => ({ ...p, nextInvoiceNumber: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs text-gray-500">振込先情報</label>
            <textarea
              value={localSettings.bankInfo}
              onChange={(e) => setLocalSettings((p) => ({ ...p, bankInfo: e.target.value }))}
              placeholder="例: 三菱UFJ銀行 渋谷支店 普通 1234567 カ）オオクチシンケイセイタイイン"
              rows={3}
              className="w-full px-3 py-2 border rounded-lg text-sm mt-1 resize-none"
            />
          </div>
        </div>

        {/* Menu Templates */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-700">施術メニューテンプレート</h3>
            <button
              onClick={addTemplate}
              className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
            >
              + 追加
            </button>
          </div>
          <div className="space-y-2">
            {localTemplates.map((t) => (
              <div key={t.id} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={t.name}
                  onChange={(e) => updateTemplate(t.id, "name", e.target.value)}
                  placeholder="メニュー名"
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                />
                <input
                  type="number"
                  value={t.unitPrice}
                  onChange={(e) => updateTemplate(t.id, "unitPrice", parseInt(e.target.value) || 0)}
                  placeholder="単価"
                  className="w-24 px-3 py-2 border rounded-lg text-sm"
                />
                <select
                  value={t.taxRate}
                  onChange={(e) => updateTemplate(t.id, "taxRate", parseFloat(e.target.value))}
                  className="w-16 px-2 py-2 border rounded-lg text-sm bg-white"
                >
                  <option value={0.1}>10%</option>
                  <option value={0.08}>8%</option>
                  <option value={0}>0%</option>
                </select>
                <button
                  onClick={() => removeTemplate(t.id)}
                  className="text-red-500 hover:text-red-700 text-xs px-2"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition"
        >
          {saved ? "保存しました!" : "設定を保存"}
        </button>
      </div>
    </div>
  );
}
