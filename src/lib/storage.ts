import { supabase } from "./supabase";
import { Invoice, InvoiceItem, BusinessProfile, ClinicSettings, Client, Product, DEFAULT_SETTINGS, DEFAULT_PROFILE } from "./types";

// ===== AUTH =====
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function resetPassword(email: string) {
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export function onAuthChange(callback: (user: { id: string; email?: string } | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}

// ===== INVOICES =====
export async function getInvoices(): Promise<Invoice[]> {
  const { data: invoices, error } = await supabase
    .from("inv_invoices")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!invoices || invoices.length === 0) return [];

  const invoiceIds = invoices.map((inv) => inv.id);
  const { data: items, error: itemsError } = await supabase
    .from("inv_invoice_items")
    .select("*")
    .in("invoice_id", invoiceIds)
    .order("sort_order", { ascending: true });
  if (itemsError) throw itemsError;

  return invoices.map((inv) => ({
    id: inv.id,
    profileId: inv.profile_id || undefined,
    invoiceNumber: inv.invoice_number,
    issueDate: inv.issue_date,
    dueDate: inv.due_date,
    clinicName: inv.clinic_name,
    clinicZip: inv.clinic_zip,
    clinicAddress: inv.clinic_address,
    clinicPhone: inv.clinic_phone,
    clinicEmail: inv.clinic_email,
    clinicLogo: inv.clinic_logo,
    clinicStamp: inv.clinic_stamp,
    clientId: inv.client_id || undefined,
    clientName: inv.client_name,
    clientZip: inv.client_zip,
    clientAddress: inv.client_address,
    clientEmail: inv.client_email,
    items: (items || [])
      .filter((it) => it.invoice_id === inv.id)
      .map((it) => ({
        id: it.id,
        name: it.name,
        quantity: it.quantity,
        unitPrice: it.unit_price,
        taxRate: Number(it.tax_rate),
      })),
    notes: inv.notes,
    createdAt: inv.created_at,
    updatedAt: inv.updated_at,
    status: inv.status as Invoice["status"],
  }));
}

export async function saveInvoice(invoice: Invoice, userId: string): Promise<Invoice> {
  const now = new Date().toISOString();
  const isNew = !invoice.id || invoice.id.startsWith("inv-");

  if (isNew) {
    // Insert invoice
    const { data: inv, error } = await supabase
      .from("inv_invoices")
      .insert({
        user_id: userId,
        profile_id: invoice.profileId || null,
        invoice_number: invoice.invoiceNumber,
        issue_date: invoice.issueDate,
        due_date: invoice.dueDate,
        status: invoice.status,
        client_id: invoice.clientId || null,
        client_name: invoice.clientName,
        client_zip: invoice.clientZip,
        client_address: invoice.clientAddress,
        client_email: invoice.clientEmail,
        clinic_name: invoice.clinicName,
        clinic_zip: invoice.clinicZip,
        clinic_address: invoice.clinicAddress,
        clinic_phone: invoice.clinicPhone,
        clinic_email: invoice.clinicEmail,
        clinic_logo: invoice.clinicLogo,
        clinic_stamp: invoice.clinicStamp,
        notes: invoice.notes,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();
    if (error) throw error;

    // Insert items
    if (invoice.items.length > 0) {
      const { error: itemsError } = await supabase.from("inv_invoice_items").insert(
        invoice.items.map((item, idx) => ({
          invoice_id: inv.id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          tax_rate: item.taxRate,
          sort_order: idx,
        }))
      );
      if (itemsError) throw itemsError;
    }

    return { ...invoice, id: inv.id };
  } else {
    // Update invoice
    const { error } = await supabase
      .from("inv_invoices")
      .update({
        profile_id: invoice.profileId || null,
        invoice_number: invoice.invoiceNumber,
        issue_date: invoice.issueDate,
        due_date: invoice.dueDate,
        status: invoice.status,
        client_id: invoice.clientId || null,
        client_name: invoice.clientName,
        client_zip: invoice.clientZip,
        client_address: invoice.clientAddress,
        client_email: invoice.clientEmail,
        clinic_name: invoice.clinicName,
        clinic_zip: invoice.clinicZip,
        clinic_address: invoice.clinicAddress,
        clinic_phone: invoice.clinicPhone,
        clinic_email: invoice.clinicEmail,
        clinic_logo: invoice.clinicLogo,
        clinic_stamp: invoice.clinicStamp,
        notes: invoice.notes,
        updated_at: now,
      })
      .eq("id", invoice.id);
    if (error) throw error;

    // Delete old items and re-insert
    await supabase.from("inv_invoice_items").delete().eq("invoice_id", invoice.id);
    if (invoice.items.length > 0) {
      const { error: itemsError } = await supabase.from("inv_invoice_items").insert(
        invoice.items.map((item, idx) => ({
          invoice_id: invoice.id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          tax_rate: item.taxRate,
          sort_order: idx,
        }))
      );
      if (itemsError) throw itemsError;
    }

    return invoice;
  }
}

export async function deleteInvoice(id: string) {
  const { error } = await supabase.from("inv_invoices").delete().eq("id", id);
  if (error) throw error;
}

// ===== BUSINESS PROFILES (複数事業対応) =====
function mapProfile(d: Record<string, unknown>): BusinessProfile {
  return {
    id: d.id as string,
    profileName: (d.profile_name as string) || "",
    clinicName: (d.clinic_name as string) || "",
    clinicZip: (d.clinic_zip as string) || "",
    clinicAddress: (d.clinic_address as string) || "",
    clinicPhone: (d.clinic_phone as string) || "",
    clinicEmail: (d.clinic_email as string) || "",
    clinicLogo: (d.clinic_logo as string) || "",
    clinicStamp: (d.clinic_stamp as string) || "",
    nextInvoiceNumber: (d.next_invoice_number as number) || 1,
    invoicePrefix: (d.invoice_prefix as string) || "INV-",
    bankInfo: (d.bank_info as string) || "",
    isDefault: (d.is_default as boolean) || false,
    sortOrder: (d.sort_order as number) || 0,
    taxMode: ((d.tax_mode as string) === "exempt" ? "exempt" : "standard"),
    showReceipt: (d.show_receipt as boolean) || false,
  };
}

export async function getProfiles(): Promise<BusinessProfile[]> {
  const { data, error } = await supabase
    .from("inv_settings")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data || []).map(mapProfile);
}

export async function saveProfile(profile: BusinessProfile, userId: string): Promise<BusinessProfile> {
  const payload = {
    user_id: userId,
    profile_name: profile.profileName || "デフォルト",
    clinic_name: profile.clinicName,
    clinic_zip: profile.clinicZip,
    clinic_address: profile.clinicAddress,
    clinic_phone: profile.clinicPhone,
    clinic_email: profile.clinicEmail,
    clinic_logo: profile.clinicLogo,
    clinic_stamp: profile.clinicStamp,
    next_invoice_number: profile.nextInvoiceNumber,
    invoice_prefix: profile.invoicePrefix,
    bank_info: profile.bankInfo,
    is_default: profile.isDefault,
    sort_order: profile.sortOrder,
    tax_mode: profile.taxMode || "standard",
    show_receipt: !!profile.showReceipt,
    updated_at: new Date().toISOString(),
  };
  if (profile.id) {
    const { data, error } = await supabase.from("inv_settings").update(payload).eq("id", profile.id).select().single();
    if (error) throw error;
    return mapProfile(data);
  } else {
    const { data, error } = await supabase.from("inv_settings").insert(payload).select().single();
    if (error) throw error;
    return mapProfile(data);
  }
}

export async function deleteProfile(id: string) {
  const { error } = await supabase.from("inv_settings").delete().eq("id", id);
  if (error) throw error;
}

export async function setDefaultProfile(id: string, userId: string) {
  // まず全部false
  await supabase.from("inv_settings").update({ is_default: false }).eq("user_id", userId);
  // 対象だけtrue
  const { error } = await supabase.from("inv_settings").update({ is_default: true }).eq("id", id);
  if (error) throw error;
}

// ===== SETTINGS (Legacy backwards-compatible wrappers) =====
export async function getSettings(_userId: string): Promise<ClinicSettings> {
  const profiles = await getProfiles();
  const def = profiles.find((p) => p.isDefault) || profiles[0];
  return def || ({ ...DEFAULT_SETTINGS } as ClinicSettings);
}

export async function saveSettings(settings: ClinicSettings, userId: string) {
  await saveProfile(settings as BusinessProfile, userId);
}

export async function generateInvoiceNumber(profileId: string): Promise<string> {
  const { data, error } = await supabase.from("inv_settings").select("*").eq("id", profileId).single();
  if (error || !data) throw error || new Error("profile not found");
  const num = data.next_invoice_number as number;
  const padded = String(num).padStart(4, "0");
  const prefix = (data.invoice_prefix as string) || "INV-";
  await supabase.from("inv_settings").update({ next_invoice_number: num + 1, updated_at: new Date().toISOString() }).eq("id", profileId);
  return `${prefix}${padded}`;
}

// ===== CLIENTS =====
export async function getClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from("inv_clients")
    .select("*")
    .order("company_name", { ascending: true });
  if (error) throw error;
  return (data || []).map((c) => ({
    id: c.id,
    companyName: c.company_name,
    contactName: c.contact_name,
    zip: c.zip,
    address: c.address,
    phone: c.phone,
    email: c.email,
    memo: c.memo,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));
}

export async function saveClient(client: Partial<Client> & { companyName: string }, userId: string): Promise<Client> {
  const now = new Date().toISOString();
  if (client.id) {
    const { data, error } = await supabase
      .from("inv_clients")
      .update({
        company_name: client.companyName,
        contact_name: client.contactName || "",
        zip: client.zip || "",
        address: client.address || "",
        phone: client.phone || "",
        email: client.email || "",
        memo: client.memo || "",
        updated_at: now,
      })
      .eq("id", client.id)
      .select()
      .single();
    if (error) throw error;
    return mapClient(data);
  } else {
    const { data, error } = await supabase
      .from("inv_clients")
      .insert({
        user_id: userId,
        company_name: client.companyName,
        contact_name: client.contactName || "",
        zip: client.zip || "",
        address: client.address || "",
        phone: client.phone || "",
        email: client.email || "",
        memo: client.memo || "",
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();
    if (error) throw error;
    return mapClient(data);
  }
}

export async function deleteClient(id: string) {
  const { error } = await supabase.from("inv_clients").delete().eq("id", id);
  if (error) throw error;
}

function mapClient(c: Record<string, unknown>): Client {
  return {
    id: c.id as string,
    companyName: c.company_name as string,
    contactName: c.contact_name as string,
    zip: c.zip as string,
    address: c.address as string,
    phone: c.phone as string,
    email: c.email as string,
    memo: c.memo as string,
    createdAt: c.created_at as string,
    updatedAt: c.updated_at as string,
  };
}

// ===== PRODUCTS =====
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("inv_products")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data || []).map((p) => ({
    id: p.id,
    name: p.name,
    unitPrice: p.unit_price,
    taxRate: Number(p.tax_rate),
    category: p.category as Product["category"],
    memo: p.memo,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));
}

export async function saveProduct(product: Partial<Product> & { name: string }, userId: string): Promise<Product> {
  const now = new Date().toISOString();
  if (product.id) {
    const { data, error } = await supabase
      .from("inv_products")
      .update({
        name: product.name,
        unit_price: product.unitPrice || 0,
        tax_rate: product.taxRate ?? 0.1,
        category: product.category || "service",
        memo: product.memo || "",
        updated_at: now,
      })
      .eq("id", product.id)
      .select()
      .single();
    if (error) throw error;
    return mapProduct(data);
  } else {
    const { data, error } = await supabase
      .from("inv_products")
      .insert({
        user_id: userId,
        name: product.name,
        unit_price: product.unitPrice || 0,
        tax_rate: product.taxRate ?? 0.1,
        category: product.category || "service",
        memo: product.memo || "",
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();
    if (error) throw error;
    return mapProduct(data);
  }
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("inv_products").delete().eq("id", id);
  if (error) throw error;
}

function mapProduct(p: Record<string, unknown>): Product {
  return {
    id: p.id as string,
    name: p.name as string,
    unitPrice: p.unit_price as number,
    taxRate: Number(p.tax_rate),
    category: p.category as Product["category"],
    memo: p.memo as string,
    createdAt: p.created_at as string,
    updatedAt: p.updated_at as string,
  };
}

// ===== MENU ITEMS (from メニュー提案管理) =====
export interface MenuMenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  duration?: number;
}

export async function getMenuItems(): Promise<MenuMenuItem[]> {
  const { data, error } = await supabase
    .from("mp_menu_items")
    .select("id, name, category, price, unit, duration")
    .order("sort_order", { ascending: true });
  if (error) return [];
  return (data || []).map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    price: m.price,
    unit: m.unit || '回',
    duration: m.duration || undefined,
  }));
}

// ===== EC ORDERS =====
export interface EcOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  paymentMethod: string;
  paymentStatus: string;
  totalAmount: number;
  items: { product_id: string; product_name: string; quantity: number; unit_price: number }[];
  createdAt: string;
}

export async function getEcOrders(): Promise<EcOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((o) => ({
    id: o.id,
    customerName: o.customer_name,
    customerEmail: o.customer_email,
    customerPhone: o.customer_phone,
    shippingAddress: o.shipping_address,
    paymentMethod: o.payment_method,
    paymentStatus: o.payment_status,
    totalAmount: o.total_amount,
    items: typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []),
    createdAt: o.created_at,
  }));
}
