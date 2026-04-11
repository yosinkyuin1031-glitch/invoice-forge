export interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // 0.1 or 0.08 or 0
}

export interface Invoice {
  id: string;
  profileId?: string; // どの事業プロファイルで発行したか
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  // 発行元情報（プロファイルからコピーされたスナップショット）
  clinicName: string;
  clinicZip: string;
  clinicAddress: string;
  clinicPhone: string;
  clinicEmail: string;
  clinicLogo: string; // base64
  clinicStamp: string; // base64 印影
  // 宛先情報
  clientId?: string;
  clientType: "company" | "individual"; // 会社/個人
  clientName: string;
  clientZip: string;
  clientAddress: string;
  clientEmail: string;
  // 明細
  items: InvoiceItem[];
  // 備考
  notes: string;
  // メタ
  createdAt: string;
  updatedAt: string;
  status: "draft" | "sent" | "paid";
}

export interface Client {
  id: string;
  clientType: "company" | "individual";
  companyName: string; // 会社の場合は会社名/院名、個人の場合は氏名
  contactName: string; // 会社の場合の担当者名（個人なら空）
  zip: string;
  address: string;
  phone: string;
  email: string;
  memo: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  unitPrice: number;
  taxRate: number;
  category: "product" | "service" | "other";
  memo: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessProfile {
  id: string;
  profileName: string; // 事業名（表示用・選択用）
  clinicName: string;
  clinicZip: string;
  clinicAddress: string;
  clinicPhone: string;
  clinicEmail: string;
  clinicLogo: string;
  clinicStamp: string;
  nextInvoiceNumber: number;
  invoicePrefix: string;
  bankInfo: string;
  isDefault: boolean;
  sortOrder: number;
  taxMode: "standard" | "exempt"; // standard=課税, exempt=非課税（訪問鍼灸など）
  showReceipt: boolean; // 請求書と領収書を1枚にまとめて印刷
}

export const DEFAULT_PROFILE: Omit<BusinessProfile, "id"> = {
  profileName: "新しい事業",
  clinicName: "",
  clinicZip: "",
  clinicAddress: "",
  clinicPhone: "",
  clinicEmail: "",
  clinicLogo: "",
  clinicStamp: "",
  nextInvoiceNumber: 1,
  invoicePrefix: "INV-",
  bankInfo: "",
  isDefault: false,
  sortOrder: 0,
  taxMode: "standard",
  showReceipt: false,
};

// Legacy alias for backwards compatibility
export type ClinicSettings = BusinessProfile;
export const DEFAULT_SETTINGS = { ...DEFAULT_PROFILE, id: "" } as BusinessProfile;

// Legacy type kept for compatibility
export interface MenuTemplate {
  id: string;
  name: string;
  unitPrice: number;
  taxRate: number;
}

export const DEFAULT_TEMPLATES: MenuTemplate[] = [];
