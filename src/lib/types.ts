export interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // 0.1 or 0.08 or 0
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  // 発行元情報
  clinicName: string;
  clinicZip: string;
  clinicAddress: string;
  clinicPhone: string;
  clinicEmail: string;
  clinicLogo: string; // base64
  clinicStamp: string; // base64 印影
  // 宛先情報
  clientId?: string;
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
  companyName: string;
  contactName: string;
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

export interface ClinicSettings {
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
}

export const DEFAULT_SETTINGS: ClinicSettings = {
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
};

// Legacy type kept for compatibility
export interface MenuTemplate {
  id: string;
  name: string;
  unitPrice: number;
  taxRate: number;
}

export const DEFAULT_TEMPLATES: MenuTemplate[] = [];
