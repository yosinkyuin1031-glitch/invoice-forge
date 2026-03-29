"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Invoice,
  InvoiceItem,
  ClinicSettings,
  Client,
  Product,
  DEFAULT_SETTINGS,
} from "@/lib/types";
import {
  signIn,
  signUp,
  signOut,
  getUser,
  onAuthChange,
  getInvoices as fetchInvoices,
  saveInvoice as persistInvoice,
  deleteInvoice as removeInvoice,
  getSettings as fetchSettings,
  saveSettings as persistSettings,
  generateInvoiceNumber,
  getClients as fetchClients,
  saveClient as persistClient,
  deleteClient as removeClient,
  getProducts as fetchProducts,
  saveProduct as persistProduct,
  deleteProduct as removeProduct,
  getEcOrders as fetchEcOrders,
  EcOrder,
  getMenuItems as fetchMenuItems,
  MenuMenuItem,
} from "@/lib/storage";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { ConfirmDialog, useConfirmDialog } from "@/components/ui/ConfirmDialog";

type View = "list" | "create" | "edit" | "preview" | "settings" | "clients" | "products" | "analytics" | "ec-orders";

// ===== MAIN APP =====
export default function InvoiceApp() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<View>("list");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<ClinicSettings>(DEFAULT_SETTINGS);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ecOrders, setEcOrders] = useState<EcOrder[]>([]);
  const [menuItems, setMenuItems] = useState<MenuMenuItem[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "sent" | "paid">("all");
  const [loaded, setLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { toasts, removeToast, showSuccess, showError } = useToast();
  const { confirm, dialogProps } = useConfirmDialog();

  // Auth check
  useEffect(() => {
    getUser().then((u) => {
      setUser(u ? { id: u.id, email: u.email } : null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = onAuthChange((u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load data when user is authenticated
  useEffect(() => {
    if (!user) {
      setLoaded(false);
      return;
    }
    Promise.all([
      fetchInvoices(),
      fetchSettings(user.id),
      fetchClients(),
      fetchProducts(),
      fetchEcOrders().catch(() => [] as EcOrder[]),
      fetchMenuItems().catch(() => [] as MenuMenuItem[]),
    ]).then(([invs, sets, cls, prds, eos, mis]) => {
      setInvoices(invs);
      setSettings(sets);
      setClients(cls);
      setProducts(prds);
      setEcOrders(eos);
      setMenuItems(mis);
      setLoaded(true);
    }).catch(() => {
      showError("データの読み込みに失敗しました");
      setLoaded(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const reloadData = useCallback(async () => {
    if (!user) return;
    const [invs, cls, prds, eos, mis] = await Promise.all([
      fetchInvoices(),
      fetchClients(),
      fetchProducts(),
      fetchEcOrders().catch(() => [] as EcOrder[]),
      fetchMenuItems().catch(() => [] as MenuMenuItem[]),
    ]);
    setInvoices(invs);
    setClients(cls);
    setProducts(prds);
    setEcOrders(eos);
    setMenuItems(mis);
  }, [user]);

  // Create new invoice
  const handleNewInvoice = useCallback(async () => {
    if (!user) return;
    const now = new Date();
    const invoiceNumber = await generateInvoiceNumber(user.id);
    const invoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      issueDate: now.toISOString().split("T")[0],
      dueDate: new Date(now.getTime() + 30 * 86400000).toISOString().split("T")[0],
      clinicName: settings.clinicName,
      clinicZip: settings.clinicZip,
      clinicAddress: settings.clinicAddress,
      clinicPhone: settings.clinicPhone,
      clinicEmail: settings.clinicEmail,
      clinicLogo: settings.clinicLogo,
      clinicStamp: settings.clinicStamp,
      clientName: "",
      clientZip: "",
      clientAddress: "",
      clientEmail: "",
      items: [{ id: `item-${Date.now()}`, name: "", quantity: 1, unitPrice: 0, taxRate: 0.1 }],
      notes: "",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      status: "draft",
    };
    setCurrentInvoice(invoice);
    setView("create");
  }, [user, settings]);

  const handleEditInvoice = useCallback((inv: Invoice) => {
    setCurrentInvoice({ ...inv, items: inv.items.map((i) => ({ ...i })) });
    setView("edit");
  }, []);

  const handlePreviewInvoice = useCallback((inv: Invoice) => {
    setCurrentInvoice(inv);
    setView("preview");
  }, []);

  const handleSaveInvoice = useCallback(async () => {
    if (!currentInvoice || !user) return;

    // バリデーション
    if (!currentInvoice.clientName.trim()) {
      showError("取引先名を入力してください");
      return;
    }
    if (currentInvoice.items.length === 0) {
      showError("品目を1つ以上追加してください");
      return;
    }
    const hasInvalidItem = currentInvoice.items.some((item) => item.unitPrice <= 0);
    if (hasInvalidItem) {
      showError("品目の単価は1円以上を入力してください");
      return;
    }

    try {
      const updated = { ...currentInvoice, updatedAt: new Date().toISOString() };
      await persistInvoice(updated, user.id);
      await reloadData();
      showSuccess("請求書を保存しました");
      setView("list");
      setCurrentInvoice(null);
    } catch {
      showError("保存に失敗しました。もう一度お試しください");
    }
  }, [currentInvoice, user, reloadData, showSuccess, showError]);

  const handleDeleteInvoice = useCallback(async (id: string) => {
    const ok = await confirm({
      title: "請求書を削除",
      message: "この請求書を削除しますか？この操作は取り消せません。",
      confirmLabel: "削除する",
    });
    if (!ok) return;
    try {
      await removeInvoice(id);
      await reloadData();
      showSuccess("請求書を削除しました");
    } catch {
      showError("削除に失敗しました");
    }
  }, [confirm, reloadData, showSuccess, showError]);

  const handleDuplicateInvoice = useCallback(async (inv: Invoice) => {
    if (!user) return;
    try {
      const invoiceNumber = await generateInvoiceNumber(user.id);
      const newInv: Invoice = {
        ...inv,
        id: `inv-${Date.now()}`,
        invoiceNumber,
        issueDate: new Date().toISOString().split("T")[0],
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: inv.items.map((i) => ({ ...i, id: `item-${Date.now()}-${Math.random()}` })),
      };
      await persistInvoice(newInv, user.id);
      await reloadData();
      showSuccess("請求書を複製しました");
    } catch {
      showError("複製に失敗しました");
    }
  }, [user, reloadData, showSuccess, showError]);

  // Create invoice from EC order
  const handleCreateInvoiceFromEc = useCallback(async (order: EcOrder) => {
    if (!user) return;
    try {
      const now = new Date();
      const invoiceNumber = await generateInvoiceNumber(user.id);
      const invoice: Invoice = {
        id: `inv-${Date.now()}`,
        invoiceNumber,
        issueDate: now.toISOString().split("T")[0],
        dueDate: new Date(now.getTime() + 30 * 86400000).toISOString().split("T")[0],
        clinicName: settings.clinicName,
        clinicZip: settings.clinicZip,
        clinicAddress: settings.clinicAddress,
        clinicPhone: settings.clinicPhone,
        clinicEmail: settings.clinicEmail,
        clinicLogo: settings.clinicLogo,
        clinicStamp: settings.clinicStamp,
        clientName: order.customerName,
        clientZip: "",
        clientAddress: order.shippingAddress,
        clientEmail: order.customerEmail,
        items: order.items.map((item, idx) => ({
          id: `item-${Date.now()}-${idx}`,
          name: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          taxRate: 0.1,
        })),
        notes: `EC注文: ${order.id}`,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        status: "draft",
      };
      setCurrentInvoice(invoice);
      setView("create");
    } catch {
      showError("請求書の作成に失敗しました");
    }
  }, [user, settings, showError]);

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

  // Auth loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <LoginView />;
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <aside className="hidden md:flex md:flex-col md:w-56 bg-white border-r min-h-screen">
          <div className="px-4 py-4 border-b">
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-24 bg-gray-100 rounded animate-pulse mt-2" />
          </div>
          <nav className="flex-1 px-2 py-3 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </nav>
        </aside>
        <div className="flex-1 px-4 py-4 max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 w-28 bg-gray-200 rounded animate-pulse" />
            <div className="h-9 w-24 bg-blue-200 rounded-lg animate-pulse" />
          </div>
          <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse mb-4" />
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 border">
                <div className="h-3 w-12 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="h-4 w-36 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
                  </div>
                  <div className="h-5 w-14 bg-gray-100 rounded-full animate-pulse" />
                </div>
                <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mt-3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Views that use their own layout
  if ((view === "create" || view === "edit") && currentInvoice) {
    return (
      <>
        <InvoiceEditor
          invoice={currentInvoice}
          clients={clients}
          products={products}
          menuItems={menuItems}
          onUpdate={setCurrentInvoice}
          onSave={handleSaveInvoice}
          onCancel={() => { setView("list"); setCurrentInvoice(null); }}
          calcSubtotal={calcSubtotal}
          calcTax={calcTax}
          calcTotal={calcTotal}
          formatCurrency={formatCurrency}
          isNew={view === "create"}
          userId={user.id}
          showSuccess={showSuccess}
          showError={showError}
        />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  if (view === "preview" && currentInvoice) {
    return (
      <>
        <InvoicePreview
          invoice={currentInvoice}
          calcSubtotal={calcSubtotal}
          calcTax={calcTax}
          calcTotal={calcTotal}
          formatCurrency={formatCurrency}
          bankInfo={settings.bankInfo}
          onBack={() => { setView("list"); setCurrentInvoice(null); }}
          onEdit={() => handleEditInvoice(currentInvoice)}
          onStatusChange={async (status) => {
            if (!user) return;
            try {
              const updated = { ...currentInvoice, status, updatedAt: new Date().toISOString() };
              await persistInvoice(updated, user.id);
              await reloadData();
              setCurrentInvoice(updated);
              const label = status === "paid" ? "入金済" : status === "sent" ? "送付済" : "下書き";
              showSuccess(`ステータスを「${label}」に変更しました`);
            } catch {
              showError("ステータスの変更に失敗しました");
            }
          }}
        />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  // Main layout with sidebar
  const navItems: { key: View; label: string }[] = [
    { key: "list", label: "請求書一覧" },
    { key: "clients", label: "取引先管理" },
    { key: "products", label: "商品管理" },
    { key: "ec-orders", label: "EC注文" },
    { key: "analytics", label: "売上分析" },
    { key: "settings", label: "設定" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex md:flex-col md:w-56 bg-white border-r min-h-screen">
        <div className="px-4 py-4 border-b">
          <h1 className="text-lg font-bold text-gray-800">InvoiceForge</h1>
          <p className="text-xs text-gray-400 mt-0.5">BtoB請求書管理</p>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                view === item.key
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="px-4 py-3 border-t">
          <p className="text-xs text-gray-400 truncate mb-2">{user.email}</p>
          <button
            onClick={signOut}
            aria-label="ログアウト"
            className="text-xs text-red-500 hover:text-red-700"
          >
            ログアウト
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white z-50 flex flex-col" aria-label="モバイルナビゲーション">
            <div className="px-4 py-4 border-b flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-gray-800">InvoiceForge</h1>
                <p className="text-xs text-gray-400">BtoB請求書管理</p>
              </div>
              <button onClick={() => setSidebarOpen(false)} aria-label="メニューを閉じる" className="text-gray-500 text-xl">&times;</button>
            </div>
            <nav className="flex-1 px-2 py-3 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => { setView(item.key); setSidebarOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                    view === item.key
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="px-4 py-3 border-t">
              <p className="text-xs text-gray-400 truncate mb-2">{user.email}</p>
              <button onClick={signOut} className="text-xs text-red-500 hover:text-red-700">ログアウト</button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-h-screen">
        {/* Mobile header */}
        <header className="md:hidden bg-white border-b sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center justify-between">
            <button onClick={() => setSidebarOpen(true)} aria-label="メニューを開く" className="text-gray-600 text-xl">&#9776;</button>
            <h1 className="text-sm font-bold text-gray-800">InvoiceForge</h1>
            <div className="w-6" />
          </div>
        </header>

        {view === "list" && (
          <InvoiceListView
            invoices={invoices}
            filteredInvoices={filteredInvoices}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            handleNewInvoice={handleNewInvoice}
            handlePreviewInvoice={handlePreviewInvoice}
            handleEditInvoice={handleEditInvoice}
            handleDuplicateInvoice={handleDuplicateInvoice}
            handleDeleteInvoice={handleDeleteInvoice}
            calcTotal={calcTotal}
            formatCurrency={formatCurrency}
          />
        )}

        {view === "analytics" && (
          <AnalyticsView
            invoices={invoices}
            clients={clients}
            products={products}
            calcTotal={calcTotal}
            formatCurrency={formatCurrency}
          />
        )}

        {view === "settings" && (
          <SettingsView
            settings={settings}
            userId={user.id}
            onSaveSettings={async (s) => {
              if (!user) return;
              try {
                await persistSettings(s, user.id);
                setSettings(s);
                showSuccess("設定を保存しました");
              } catch {
                showError("設定の保存に失敗しました");
              }
            }}
            onBack={() => setView("list")}
          />
        )}

        {view === "clients" && (
          <ClientsView
            clients={clients}
            invoices={invoices}
            userId={user.id}
            onReload={reloadData}
            calcTotal={calcTotal}
            formatCurrency={formatCurrency}
            showSuccess={showSuccess}
            showError={showError}
            confirm={confirm}
          />
        )}

        {view === "products" && (
          <ProductsView
            products={products}
            userId={user.id}
            onReload={reloadData}
            formatCurrency={formatCurrency}
            showSuccess={showSuccess}
            showError={showError}
            confirm={confirm}
          />
        )}

        {view === "ec-orders" && (
          <EcOrdersView
            ecOrders={ecOrders}
            invoices={invoices}
            settings={settings}
            formatCurrency={formatCurrency}
            onCreateInvoice={handleCreateInvoiceFromEc}
          />
        )}
      </div>

      {/* Toast & ConfirmDialog */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

// ===== LOGIN VIEW =====
function LoginView() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
        setMessage("確認メールを送信しました。メールのリンクをクリックして登録を完了してください。");
      } else {
        await signIn(email, password);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "エラーが発生しました";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">InvoiceForge</h1>
          <p className="text-sm text-gray-500 mt-1">BtoB請求書管理システム</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-800 text-center">
            {isSignUp ? "新規登録" : "ログイン"}
          </h2>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
          {message && <p className="text-sm text-green-600 bg-green-50 rounded-lg p-3">{message}</p>}
          <div>
            <label htmlFor="login-email" className="text-xs text-gray-500">メールアドレス</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-label="メールアドレス"
              className="w-full px-3 py-2 border rounded-lg text-sm mt-1 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
              placeholder="mail@example.com"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="text-xs text-gray-500">パスワード</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              aria-label="パスワード"
              className="w-full px-3 py-2 border rounded-lg text-sm mt-1 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
              placeholder="6文字以上"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "処理中..." : isSignUp ? "登録する" : "ログイン"}
          </button>
          <p className="text-center text-xs text-gray-500">
            {isSignUp ? "既にアカウントをお持ちの方は" : "アカウントをお持ちでない方は"}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(""); setMessage(""); }}
              className="text-blue-600 hover:underline ml-1"
            >
              {isSignUp ? "ログイン" : "新規登録"}
            </button>
          </p>
          {isSignUp && (
            <p className="text-center text-xs text-gray-400">
              登録することで
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline mx-1">利用規約</a>
              および
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline mx-1">プライバシーポリシー</a>
              に同意したものとみなします。
            </p>
          )}
        </form>
        <div className="mt-4 flex justify-center gap-4 text-xs text-gray-400">
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:underline">利用規約</a>
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline">プライバシーポリシー</a>
        </div>
      </div>
    </div>
  );
}

// ===== INVOICE LIST VIEW =====
function InvoiceListView({
  invoices,
  filteredInvoices,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  handleNewInvoice,
  handlePreviewInvoice,
  handleEditInvoice,
  handleDuplicateInvoice,
  handleDeleteInvoice,
  calcTotal,
  formatCurrency,
}: {
  invoices: Invoice[];
  filteredInvoices: Invoice[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: "all" | "draft" | "sent" | "paid";
  setStatusFilter: (s: "all" | "draft" | "sent" | "paid") => void;
  handleNewInvoice: () => void;
  handlePreviewInvoice: (inv: Invoice) => void;
  handleEditInvoice: (inv: Invoice) => void;
  handleDuplicateInvoice: (inv: Invoice) => void;
  handleDeleteInvoice: (id: string) => void;
  calcTotal: (items: InvoiceItem[]) => number;
  formatCurrency: (n: number) => string;
}) {
  const thisMonth = new Date().toISOString().slice(0, 7);

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">請求書一覧</h2>
        <button
          onClick={handleNewInvoice}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          + 新規作成
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="検索（取引先名・番号・商品名）"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="請求書を検索"
          className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          aria-label="ステータスで絞り込み"
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
                .filter((i) => i.status === "paid" && i.issueDate.startsWith(thisMonth))
                .reduce((sum, i) => sum + calcTotal(i.items), 0)
            )}
          </p>
        </div>
      </div>

      {/* Invoice List */}
      {filteredInvoices.length === 0 ? (
        <div className="text-center py-16">
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
                    {inv.clientName || "（取引先名未入力）"}
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
                  aria-label={`${inv.invoiceNumber}をプレビュー`}
                  className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                >
                  プレビュー
                </button>
                <button
                  onClick={() => handleEditInvoice(inv)}
                  aria-label={`${inv.invoiceNumber}を編集`}
                  className="px-3 py-1 text-xs bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  編集
                </button>
                <button
                  onClick={() => handleDuplicateInvoice(inv)}
                  aria-label={`${inv.invoiceNumber}を複製`}
                  className="px-3 py-1 text-xs bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  複製
                </button>
                <button
                  onClick={() => handleDeleteInvoice(inv.id)}
                  aria-label={`${inv.invoiceNumber}を削除`}
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
  );
}

// ===== INVOICE EDITOR COMPONENT =====
function InvoiceEditor({
  invoice,
  clients,
  products,
  menuItems,
  onUpdate,
  onSave,
  onCancel,
  calcSubtotal,
  calcTax,
  calcTotal,
  formatCurrency,
  isNew,
  userId,
  showSuccess,
  showError,
}: {
  invoice: Invoice;
  clients: Client[];
  products: Product[];
  menuItems?: MenuMenuItem[];
  onUpdate: (inv: Invoice) => void;
  onSave: () => void;
  onCancel: () => void;
  calcSubtotal: (items: InvoiceItem[]) => number;
  calcTax: (items: InvoiceItem[]) => number;
  calcTotal: (items: InvoiceItem[]) => number;
  formatCurrency: (n: number) => string;
  isNew: boolean;
  userId: string;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
}) {
  const [showProducts, setShowProducts] = useState(false);
  const [showMenuItems, setShowMenuItems] = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [newClientMode, setNewClientMode] = useState(false);
  const [newClient, setNewClient] = useState<Partial<Client>>({});

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

  const addFromProduct = (p: Product) => {
    onUpdate({
      ...invoice,
      items: [...invoice.items, {
        id: `item-${Date.now()}-${Math.random()}`,
        name: p.name,
        quantity: 1,
        unitPrice: p.unitPrice,
        taxRate: p.taxRate,
      }],
    });
    setShowProducts(false);
  };

  const addFromMenuItem = (m: MenuMenuItem) => {
    onUpdate({
      ...invoice,
      items: [...invoice.items, {
        id: `item-${Date.now()}-${Math.random()}`,
        name: m.name,
        quantity: 1,
        unitPrice: m.price,
        taxRate: 0.1,
      }],
    });
    setShowMenuItems(false);
  };

  const selectClient = (c: Client) => {
    onUpdate({
      ...invoice,
      clientId: c.id,
      clientName: c.companyName,
      clientZip: c.zip,
      clientAddress: c.address,
      clientEmail: c.email,
    });
    setShowClientPicker(false);
  };

  const handleAddNewClient = async () => {
    if (!newClient.companyName) {
      showError("会社名/院名を入力してください");
      return;
    }
    try {
      const saved = await persistClient(newClient as Client, userId);
      selectClient(saved);
      setNewClientMode(false);
      setNewClient({});
      showSuccess("取引先を追加しました");
    } catch {
      showError("取引先の追加に失敗しました");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={onCancel} aria-label="一覧へ戻る" className="text-sm text-gray-600 hover:text-gray-800">
            &larr; 戻る
          </button>
          <h2 className="text-sm font-bold text-gray-800">
            {isNew ? "新規請求書" : "請求書編集"}
          </h2>
          <button
            onClick={onSave}
            aria-label="請求書を保存"
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

        {/* Client & Clinic Info - 2 column */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Client Info (請求先) */}
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-700">請求先（取引先）</h3>
              <button
                onClick={() => setShowClientPicker(!showClientPicker)}
                className="px-3 py-1 text-xs bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
              >
                取引先から選択
              </button>
            </div>

            {/* Client Picker */}
            {showClientPicker && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs text-green-700 font-medium mb-2">取引先一覧</p>
                {clients.length > 0 ? (
                  <div className="space-y-1 max-h-40 overflow-y-auto mb-2">
                    {clients.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => selectClient(c)}
                        className="w-full text-left px-3 py-2 text-xs bg-white border rounded-lg hover:bg-green-100 transition"
                      >
                        <span className="font-medium">{c.companyName}</span>
                        {c.contactName && <span className="text-gray-500 ml-2">{c.contactName}</span>}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 mb-2">取引先が登録されていません</p>
                )}
                {!newClientMode ? (
                  <button
                    onClick={() => setNewClientMode(true)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    + 新規取引先を追加
                  </button>
                ) : (
                  <div className="space-y-2 mt-2 p-2 bg-white rounded-lg border">
                    <input
                      type="text"
                      placeholder="会社名/院名"
                      value={newClient.companyName || ""}
                      onChange={(e) => setNewClient({ ...newClient, companyName: e.target.value })}
                      className="w-full px-2 py-1.5 border rounded text-xs"
                    />
                    <input
                      type="text"
                      placeholder="担当者名"
                      value={newClient.contactName || ""}
                      onChange={(e) => setNewClient({ ...newClient, contactName: e.target.value })}
                      className="w-full px-2 py-1.5 border rounded text-xs"
                    />
                    <input
                      type="email"
                      placeholder="メール"
                      value={newClient.email || ""}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      className="w-full px-2 py-1.5 border rounded text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddNewClient}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        追加して選択
                      </button>
                      <button
                        onClick={() => { setNewClientMode(false); setNewClient({}); }}
                        className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">会社名/院名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={invoice.clientName}
                  onChange={(e) => updateField("clientName", e.target.value)}
                  placeholder="例: 株式会社ABC"
                  required
                  aria-required="true"
                  aria-label="取引先の会社名/院名"
                  className={`w-full px-3 py-2 border rounded-lg text-sm mt-1 ${
                    invoice.clientName.trim() === "" ? "border-red-300 focus:ring-red-300 focus:border-red-400" : ""
                  }`}
                />
                {invoice.clientName.trim() === "" && (
                  <p className="text-xs text-red-500 mt-1" role="alert">取引先名は必須です</p>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500">郵便番号</label>
                <input
                  type="text"
                  value={invoice.clientZip}
                  onChange={(e) => updateField("clientZip", e.target.value)}
                  placeholder="例: 123-4567"
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
              <div>
                <label className="text-xs text-gray-500">メールアドレス</label>
                <input
                  type="email"
                  value={invoice.clientEmail}
                  onChange={(e) => updateField("clientEmail", e.target.value)}
                  placeholder="例: info@example.com"
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
                />
              </div>
            </div>
          </div>

          {/* Clinic Info (発行元) */}
          <div className="bg-white rounded-xl border p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">発行元</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">会社名/院名</label>
                <input
                  type="text"
                  value={invoice.clinicName}
                  onChange={(e) => updateField("clinicName", e.target.value)}
                  placeholder="例: 大口神経整体院"
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">郵便番号</label>
                <input
                  type="text"
                  value={invoice.clinicZip}
                  onChange={(e) => updateField("clinicZip", e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">住所</label>
                <input
                  type="text"
                  value={invoice.clinicAddress}
                  onChange={(e) => updateField("clinicAddress", e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">電話番号</label>
                <input
                  type="tel"
                  value={invoice.clinicPhone}
                  onChange={(e) => updateField("clinicPhone", e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">メールアドレス</label>
                <input
                  type="email"
                  value={invoice.clinicEmail}
                  onChange={(e) => updateField("clinicEmail", e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-700">明細</h3>
            <div className="flex gap-2">
              {menuItems && menuItems.length > 0 && (
                <button
                  onClick={() => { setShowMenuItems(!showMenuItems); setShowProducts(false); }}
                  aria-label="メニュー管理から明細に追加"
                  className="px-3 py-1 text-xs bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100"
                >
                  メニューから追加
                </button>
              )}
              <button
                onClick={() => { setShowProducts(!showProducts); setShowMenuItems(false); }}
                aria-label="商品マスターから明細に追加"
                className="px-3 py-1 text-xs bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
              >
                商品から追加
              </button>
              <button
                onClick={addItem}
                aria-label="明細行を追加"
                className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
              >
                + 行追加
              </button>
            </div>
          </div>

          {/* Menu Item Selector */}
          {showMenuItems && menuItems && menuItems.length > 0 && (
            <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-xs text-purple-700 font-medium mb-2">施術メニュー一覧（メニュー提案管理より）</p>
              {['施術系', '物販系', 'オプション系'].map(cat => {
                const catItems = menuItems.filter(m => m.category === cat);
                if (catItems.length === 0) return null;
                return (
                  <div key={cat} className="mb-2">
                    <p className="text-xs text-purple-500 mb-1">{cat}</p>
                    <div className="flex flex-wrap gap-2">
                      {catItems.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => addFromMenuItem(m)}
                          className="px-3 py-1.5 text-xs bg-white border border-purple-300 rounded-lg hover:bg-purple-100 transition"
                        >
                          {m.name}（{formatCurrency(m.price)}）
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Product Selector */}
          {showProducts && (
            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-green-700 font-medium mb-2">商品・サービス一覧</p>
              {products.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addFromProduct(p)}
                      className="px-3 py-1.5 text-xs bg-white border border-green-300 rounded-lg hover:bg-green-100 transition"
                    >
                      {p.name}（{formatCurrency(p.unitPrice)}）
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">商品が登録されていません。商品管理から登録してください。</p>
              )}
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
                      aria-label={`明細${idx + 1}を削除`}
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
                  placeholder="商品名・サービス名"
                  aria-label={`明細${idx + 1}の品名`}
                  className={`w-full px-3 py-2 border rounded-lg text-sm mb-2 ${
                    item.name.trim() === "" ? "border-red-300" : ""
                  }`}
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
                      className={`w-full px-3 py-2 border rounded-lg text-sm mt-0.5 ${
                        item.unitPrice <= 0 ? "border-red-300" : ""
                      }`}
                    />
                    {item.unitPrice <= 0 && (
                      <p className="text-xs text-red-500 mt-0.5">1円以上</p>
                    )}
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
  const [pdfLoading, setPdfLoading] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setPdfLoading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      } else {
        // 複数ページ対応
        let yOffset = 0;
        while (yOffset < imgHeight) {
          if (yOffset > 0) pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, -yOffset, imgWidth, imgHeight);
          yOffset += pageHeight;
        }
      }

      const filename = `請求書_${invoice.invoiceNumber}_${invoice.clientName || "取引先"}.pdf`;
      pdf.save(filename);
    } catch {
      alert("PDFの生成に失敗しました。ブラウザ印刷をご利用ください。");
    } finally {
      setPdfLoading(false);
    }
  };

  const buildMessageText = () => {
    const items = invoice.items
      .map((item) => `・${item.name}　${item.quantity}点 × ¥${item.unitPrice.toLocaleString()} = ¥${(item.quantity * item.unitPrice).toLocaleString()}`)
      .join("\n");
    const total = calcTotal(invoice.items);
    const subtotal = calcSubtotal(invoice.items);
    const tax = calcTax(invoice.items);

    let msg = `【請求書】${invoice.invoiceNumber}\n`;
    msg += `発行日: ${invoice.issueDate}\n`;
    msg += `支払期限: ${invoice.dueDate}\n\n`;
    msg += `${invoice.clientName} 御中\n\n`;
    msg += `下記の通りご請求申し上げます。\n\n`;
    msg += `--- 明細 ---\n${items}\n\n`;
    msg += `小計: ¥${subtotal.toLocaleString()}\n`;
    msg += `消費税: ¥${tax.toLocaleString()}\n`;
    msg += `合計: ¥${total.toLocaleString()}\n`;
    if (bankInfo) {
      msg += `\n--- 振込先 ---\n${bankInfo}\n`;
    }
    if (invoice.notes) {
      msg += `\n--- 備考 ---\n${invoice.notes}\n`;
    }
    msg += `\n${invoice.clinicName}`;
    if (invoice.clinicPhone) msg += `\nTEL: ${invoice.clinicPhone}`;
    if (invoice.clinicEmail) msg += `\nEmail: ${invoice.clinicEmail}`;
    return msg;
  };

  const handleSendLINE = () => {
    const text = encodeURIComponent(buildMessageText());
    window.location.href = `line://msg/text/${text}`;
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent(`請求書 ${invoice.invoiceNumber}（${invoice.clinicName}）`);
    const body = encodeURIComponent(buildMessageText());
    const to = invoice.clientEmail || "";
    window.open(`mailto:${to}?subject=${subject}&body=${body}`, "_self");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Controls (hidden on print) */}
      <header className="bg-white border-b sticky top-0 z-10 print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={onBack} aria-label="請求書一覧へ戻る" className="text-sm text-gray-600 hover:text-gray-800">
            &larr; 一覧へ
          </button>
          <div className="flex gap-2 flex-wrap justify-end">
            <select
              value={invoice.status}
              onChange={(e) => onStatusChange(e.target.value as Invoice["status"])}
              aria-label="請求書のステータスを変更"
              className="px-3 py-1.5 text-xs border rounded-lg bg-white"
            >
              <option value="draft">下書き</option>
              <option value="sent">送付済</option>
              <option value="paid">入金済</option>
            </select>
            <button
              onClick={onEdit}
              aria-label="請求書を編集"
              className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              編集
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              aria-label="PDFをダウンロード"
              className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {pdfLoading ? "生成中..." : "PDF保存"}
            </button>
            <button
              onClick={handlePrint}
              aria-label="印刷する"
              className="px-4 py-1.5 text-xs bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
            >
              印刷
            </button>
            <button
              onClick={handleSendLINE}
              aria-label="LINEで請求書を送信"
              className="px-4 py-1.5 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium"
            >
              LINEで送る
            </button>
            <button
              onClick={handleSendEmail}
              aria-label="メールで請求書を送信"
              className="px-4 py-1.5 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium"
            >
              メールで送る
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

          {/* Top Section - 2 column */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Client (請求先) */}
            <div>
              <p className="text-xs text-gray-400 mb-1">請求先</p>
              <div className="border-b-2 border-gray-800 pb-1 mb-2 inline-block">
                <p className="text-lg font-bold">{invoice.clientName || "（取引先名未入力）"} 御中</p>
              </div>
              {invoice.clientZip && <p className="text-xs text-gray-500">{invoice.clientZip}</p>}
              {invoice.clientAddress && <p className="text-xs text-gray-500">{invoice.clientAddress}</p>}
              {invoice.clientEmail && <p className="text-xs text-gray-500">{invoice.clientEmail}</p>}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg inline-block">
                <p className="text-sm text-gray-600">ご請求金額</p>
                <p className="text-2xl font-bold text-blue-700">
                  {formatCurrency(calcTotal(invoice.items))}
                </p>
              </div>
            </div>

            {/* Clinic (発行元) */}
            <div className="text-right">
              <p className="text-xs text-gray-400 mb-1">発行元</p>
              {invoice.clinicLogo && (
                <img
                  src={invoice.clinicLogo}
                  alt="Logo"
                  className="w-20 h-20 object-contain ml-auto mb-2"
                />
              )}
              <p className="font-bold text-sm">{invoice.clinicName}</p>
              {invoice.clinicZip && <p className="text-xs text-gray-500">{invoice.clinicZip}</p>}
              {invoice.clinicAddress && <p className="text-xs text-gray-500">{invoice.clinicAddress}</p>}
              {invoice.clinicPhone && <p className="text-xs text-gray-500">{invoice.clinicPhone}</p>}
              {invoice.clinicEmail && <p className="text-xs text-gray-500">{invoice.clinicEmail}</p>}
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

// ===== CLIENTS VIEW =====
function ClientsView({
  clients,
  invoices,
  userId,
  onReload,
  calcTotal,
  formatCurrency,
  showSuccess,
  showError,
  confirm,
}: {
  clients: Client[];
  invoices: Invoice[];
  userId: string;
  onReload: () => Promise<void>;
  calcTotal: (items: InvoiceItem[]) => number;
  formatCurrency: (n: number) => string;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
  confirm: (opts: { title: string; message: string; confirmLabel?: string; danger?: boolean }) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState<Partial<Client> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const filteredClients = clients.filter(
    (c) =>
      !searchQuery ||
      c.companyName.includes(searchQuery) ||
      c.contactName.includes(searchQuery)
  );

  const handleSave = async () => {
    if (!editing || !editing.companyName) {
      showError("会社名/院名を入力してください");
      return;
    }
    try {
      await persistClient(editing as Client, userId);
      await onReload();
      setEditing(null);
      showSuccess(editing.id ? "取引先を更新しました" : "取引先を追加しました");
    } catch {
      showError("保存に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "取引先を削除",
      message: "この取引先を削除しますか？この操作は取り消せません。",
      confirmLabel: "削除する",
    });
    if (!ok) return;
    try {
      await removeClient(id);
      await onReload();
      if (selectedClient?.id === id) setSelectedClient(null);
      showSuccess("取引先を削除しました");
    } catch {
      showError("削除に失敗しました");
    }
  };

  // Client's invoice history
  const clientInvoices = selectedClient
    ? invoices.filter((inv) => inv.clientId === selectedClient.id || inv.clientName === selectedClient.companyName)
    : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">取引先管理</h2>
        <button
          onClick={() => setEditing({ companyName: "", contactName: "", zip: "", address: "", phone: "", email: "", memo: "" })}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + 新規取引先
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="取引先を検索..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        aria-label="取引先を検索"
        className="w-full px-3 py-2 border rounded-lg text-sm mb-4 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
      />

      {/* Edit/Create Form */}
      {editing && (
        <div className="bg-white rounded-xl border p-4 mb-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">
            {editing.id ? "取引先編集" : "新規取引先"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">会社名/院名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={editing.companyName || ""}
                onChange={(e) => setEditing({ ...editing, companyName: e.target.value })}
                required
                aria-required="true"
                aria-label="取引先の会社名/院名"
                className={`w-full px-3 py-2 border rounded-lg text-sm mt-1 ${
                  (editing.companyName || "").trim() === "" ? "border-red-300" : ""
                }`}
              />
              {(editing.companyName || "").trim() === "" && (
                <p className="text-xs text-red-500 mt-1" role="alert">会社名/院名は必須です</p>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-500">担当者名</label>
              <input
                type="text"
                value={editing.contactName || ""}
                onChange={(e) => setEditing({ ...editing, contactName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">郵便番号</label>
              <input
                type="text"
                value={editing.zip || ""}
                onChange={(e) => setEditing({ ...editing, zip: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">住所</label>
              <input
                type="text"
                value={editing.address || ""}
                onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">電話番号</label>
              <input
                type="tel"
                value={editing.phone || ""}
                onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">メール</label>
              <input
                type="email"
                value={editing.email || ""}
                onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500">メモ</label>
              <textarea
                value={editing.memo || ""}
                onChange={(e) => setEditing({ ...editing, memo: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1 resize-none"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              保存
            </button>
            <button
              onClick={() => setEditing(null)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* Client Detail */}
      {selectedClient && (
        <div className="bg-white rounded-xl border p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-700">
              {selectedClient.companyName} の請求履歴
            </h3>
            <button
              onClick={() => setSelectedClient(null)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              閉じる
            </button>
          </div>
          {clientInvoices.length === 0 ? (
            <p className="text-sm text-gray-500">請求履歴がありません</p>
          ) : (
            <div className="space-y-2">
              {clientInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                  <div>
                    <span className="font-medium">{inv.invoiceNumber}</span>
                    <span className="text-gray-500 ml-2">{inv.issueDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      inv.status === "paid" ? "bg-green-100 text-green-700" :
                      inv.status === "sent" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {inv.status === "paid" ? "入金済" : inv.status === "sent" ? "送付済" : "下書き"}
                    </span>
                    <span className="font-bold">{formatCurrency(calcTotal(inv.items))}</span>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t text-sm text-right">
                <span className="text-gray-500">合計: </span>
                <span className="font-bold">
                  {formatCurrency(clientInvoices.reduce((s, inv) => s + calcTotal(inv.items), 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Client List */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">取引先が登録されていません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredClients.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border p-4 hover:shadow-sm transition">
              <div className="flex items-start justify-between">
                <div className="cursor-pointer" onClick={() => setSelectedClient(c)}>
                  <p className="font-medium text-gray-800">{c.companyName}</p>
                  {c.contactName && <p className="text-xs text-gray-500">{c.contactName}</p>}
                  {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                  {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedClient(c)}
                    className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                  >
                    履歴
                  </button>
                  <button
                    onClick={() => setEditing({ ...c })}
                    className="px-3 py-1 text-xs bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="px-3 py-1 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== PRODUCTS VIEW =====
function ProductsView({
  products,
  userId,
  onReload,
  formatCurrency,
  showSuccess,
  showError,
  confirm,
}: {
  products: Product[];
  userId: string;
  onReload: () => Promise<void>;
  formatCurrency: (n: number) => string;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
  confirm: (opts: { title: string; message: string; confirmLabel?: string; danger?: boolean }) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<"all" | "product" | "service" | "other">("all");

  const filteredProducts = products.filter(
    (p) => categoryFilter === "all" || p.category === categoryFilter
  );

  const handleSave = async () => {
    if (!editing || !editing.name) {
      showError("商品名/サービス名を入力してください");
      return;
    }
    try {
      await persistProduct(editing as Product, userId);
      await onReload();
      setEditing(null);
      showSuccess(editing.id ? "商品を更新しました" : "商品を追加しました");
    } catch {
      showError("保存に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "商品を削除",
      message: "この商品を削除しますか？この操作は取り消せません。",
      confirmLabel: "削除する",
    });
    if (!ok) return;
    try {
      await removeProduct(id);
      await onReload();
      showSuccess("商品を削除しました");
    } catch {
      showError("削除に失敗しました");
    }
  };

  const categoryLabel = (cat: string) => {
    switch (cat) {
      case "product": return "商品";
      case "service": return "サービス";
      case "other": return "その他";
      default: return cat;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">商品・サービス管理</h2>
        <button
          onClick={() => setEditing({ name: "", unitPrice: 0, taxRate: 0.1, category: "service", memo: "" })}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + 新規商品
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-4">
        {(["all", "product", "service", "other"] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 text-xs rounded-lg transition ${
              categoryFilter === cat
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cat === "all" ? "全て" : categoryLabel(cat)}
          </button>
        ))}
      </div>

      {/* Edit/Create Form */}
      {editing && (
        <div className="bg-white rounded-xl border p-4 mb-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">
            {editing.id ? "商品編集" : "新規商品"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">商品名/サービス名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={editing.name || ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                required
                aria-required="true"
                aria-label="商品名/サービス名"
                className={`w-full px-3 py-2 border rounded-lg text-sm mt-1 ${
                  (editing.name || "").trim() === "" ? "border-red-300" : ""
                }`}
              />
              {(editing.name || "").trim() === "" && (
                <p className="text-xs text-red-500 mt-1" role="alert">商品名/サービス名は必須です</p>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-500">カテゴリ</label>
              <select
                value={editing.category || "service"}
                onChange={(e) => setEditing({ ...editing, category: e.target.value as Product["category"] })}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1 bg-white"
              >
                <option value="product">商品</option>
                <option value="service">サービス</option>
                <option value="other">その他</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">単価</label>
              <input
                type="number"
                min={0}
                value={editing.unitPrice || 0}
                onChange={(e) => setEditing({ ...editing, unitPrice: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">税率</label>
              <select
                value={editing.taxRate ?? 0.1}
                onChange={(e) => setEditing({ ...editing, taxRate: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1 bg-white"
              >
                <option value={0.1}>10%</option>
                <option value={0.08}>8%</option>
                <option value={0}>0%</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500">メモ</label>
              <textarea
                value={editing.memo || ""}
                onChange={(e) => setEditing({ ...editing, memo: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1 resize-none"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              保存
            </button>
            <button
              onClick={() => setEditing(null)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* Product List */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">商品が登録されていません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredProducts.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border p-4 hover:shadow-sm transition">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-800">{p.name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      p.category === "product" ? "bg-purple-100 text-purple-700" :
                      p.category === "service" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {categoryLabel(p.category)}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-gray-700">
                    {formatCurrency(p.unitPrice)}
                    <span className="text-xs text-gray-400 font-normal ml-1">
                      （税率{Math.round(p.taxRate * 100)}%）
                    </span>
                  </p>
                  {p.memo && <p className="text-xs text-gray-400 mt-1">{p.memo}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing({ ...p })}
                    className="px-3 py-1 text-xs bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="px-3 py-1 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== ANALYTICS VIEW =====
function AnalyticsView({
  invoices,
  clients,
  products,
  calcTotal,
  formatCurrency,
}: {
  invoices: Invoice[];
  clients: Client[];
  products: Product[];
  calcTotal: (items: InvoiceItem[]) => number;
  formatCurrency: (n: number) => string;
}) {
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);

  // Monthly totals for recent 6 months
  const monthlyData: { month: string; total: number; paid: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.toISOString().slice(0, 7);
    const monthInvoices = invoices.filter((inv) => inv.issueDate.startsWith(m));
    monthlyData.push({
      month: `${d.getMonth() + 1}月`,
      total: monthInvoices.reduce((s, inv) => s + calcTotal(inv.items), 0),
      paid: monthInvoices.filter((inv) => inv.status === "paid").reduce((s, inv) => s + calcTotal(inv.items), 0),
    });
  }
  const maxMonthly = Math.max(...monthlyData.map((d) => d.total), 1);

  // This month vs last month
  const thisMonthTotal = invoices
    .filter((inv) => inv.issueDate.startsWith(thisMonth))
    .reduce((s, inv) => s + calcTotal(inv.items), 0);
  const lastMonthTotal = invoices
    .filter((inv) => inv.issueDate.startsWith(lastMonth))
    .reduce((s, inv) => s + calcTotal(inv.items), 0);
  const monthDiff = lastMonthTotal > 0 ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100) : 0;

  // Client ranking
  const clientTotals: Record<string, { name: string; total: number }> = {};
  invoices.forEach((inv) => {
    const key = inv.clientName || "（取引先名なし）";
    if (!clientTotals[key]) clientTotals[key] = { name: key, total: 0 };
    clientTotals[key].total += calcTotal(inv.items);
  });
  const clientRanking = Object.values(clientTotals).sort((a, b) => b.total - a.total).slice(0, 10);

  // Product/service breakdown
  const itemTotals: Record<string, { name: string; total: number; count: number }> = {};
  invoices.forEach((inv) => {
    inv.items.forEach((item) => {
      const key = item.name || "（品名なし）";
      if (!itemTotals[key]) itemTotals[key] = { name: key, total: 0, count: 0 };
      itemTotals[key].total += item.quantity * item.unitPrice;
      itemTotals[key].count += item.quantity;
    });
  });
  const itemRanking = Object.values(itemTotals).sort((a, b) => b.total - a.total).slice(0, 10);

  // Status breakdown
  const statusCounts = {
    draft: invoices.filter((i) => i.status === "draft").length,
    sent: invoices.filter((i) => i.status === "sent").length,
    paid: invoices.filter((i) => i.status === "paid").length,
  };
  const statusTotals = {
    draft: invoices.filter((i) => i.status === "draft").reduce((s, i) => s + calcTotal(i.items), 0),
    sent: invoices.filter((i) => i.status === "sent").reduce((s, i) => s + calcTotal(i.items), 0),
    paid: invoices.filter((i) => i.status === "paid").reduce((s, i) => s + calcTotal(i.items), 0),
  };

  // Overdue invoices
  const today = now.toISOString().split("T")[0];
  const overdueInvoices = invoices.filter(
    (inv) => inv.status !== "paid" && inv.dueDate < today
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
      <h2 className="text-lg font-bold text-gray-800">売上分析ダッシュボード</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border">
          <p className="text-xs text-gray-500">今月売上</p>
          <p className="text-lg font-bold text-gray-800">{formatCurrency(thisMonthTotal)}</p>
          {lastMonthTotal > 0 && (
            <p className={`text-xs mt-1 ${monthDiff >= 0 ? "text-green-600" : "text-red-600"}`}>
              先月比 {monthDiff >= 0 ? "+" : ""}{monthDiff}%
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <p className="text-xs text-gray-500">先月売上</p>
          <p className="text-lg font-bold text-gray-800">{formatCurrency(lastMonthTotal)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <p className="text-xs text-gray-500">入金済合計</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(statusTotals.paid)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <p className="text-xs text-gray-500">未入金合計</p>
          <p className="text-lg font-bold text-orange-600">
            {formatCurrency(statusTotals.draft + statusTotals.sent)}
          </p>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="bg-white rounded-xl border p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-4">月別売上推移（直近6ヶ月）</h3>
        <div className="flex items-end gap-2 h-40">
          {monthlyData.map((d, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
              <p className="text-xs text-gray-600 font-medium">
                {d.total > 0 ? formatCurrency(d.total) : ""}
              </p>
              <div className="w-full flex flex-col items-center" style={{ height: "100px" }}>
                <div className="w-full flex items-end h-full gap-0.5">
                  <div
                    className="flex-1 bg-blue-400 rounded-t"
                    style={{ height: `${Math.max((d.total / maxMonthly) * 100, 2)}%` }}
                    title={`合計: ${formatCurrency(d.total)}`}
                  />
                  <div
                    className="flex-1 bg-green-400 rounded-t"
                    style={{ height: `${Math.max((d.paid / maxMonthly) * 100, 2)}%` }}
                    title={`入金済: ${formatCurrency(d.paid)}`}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">{d.month}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-2 justify-center">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-400 rounded" />
            <span className="text-xs text-gray-500">合計</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-400 rounded" />
            <span className="text-xs text-gray-500">入金済</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client Ranking */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">取引先別売上ランキング</h3>
          {clientRanking.length === 0 ? (
            <p className="text-sm text-gray-500">データがありません</p>
          ) : (
            <div className="space-y-2">
              {clientRanking.map((c, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-5">{idx + 1}.</span>
                    <span className="text-gray-700 truncate max-w-[160px]">{c.name}</span>
                  </div>
                  <span className="font-bold text-gray-800">{formatCurrency(c.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Item Ranking */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">商品・サービス別売上</h3>
          {itemRanking.length === 0 ? (
            <p className="text-sm text-gray-500">データがありません</p>
          ) : (
            <div className="space-y-2">
              {itemRanking.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-5">{idx + 1}.</span>
                    <span className="text-gray-700 truncate max-w-[160px]">{it.name}</span>
                    <span className="text-xs text-gray-400">({it.count}件)</span>
                  </div>
                  <span className="font-bold text-gray-800">{formatCurrency(it.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-white rounded-xl border p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">ステータス別集計</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">下書き</p>
            <p className="text-lg font-bold text-gray-600">{statusCounts.draft}件</p>
            <p className="text-sm text-gray-500">{formatCurrency(statusTotals.draft)}</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600 mb-1">送付済</p>
            <p className="text-lg font-bold text-blue-700">{statusCounts.sent}件</p>
            <p className="text-sm text-blue-600">{formatCurrency(statusTotals.sent)}</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-green-600 mb-1">入金済</p>
            <p className="text-lg font-bold text-green-700">{statusCounts.paid}件</p>
            <p className="text-sm text-green-600">{formatCurrency(statusTotals.paid)}</p>
          </div>
        </div>
      </div>

      {/* Overdue Invoices */}
      <div className="bg-white rounded-xl border p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">
          未入金アラート
          {overdueInvoices.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
              {overdueInvoices.length}件
            </span>
          )}
        </h3>
        {overdueInvoices.length === 0 ? (
          <p className="text-sm text-gray-500">支払期限を過ぎた請求書はありません</p>
        ) : (
          <div className="space-y-2">
            {overdueInvoices.map((inv) => {
              const daysOverdue = Math.floor(
                (new Date(today).getTime() - new Date(inv.dueDate).getTime()) / 86400000
              );
              return (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg text-sm">
                  <div>
                    <p className="font-medium text-gray-800">{inv.clientName || "（取引先名なし）"}</p>
                    <p className="text-xs text-gray-500">
                      {inv.invoiceNumber} / 期限: {inv.dueDate}
                      <span className="text-red-600 ml-2">{daysOverdue}日超過</span>
                    </p>
                  </div>
                  <span className="font-bold text-red-700">{formatCurrency(calcTotal(inv.items))}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== SETTINGS VIEW =====
function SettingsView({
  settings,
  userId,
  onSaveSettings,
  onBack,
}: {
  settings: ClinicSettings;
  userId: string;
  onSaveSettings: (s: ClinicSettings) => void;
  onBack: () => void;
}) {
  const [localSettings, setLocalSettings] = useState<ClinicSettings>({ ...settings });
  const [saved, setSaved] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onSaveSettings(localSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const [imageError, setImageError] = useState("");

  const handleImageUpload = (field: "clinicLogo" | "clinicStamp", file: File) => {
    setImageError("");
    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      setImageError("JPGまたはPNG形式のみアップロードできます");
      return;
    }
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_SIZE) {
      setImageError("ファイルサイズは2MB以下にしてください");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setLocalSettings((prev) => ({ ...prev, [field]: e.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">設定</h2>
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          {saved ? "保存済み" : "保存"}
        </button>
      </div>

      {/* Company Info */}
      <div className="bg-white rounded-xl border p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">会社・院情報</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">会社名/院名</label>
            <input
              type="text"
              value={localSettings.clinicName}
              onChange={(e) => setLocalSettings((p) => ({ ...p, clinicName: e.target.value }))}
              placeholder="例: 大口神経整体院"
              className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500">郵便番号</label>
              <input
                type="text"
                value={localSettings.clinicZip}
                onChange={(e) => setLocalSettings((p) => ({ ...p, clinicZip: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500">住所</label>
              <input
                type="text"
                value={localSettings.clinicAddress}
                onChange={(e) => setLocalSettings((p) => ({ ...p, clinicAddress: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              />
            </div>
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
        {imageError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2 mb-3" role="alert">{imageError}</p>
        )}
        <p className="text-xs text-gray-400 mb-3">JPG/PNG形式、2MB以下</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-2">ロゴ画像</label>
            {localSettings.clinicLogo ? (
              <div className="relative inline-block">
                <img src={localSettings.clinicLogo} alt="Logo" className="w-24 h-24 object-contain border rounded-lg" />
                <button
                  onClick={() => setLocalSettings((p) => ({ ...p, clinicLogo: "" }))}
                  aria-label="ロゴ画像を削除"
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                >
                  x
                </button>
              </div>
            ) : (
              <button
                onClick={() => logoInputRef.current?.click()}
                aria-label="ロゴ画像をアップロード"
                className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-400 transition"
              >
                +
              </button>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png"
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
                  aria-label="印影画像を削除"
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                >
                  x
                </button>
              </div>
            ) : (
              <button
                onClick={() => stampInputRef.current?.click()}
                aria-label="印影画像をアップロード"
                className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-400 transition"
              >
                +
              </button>
            )}
            <input
              ref={stampInputRef}
              type="file"
              accept="image/jpeg,image/png"
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

      <button
        onClick={handleSave}
        className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition"
      >
        {saved ? "保存しました" : "設定を保存"}
      </button>
    </div>
  );
}

// ===== EC ORDERS VIEW =====
function EcOrdersView({
  ecOrders,
  invoices,
  settings: _settings,
  formatCurrency,
  onCreateInvoice,
}: {
  ecOrders: EcOrder[];
  invoices: Invoice[];
  settings: ClinicSettings;
  formatCurrency: (n: number) => string;
  onCreateInvoice: (order: EcOrder) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid">("all");

  const hasInvoice = (orderId: string) =>
    invoices.some((inv) => inv.notes?.includes(`EC注文: ${orderId}`));

  const filtered = ecOrders.filter((o) => {
    const matchSearch = !search || o.customerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.paymentStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusLabel = (s: string) => {
    switch (s) {
      case "paid": return "支払済";
      case "pending": return "未払い";
      case "failed": return "失敗";
      default: return s;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "paid": return "bg-green-100 text-green-700";
      case "pending": return "bg-yellow-100 text-yellow-700";
      case "failed": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const methodLabel = (m: string) => {
    switch (m) {
      case "stripe": return "カード決済";
      case "bank_transfer": return "銀行振込";
      default: return m;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-800">EC注文一覧</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="顧客名で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm w-full sm:w-48"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "pending" | "paid")}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="all">全てのステータス</option>
            <option value="pending">未払い</option>
            <option value="paid">支払済</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          EC注文がありません
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const alreadyHasInvoice = hasInvoice(order.id);
            return (
              <div key={order.id} className="bg-white rounded-xl border p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800">{order.customerName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(order.paymentStatus)}`}>
                        {statusLabel(order.paymentStatus)}
                      </span>
                      {alreadyHasInvoice && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                          請求書作成済
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 space-x-3">
                      <span>{new Date(order.createdAt).toLocaleDateString("ja-JP")}</span>
                      <span>{methodLabel(order.paymentMethod)}</span>
                      <span>{order.customerEmail}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-800">
                      {formatCurrency(order.totalAmount)}
                    </span>
                    <button
                      onClick={() => onCreateInvoice(order)}
                      disabled={alreadyHasInvoice}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        alreadyHasInvoice
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      請求書を作成
                    </button>
                  </div>
                </div>

                {/* Order items */}
                <div className="border-t pt-2">
                  <div className="text-xs text-gray-500 space-y-1">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{item.product_name} x {item.quantity}</span>
                        <span>{formatCurrency(item.unit_price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
