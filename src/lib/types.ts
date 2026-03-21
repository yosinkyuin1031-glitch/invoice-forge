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
  clinicName: "大口神経整体院",
  clinicAddress: "大阪市住吉区長居",
  clinicPhone: "070-8498-2968",
  clinicEmail: "",
  clinicLogo: "",
  clinicStamp: "",
  nextInvoiceNumber: 1,
  invoicePrefix: "INV-",
  bankInfo: "",
};

export const DEFAULT_TEMPLATES: MenuTemplate[] = [
  { id: "t1", name: "アプリ作成", unitPrice: 0, taxRate: 0.1 },
];
