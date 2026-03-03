/**
 * Zoho Books API v3 client (single class, flat methods).
 * See docs/DECISIONS.md §4.
 */

import { getConfig } from "../core/config.js";
import { zohoGet, zohoPost } from "../core/http.js";

const BOOKS_PREFIX = "/books/v3";

function booksPath(segment: string, params?: Record<string, string>): string {
  const config = getConfig();
  const base = `${BOOKS_PREFIX}${segment}`;
  const search = new URLSearchParams({ organization_id: config.orgId });
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") search.set(k, v);
    }
  }
  return `${base}?${search.toString()}`;
}

/** Zoho Books list response envelope (e.g. invoices, contacts). */
export interface BooksListResponse<T> {
  [key: string]: T[] | unknown;
}

export class ZohoBooksClient {
  /** List invoices. Optional filters: status, customer_id, page, per_page. */
  async listInvoices(params?: {
    status?: string;
    customer_id?: string;
    page?: number;
    per_page?: number;
  }): Promise<BooksListResponse<Record<string, unknown>>> {
    const q: Record<string, string> = {};
    if (params?.status) q.status = params.status;
    if (params?.customer_id) q.customer_id = params.customer_id;
    if (params?.page != null) q.page = String(params.page);
    if (params?.per_page != null) q.per_page = String(params.per_page);
    return zohoGet(booksPath("/invoices", q));
  }

  /** Get a single invoice by id. */
  async getInvoice(invoiceId: string): Promise<Record<string, unknown>> {
    const res = await zohoGet<{ invoice: Record<string, unknown> }>(
      booksPath(`/invoices/${invoiceId}`)
    );
    return (res as { invoice?: Record<string, unknown> }).invoice ?? res;
  }

  /** List contacts. Optional: type (customer/vendor), page, per_page. */
  async listContacts(params?: {
    type?: "customer" | "vendor";
    page?: number;
    per_page?: number;
  }): Promise<BooksListResponse<Record<string, unknown>>> {
    const q: Record<string, string> = {};
    if (params?.type) q.contact_type = params.type;
    if (params?.page != null) q.page = String(params.page);
    if (params?.per_page != null) q.per_page = String(params.per_page);
    return zohoGet(booksPath("/contacts", q));
  }

  /** Get a single contact by id. */
  async getContact(contactId: string): Promise<Record<string, unknown>> {
    const res = await zohoGet<{ contact: Record<string, unknown> }>(
      booksPath(`/contacts/${contactId}`)
    );
    return (res as { contact?: Record<string, unknown> }).contact ?? res;
  }

  /** List expenses. Optional: date_start, date_end, page, per_page. */
  async listExpenses(params?: {
    date_start?: string;
    date_end?: string;
    page?: number;
    per_page?: number;
  }): Promise<BooksListResponse<Record<string, unknown>>> {
    const q: Record<string, string> = {};
    if (params?.date_start) q.date_start = params.date_start;
    if (params?.date_end) q.date_end = params.date_end;
    if (params?.page != null) q.page = String(params.page);
    if (params?.per_page != null) q.per_page = String(params.per_page);
    return zohoGet(booksPath("/expenses", q));
  }

  /** Get a single expense by id. */
  async getExpense(expenseId: string): Promise<Record<string, unknown>> {
    const res = await zohoGet<{ expense: Record<string, unknown> }>(
      booksPath(`/expenses/${expenseId}`)
    );
    return (res as { expense?: Record<string, unknown> }).expense ?? res;
  }

  /** List bills. Optional filters: status, page, per_page. */
  async listBills(params?: {
    status?: string;
    page?: number;
    per_page?: number;
  }): Promise<BooksListResponse<Record<string, unknown>>> {
    const q: Record<string, string> = {};
    if (params?.status) q.status = params.status;
    if (params?.page != null) q.page = String(params.page);
    if (params?.per_page != null) q.per_page = String(params.per_page);
    return zohoGet(booksPath("/bills", q));
  }

  /** Get a single bill by id. */
  async getBill(billId: string): Promise<Record<string, unknown>> {
    const res = await zohoGet<{ bill: Record<string, unknown> }>(
      booksPath(`/bills/${billId}`)
    );
    return (res as { bill?: Record<string, unknown> }).bill ?? res;
  }

  /** List bank transactions. Optional filters: account_id, page, per_page. */
  async listBankTransactions(params?: {
    account_id?: string;
    page?: number;
    per_page?: number;
  }): Promise<BooksListResponse<Record<string, unknown>>> {
    const q: Record<string, string> = {};
    if (params?.account_id) q.account_id = params.account_id;
    if (params?.page != null) q.page = String(params.page);
    if (params?.per_page != null) q.per_page = String(params.per_page);
    return zohoGet(booksPath("/banktransactions", q));
  }

  /** List bank accounts from chart of accounts. */
  async listBankAccounts(params?: {
    page?: number;
    per_page?: number;
  }): Promise<BooksListResponse<Record<string, unknown>>> {
    const q: Record<string, string> = { account_type: "BANK" };
    if (params?.page != null) q.page = String(params.page);
    if (params?.per_page != null) q.per_page = String(params.per_page);
    return zohoGet(booksPath("/chartofaccounts", q));
  }

  /** List items (products/services). Optional: page, per_page. */
  async listItems(params?: {
    page?: number;
    per_page?: number;
  }): Promise<BooksListResponse<Record<string, unknown>>> {
    const q: Record<string, string> = {};
    if (params?.page != null) q.page = String(params.page);
    if (params?.per_page != null) q.per_page = String(params.per_page);
    return zohoGet(booksPath("/items", q));
  }

  /** Get a single item by id. */
  async getItem(itemId: string): Promise<Record<string, unknown>> {
    const res = await zohoGet<{ item: Record<string, unknown> }>(
      booksPath(`/items/${itemId}`)
    );
    return (res as { item?: Record<string, unknown> }).item ?? res;
  }

  /** Get a report. report_type: profit_and_loss | balance_sheet | cash_flow | ar_aging | ap_aging. Optional date range. */
  async getReport(
    reportType: string,
    params?: { date_start?: string; date_end?: string }
  ): Promise<Record<string, unknown>> {
    const q: Record<string, string> = {};
    if (params?.date_start) q.date_start = params.date_start;
    if (params?.date_end) q.date_end = params.date_end;
    return zohoGet(booksPath(`/reports/${reportType}`, q));
  }

  /** Create a contact (customer or vendor). */
  async createContact(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await zohoPost<{ contact: Record<string, unknown> }>(
      booksPath("/contacts"),
      body
    );
    return (res as { contact?: Record<string, unknown> }).contact ?? res;
  }

  /** Create an invoice. */
  async createInvoice(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await zohoPost<{ invoice: Record<string, unknown> }>(
      booksPath("/invoices"),
      body
    );
    return (res as { invoice?: Record<string, unknown> }).invoice ?? res;
  }
}
