import { Invoice, ClinicSettings, MenuTemplate, DEFAULT_SETTINGS, DEFAULT_TEMPLATES } from "./types";

const KEYS = {
  invoices: "invoiceforge_invoices",
  settings: "invoiceforge_settings",
  templates: "invoiceforge_templates",
};

// Invoices
export function getInvoices(): Invoice[] {
  try {
    const data = localStorage.getItem(KEYS.invoices);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveInvoices(invoices: Invoice[]) {
  localStorage.setItem(KEYS.invoices, JSON.stringify(invoices));
}

export function getInvoice(id: string): Invoice | undefined {
  return getInvoices().find((inv) => inv.id === id);
}

export function saveInvoice(invoice: Invoice) {
  const invoices = getInvoices();
  const idx = invoices.findIndex((inv) => inv.id === invoice.id);
  if (idx >= 0) {
    invoices[idx] = invoice;
  } else {
    invoices.unshift(invoice);
  }
  saveInvoices(invoices);
}

export function deleteInvoice(id: string) {
  saveInvoices(getInvoices().filter((inv) => inv.id !== id));
}

// Settings
export function getSettings(): ClinicSettings {
  try {
    const data = localStorage.getItem(KEYS.settings);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: ClinicSettings) {
  localStorage.setItem(KEYS.settings, JSON.stringify(settings));
}

// Templates
export function getTemplates(): MenuTemplate[] {
  try {
    const data = localStorage.getItem(KEYS.templates);
    return data ? JSON.parse(data) : [...DEFAULT_TEMPLATES];
  } catch {
    return [...DEFAULT_TEMPLATES];
  }
}

export function saveTemplates(templates: MenuTemplate[]) {
  localStorage.setItem(KEYS.templates, JSON.stringify(templates));
}

// Invoice number generation
export function generateInvoiceNumber(): string {
  const settings = getSettings();
  const num = settings.nextInvoiceNumber;
  const padded = String(num).padStart(4, "0");
  settings.nextInvoiceNumber = num + 1;
  saveSettings(settings);
  return `${settings.invoicePrefix}${padded}`;
}
