export type DocType =
  | "extras_bancar"
  | "factura_emisa"
  | "factura_primita"
  | "bon"
  | "fisa_clinica"
  | "programator"
  | "balanta"
  | "bilant"
  | "alt";

export type TransactionType = "income" | "expense";
export type PaymentMethod = "cash" | "card" | "transfer" | "other";
export type InvoiceType = "issued" | "received";
export type InvoiceStatus = "unpaid" | "partial" | "paid" | "cancelled" | "overdue";
export type BillStatus = "pending" | "partial" | "paid" | "disputed";

export interface Clinic {
  id: string;
  user_id: string;
  name: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  payment_terms?: string;
  rate_type?: string;
  rate_value?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  file_path: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  doc_type: DocType;
  doc_date?: string;
  clinic_id?: string;
  processed: boolean;
  extracted_data?: Record<string, unknown>;
  extraction_error?: string;
  notes?: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  document_id?: string;
  date: string;
  description?: string;
  amount: number;
  type: TransactionType;
  payment_method?: PaymentMethod;
  category?: string;
  clinic_id?: string;
  reference?: string;
  confirmed: boolean;
  created_at: string;
  updated_at: string;
  // joined
  clinics?: Clinic;
  documents?: Document;
}

export interface DailyReport {
  id: string;
  user_id: string;
  document_id?: string;
  date: string;
  total_cash: number;
  total_card: number;
  total_transfer: number;
  total_income: number;
  procedures_count: number;
  notes?: string;
  created_at: string;
}

export interface ClinicBill {
  id: string;
  user_id: string;
  clinic_id: string;
  document_id?: string;
  period_start?: string;
  period_end?: string;
  amount_owed: number;
  amount_paid: number;
  amount_remaining: number;
  due_date?: string;
  status: BillStatus;
  payment_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // joined
  clinics?: Clinic;
}

export interface Invoice {
  id: string;
  user_id: string;
  document_id?: string;
  invoice_type: InvoiceType;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  counterpart_name?: string;
  counterpart_cui?: string;
  subtotal?: number;
  tax_rate?: number;
  tax_amount?: number;
  total_amount?: number;
  currency: string;
  status: InvoiceStatus;
  amount_paid: number;
  payment_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // joined
  documents?: Document;
}

// View types
export interface DailyCashflow {
  user_id: string;
  date: string;
  income_cash: number;
  income_card: number;
  income_transfer: number;
  total_income: number;
  total_expense: number;
  net: number;
}

export interface MonthlyPL {
  user_id: string;
  month: string;
  month_label: string;
  total_income: number;
  total_expense: number;
  profit: number;
  income_count: number;
  expense_count: number;
}

export interface ClinicDebt {
  user_id: string;
  clinic_id: string;
  clinic_name: string;
  bill_count: number;
  total_owed: number;
  total_paid: number;
  total_remaining: number;
  pending_bills: number;
  next_due_date?: string;
}
