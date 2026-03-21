export interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // 0.1 or 0.08
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  // 発行元（院）情報
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  clinicEmail: string;
  clinicLogo: string; // base64
  clinicStamp: string; // base64 印影
  // 宛先（患者）情報
  clientName: string;
  clientAddress: string;
  // 明細
  items: InvoiceItem[];
  // 備考
  notes: string;
  // メタ
  createdAt: string;
  updatedAt: string;
  status: "draft" | "sent" | "paid";
}

export interface MenuTemplate {
  id: string;
  name: string;
  unitPrice: number;
  taxRate: number;
}

export interface ClinicSettings {
  clinicName: string;
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
  clinicAddress: "",
  clinicPhone: "",
  clinicEmail: "",
  clinicLogo: "",
  clinicStamp: "",
  nextInvoiceNumber: 1,
  invoicePrefix: "INV-",
  bankInfo: "",
};

export const DEFAULT_TEMPLATES: MenuTemplate[] = [
  { id: "t1", name: "初診料", unitPrice: 3000, taxRate: 0.1 },
  { id: "t2", name: "再診料", unitPrice: 1500, taxRate: 0.1 },
  { id: "t3", name: "骨盤矯正", unitPrice: 5000, taxRate: 0.1 },
  { id: "t4", name: "全身調整", unitPrice: 6000, taxRate: 0.1 },
  { id: "t5", name: "鍼灸施術", unitPrice: 4000, taxRate: 0.1 },
  { id: "t6", name: "マッサージ（30分）", unitPrice: 3500, taxRate: 0.1 },
  { id: "t7", name: "マッサージ（60分）", unitPrice: 6000, taxRate: 0.1 },
  { id: "t8", name: "テーピング", unitPrice: 500, taxRate: 0.1 },
];
